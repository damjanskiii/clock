import { CLOCK_PROMPT_TEMPLATE } from "@/lib/clock-config";

export function buildClockPrompt(time: string, format: string) {
  return CLOCK_PROMPT_TEMPLATE
    .replaceAll("{time}", time)
    .replaceAll("{format}", format);
}
