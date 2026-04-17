export type ClockVariantId = "v1" | "v2";

type ClockVariant = {
  modalCopy: string;
  questionMarkColor: string;
};

export const clockVariants: Record<ClockVariantId, ClockVariant> = {
  v1: {
    modalCopy: "This clock currently runs on EST only. More time zones are coming soon.",
    questionMarkColor: "#7a7a7a",
  },
  v2: {
    modalCopy: "This version adapts to your screen size. More time zones are coming soon.",
    questionMarkColor: "#e6c500",
  },
};

// TODO(v2): Introduce viewport-aware generation settings per variant.
// TODO(v2): Add fullscreen image treatment and a dedicated generation overlay.
