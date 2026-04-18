export type ClockVariantId = "v1" | "v2";

type ClockVariant = {
  modalCopy: string;
  questionMarkColor: string;
};

export const clockVariants: Record<ClockVariantId, ClockVariant> = {
  v1: {
    modalCopy: "A new clock is generated every minute to show the current time. The site always uses the latest image model, so its appearance and quality evolve over time - minute by minute.",
    questionMarkColor: "#7a7a7a",
  },
  v2: {
    modalCopy: "This version adapts to your screen size. More time zones are coming soon.",
    questionMarkColor: "#e6c500",
  },
};

// TODO(v2): Introduce viewport-aware generation settings per variant.
// TODO(v2): Add fullscreen image treatment and a dedicated generation overlay.
