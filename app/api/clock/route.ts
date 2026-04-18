import { NextRequest, NextResponse } from "next/server";
import { getClockSnapshot, isRequestableMinuteKey, isValidMinuteKey } from "@/lib/clock-time";
import { getMinuteImage } from "@/lib/server/clock-image-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const requestedMinute = request.nextUrl.searchParams.get("minute");
  const minuteKey = requestedMinute ?? getClockSnapshot().minuteKey;

  if (!isValidMinuteKey(minuteKey)) {
    return NextResponse.json(
      { error: "Invalid minute format. Expected YYYY-MM-DDTHH:mm." },
      { status: 400 },
    );
  }

  if (!isRequestableMinuteKey(minuteKey)) {
    return NextResponse.json(
      { error: "Only the current New York minute and its immediate rollover window are available." },
      {
        status: 400,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  }

  try {
    const image = await getMinuteImage(minuteKey);
    const body = new Uint8Array(image.buffer.byteLength);
    body.set(image.buffer);

    return new Response(body.buffer, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "Content-Length": String(image.buffer.byteLength),
        "Content-Type": image.mimeType,
        "X-Clock-Minute": image.minuteKey,
        "X-Clock-Time": image.displayTime,
        "X-Clock-Generated-At": image.generatedAt,
      },
    });
  } catch (error) {
    console.error("Clock image generation failed", {
      error: error instanceof Error ? error.message : error,
      minuteKey,
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
