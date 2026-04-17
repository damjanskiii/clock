import { CLOCK_PROMPT_TEMPLATE } from "@/lib/clock-config";

type ClockFormat = "square" | "fullscreen";

export function buildClockPrompt(time: string, format: ClockFormat) {
  return CLOCK_PROMPT_TEMPLATE
    .replace("{time}", time)
    .replace("{format}", format);
}
