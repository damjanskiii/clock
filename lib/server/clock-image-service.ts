import {
  DEFAULT_OPENAI_IMAGE_MODEL,
  DEFAULT_OPENAI_IMAGE_QUALITY,
  DEFAULT_OPENAI_IMAGE_SIZE,
} from "@/lib/clock-config";
import { buildClockPrompt } from "@/lib/clock-prompt";
import { getOpenAIClient } from "@/lib/server/openai";

type CachedMinuteImage = {
  buffer: Buffer;
  displayTime: string;
  generatedAt: string;
  mimeType: string;
  minuteKey: string;
};

const resolvedCache = new Map<string, CachedMinuteImage>();
const pendingCache = new Map<string, Promise<CachedMinuteImage>>();

function getDisplayTimeForMinute(minuteKey: string) {
  return minuteKey.slice(11, 16);
}

function trimCache() {
  const keys = [...resolvedCache.keys()].sort();

  while (keys.length > 3) {
    const oldest = keys.shift();
    if (oldest) {
      resolvedCache.delete(oldest);
    }
  }
}

async function generateMinuteImage(minuteKey: string): Promise<CachedMinuteImage> {
  const displayTime = getDisplayTimeForMinute(minuteKey);
  const prompt = buildClockPrompt(displayTime, "square");
  const openai = getOpenAIClient();
  const response = await openai.images.generate({
    model: DEFAULT_OPENAI_IMAGE_MODEL,
    prompt,
    quality: DEFAULT_OPENAI_IMAGE_QUALITY,
    size: DEFAULT_OPENAI_IMAGE_SIZE,
  });
  const firstImage = response.data?.[0];

  if (!firstImage?.b64_json) {
    throw new Error("The OpenAI image response did not include image data.");
  }

  const buffer = Buffer.from(firstImage.b64_json, "base64");

  return {
    buffer,
    displayTime,
    generatedAt: new Date().toISOString(),
    mimeType: "image/png",
    minuteKey,
  };
}

export async function getMinuteImage(minuteKey: string) {
  const cached = resolvedCache.get(minuteKey);
  if (cached) {
    return cached;
  }

  const pending = pendingCache.get(minuteKey);
  if (pending) {
    return pending;
  }

  const task = generateMinuteImage(minuteKey)
    .then((image) => {
      resolvedCache.set(minuteKey, image);
      pendingCache.delete(minuteKey);
      trimCache();
      return image;
    })
    .catch((error) => {
      pendingCache.delete(minuteKey);
      throw error;
    });

  pendingCache.set(minuteKey, task);

  return task;
}

// TODO(v2): Accept viewport-derived output sizes and format selection here.
// TODO(v2): Return richer generation metadata for loading overlays and fullscreen mode.
