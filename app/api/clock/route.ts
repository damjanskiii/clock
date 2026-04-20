import { NextRequest, NextResponse } from "next/server";
import { CLOCK_DAILY_LIMIT_MESSAGE } from "@/lib/clock-config";
import type { ClockRequestFormat } from "@/lib/clock-time";
import { isRequestableRequestMinuteKey, isValidDisplayTime, isValidRequestMinuteKey } from "@/lib/clock-time";
import { DailyClockBudgetExceededError } from "@/lib/server/daily-image-budget";
import { getMinuteImage } from "@/lib/server/clock-image-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;
export const preferredRegion = "home";

export async function GET(request: NextRequest) {
  const displayTime = request.nextUrl.searchParams.get("time");
  const requestMinuteKey = request.nextUrl.searchParams.get("requestMinute");
  const format = (request.nextUrl.searchParams.get("format") ?? "square") as ClockRequestFormat;

  if (!displayTime || !requestMinuteKey) {
    return NextResponse.json(
      { error: "Missing clock request parameters." },
      { status: 400 },
    );
  }

  if (!isValidDisplayTime(displayTime)) {
    return NextResponse.json(
      { error: "Invalid time format. Expected HH:MM." },
      { status: 400 },
    );
  }

  if (!isValidRequestMinuteKey(requestMinuteKey)) {
    return NextResponse.json(
      { error: "Invalid request minute format. Expected YYYY-MM-DDTHH:mmZ." },
      { status: 400 },
    );
  }

  if (format !== "square") {
    return NextResponse.json(
      { error: "Unsupported clock format." },
      { status: 400 },
    );
  }

  if (!isRequestableRequestMinuteKey(requestMinuteKey)) {
    return NextResponse.json(
      { error: "Only the current minute and the active visitor prefetch window are available." },
      {
        status: 400,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  }

  try {
    const image = await getMinuteImage({
      displayTime,
      imageSize: format === "square" ? "1024x1024" : undefined,
      promptFormat: format,
      requestMinuteKey,
    });
    const body = new Uint8Array(image.buffer.byteLength);
    body.set(image.buffer);

    return new Response(body.buffer, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "Content-Length": String(image.buffer.byteLength),
        "Content-Type": image.mimeType,
        "X-Clock-Minute": image.requestMinuteKey,
        "X-Clock-Model": image.model,
        "X-Clock-Time": image.displayTime,
        "X-Clock-Generated-At": image.generatedAt,
        "X-Clock-Prompt-Format": image.promptFormat,
        "X-Clock-Size": image.imageSize,
      },
    });
  } catch (error) {
    if (error instanceof DailyClockBudgetExceededError) {
      return NextResponse.json(
        {
          error: CLOCK_DAILY_LIMIT_MESSAGE,
        },
        {
          status: 429,
          headers: {
            "Cache-Control": "no-store, max-age=0",
          },
        },
      );
    }

    console.error("Clock image generation failed", {
      error: error instanceof Error ? error.message : error,
      displayTime,
      requestMinuteKey,
    });

    return NextResponse.json(
      {
        error: "Unable to generate the current clock image.",
      },
      {
        status: 502,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  }
}
