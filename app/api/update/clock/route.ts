import { NextRequest, NextResponse } from "next/server";
import { CLOCK_DAILY_LIMIT_MESSAGE } from "@/lib/clock-config";
import { isValidDisplayTime, isValidRequestMinuteKey, isRequestableRequestMinuteKey } from "@/lib/clock-time";
import { getViewportClockSettings, isValidViewportDimension } from "@/lib/viewport-clock";
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
  const viewportWidth = request.nextUrl.searchParams.get("viewportWidth");
  const viewportHeight = request.nextUrl.searchParams.get("viewportHeight");

  if (!displayTime || !requestMinuteKey || !viewportWidth || !viewportHeight) {
    return NextResponse.json(
      { error: "Missing update clock request parameters." },
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

  if (!isValidViewportDimension(viewportWidth) || !isValidViewportDimension(viewportHeight)) {
    return NextResponse.json(
      { error: "Invalid viewport dimensions." },
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

  const viewport = getViewportClockSettings(Number(viewportWidth), Number(viewportHeight));

  try {
    const image = await getMinuteImage({
      cacheNamespace: `update|${viewport.cacheKey}`,
      displayTime,
      imageSize: viewport.imageSize,
      promptFormat: viewport.promptFormat,
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
        "X-Clock-Generated-At": image.generatedAt,
        "X-Clock-Minute": image.requestMinuteKey,
        "X-Clock-Model": image.model,
        "X-Clock-Prompt-Format": image.promptFormat,
        "X-Clock-Size": image.imageSize,
        "X-Clock-Time": image.displayTime,
        "X-Clock-Viewport": `${viewport.width}x${viewport.height}`,
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

    console.error("Update clock image generation failed", {
      error: error instanceof Error ? error.message : error,
      displayTime,
      requestMinuteKey,
      viewportHeight,
      viewportWidth,
    });

    return NextResponse.json(
      {
        error: "Unable to generate the current update clock image.",
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
