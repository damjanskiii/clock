export type OpenAIImageSize =
  | "1024x1024"
  | "1024x1536"
  | "1536x1024"
  | "256x256"
  | "512x512"
  | "1024x1792"
  | "1792x1024"
  | "auto";

export const DEFAULT_OPENAI_IMAGE_MODEL = "chatgpt-image-latest";
export const DEFAULT_OPENAI_IMAGE_QUALITY = (
  process.env.OPENAI_IMAGE_QUALITY || "medium"
) as "auto" | "high" | "low" | "medium" | "standard" | "hd";
export const DEFAULT_OPENAI_IMAGE_SIZE = (
  process.env.OPENAI_IMAGE_SIZE || "1024x1024"
) as OpenAIImageSize;
export const CLOCK_PROMPT_TEMPLATE = "Create a hyperrealistic clock showing {time}. Do not show seconds. The clock must occupy the full {format} image edge-to-edge with no visible background. The bezel, dial, and overall case must match the {format}. Style: random classic real-world clock style. Use authentic materials and construction. Not illustration, not comic, not stylized graphic art. Hands and numerals must match the style and vary each time. Format: {format}.";
export const CLOCK_DAILY_BUDGET_USD = Number(process.env.CLOCK_DAILY_BUDGET_USD || "20");
export const CLOCK_ESTIMATED_IMAGE_COST_USD = Number(process.env.CLOCK_ESTIMATED_IMAGE_COST_USD || "0.034");
export const CLOCK_BUDGET_TIME_ZONE = process.env.CLOCK_BUDGET_TIME_ZONE || "America/New_York";
export const CLOCK_DAILY_LIMIT_MESSAGE = "Too many people apparently don't know how late it is and are visiting this site. Hold your horses - the daily token limit has been reached. Come back tomorrow.";
