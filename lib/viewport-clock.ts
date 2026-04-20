import type { OpenAIImageSize } from "@/lib/clock-config";

const VIEWPORT_DIMENSION_MIN = 240;
const VIEWPORT_DIMENSION_MAX = 4096;
const SQUARE_RATIO_TOLERANCE = 0.12;

export type ViewportClockLayout = "landscape" | "portrait" | "square";

export type ViewportClockSettings = {
  cacheKey: string;
  height: number;
  imageSize: OpenAIImageSize;
  layout: ViewportClockLayout;
  promptFormat: string;
  width: number;
};

function clampViewportDimension(value: number) {
  return Math.min(
    VIEWPORT_DIMENSION_MAX,
    Math.max(VIEWPORT_DIMENSION_MIN, Math.round(value)),
  );
}

export function isValidViewportDimension(value: string | null) {
  if (!value) {
    return false;
  }

  const numericValue = Number(value);

  return Number.isInteger(numericValue)
    && numericValue >= VIEWPORT_DIMENSION_MIN
    && numericValue <= VIEWPORT_DIMENSION_MAX;
}

export function getViewportClockSettings(rawWidth: number, rawHeight: number): ViewportClockSettings {
  const width = clampViewportDimension(rawWidth);
  const height = clampViewportDimension(rawHeight);
  const ratio = width / height;

  let layout: ViewportClockLayout = "square";
  let imageSize: OpenAIImageSize = "1024x1024";

  if (ratio > 1 + SQUARE_RATIO_TOLERANCE) {
    layout = "landscape";
    imageSize = "1536x1024";
  } else if (ratio < 1 - SQUARE_RATIO_TOLERANCE) {
    layout = "portrait";
    imageSize = "1024x1536";
  }

  return {
    cacheKey: `${width}x${height}|${imageSize}`,
    height,
    imageSize,
    layout,
    promptFormat: `${width}x${height} ${layout} viewport`,
    width,
  };
}
