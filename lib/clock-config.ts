export const CLOCK_TIME_ZONE = "America/New_York";
export const DEFAULT_OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1.5";
export const DEFAULT_OPENAI_IMAGE_QUALITY = (
  process.env.OPENAI_IMAGE_QUALITY || "medium"
) as "auto" | "high" | "low" | "medium" | "standard" | "hd";
export const DEFAULT_OPENAI_IMAGE_SIZE = (
  process.env.OPENAI_IMAGE_SIZE || "1024x1024"
) as "1024x1024" | "1024x1536" | "1536x1024" | "256x256" | "512x512" | "1024x1792" | "1792x1024" | "auto";
export const CLOCK_PROMPT_TEMPLATE = "Create an image of a clock showing {time}. Format: {format}.";
