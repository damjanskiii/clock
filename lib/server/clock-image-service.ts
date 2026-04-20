import {
  DEFAULT_OPENAI_IMAGE_MODEL,
  DEFAULT_OPENAI_IMAGE_QUALITY,
  DEFAULT_OPENAI_IMAGE_SIZE,
  type OpenAIImageSize,
} from "@/lib/clock-config";
import {
  DailyClockBudgetExceededError,
  releaseDailyImageBudget,
  reserveDailyImageBudget,
} from "@/lib/server/daily-image-budget";
import { buildClockPrompt } from "@/lib/clock-prompt";
import { getOpenAIClient } from "@/lib/server/openai";

type CachedMinuteImage = {
  buffer: Buffer;
  displayTime: string;
  generatedAt: string;
  imageSize: OpenAIImageSize;
  mimeType: string;
  model: string;
  promptFormat: string;
  requestMinuteKey: string;
};

const resolvedCache = new Map<string, CachedMinuteImage>();
const pendingCache = new Map<string, Promise<CachedMinuteImage>>();

type MinuteImageRequest = {
  cacheNamespace?: string;
  displayTime: string;
  imageSize?: OpenAIImageSize;
  promptFormat: string;
  requestMinuteKey: string;
};

function getCacheKey({
  cacheNamespace,
  displayTime,
  imageSize = DEFAULT_OPENAI_IMAGE_SIZE,
  promptFormat,
  requestMinuteKey,
}: MinuteImageRequest) {
  return [
    cacheNamespace ?? "default",
    requestMinuteKey,
    displayTime,
    promptFormat,
    imageSize,
  ].join("|");
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

async function generateMinuteImage({
  displayTime,
  imageSize = DEFAULT_OPENAI_IMAGE_SIZE,
  promptFormat,
  requestMinuteKey,
}: MinuteImageRequest): Promise<CachedMinuteImage> {
  const prompt = buildClockPrompt(displayTime, promptFormat);
  const openai = getOpenAIClient();
  const reservation = await reserveDailyImageBudget();

  let response;

  try {
    response = await openai.images.generate({
      model: DEFAULT_OPENAI_IMAGE_MODEL,
      prompt,
      quality: DEFAULT_OPENAI_IMAGE_QUALITY,
      size: imageSize,
    });
  } catch (error) {
    await releaseDailyImageBudget(reservation);
    throw error;
  }

  const firstImage = response.data?.[0];

  if (!firstImage?.b64_json) {
    await releaseDailyImageBudget(reservation);
    throw new Error("The OpenAI image response did not include image data.");
  }

  const buffer = Buffer.from(firstImage.b64_json, "base64");

  return {
    buffer,
    displayTime,
    generatedAt: new Date().toISOString(),
    imageSize,
    mimeType: "image/png",
    model: DEFAULT_OPENAI_IMAGE_MODEL,
    promptFormat,
    requestMinuteKey,
  };
}

export async function getMinuteImage(request: MinuteImageRequest) {
  const cacheKey = getCacheKey(request);
  const cached = resolvedCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const pending = pendingCache.get(cacheKey);
  if (pending) {
    return pending;
  }

  const task = generateMinuteImage(request)
    .then((image) => {
      resolvedCache.set(cacheKey, image);
      pendingCache.delete(cacheKey);
      trimCache();
      return image;
    })
    .catch((error) => {
      pendingCache.delete(cacheKey);
      throw error;
    });

  pendingCache.set(cacheKey, task);

  return task;
}

// TODO(v2): Accept viewport-derived output sizes and format selection here.
// TODO(v2): Return richer generation metadata for loading overlays and fullscreen mode.
