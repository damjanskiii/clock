import { CLOCK_TIME_ZONE } from "@/lib/clock-config";

export const CLOCK_PREFETCH_MINUTES_AHEAD = 2;

const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: CLOCK_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export type ClockSnapshot = {
  displayTime: string;
  minuteKey: string;
  msUntilNextMinute: number;
  nextMinuteKey: string;
};

export type AdjacentMinuteKeys = {
  currentMinuteKey: string;
  nextMinuteKey: string;
  previousMinuteKey: string;
};

function formatMinuteKeyParts(date: Date) {
  const parts = formatter.formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    displayTime: `${values.hour}:${values.minute}`,
    minuteKey: `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`,
  };
}

export function getClockSnapshot(now: Date = new Date()): ClockSnapshot {
  const current = formatMinuteKeyParts(now);
  const nextMinuteAt = Math.floor(now.getTime() / 60_000) * 60_000 + 60_000;
  const next = formatMinuteKeyParts(new Date(nextMinuteAt));

  return {
    displayTime: current.displayTime,
    minuteKey: current.minuteKey,
    msUntilNextMinute: Math.max(nextMinuteAt - now.getTime(), 0),
    nextMinuteKey: next.minuteKey,
  };
}

export function getNextMinuteKey(snapshot: ClockSnapshot) {
  return snapshot.nextMinuteKey;
}

export function isValidMinuteKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value);
}

export function getFutureMinuteKeys(minutesAhead = CLOCK_PREFETCH_MINUTES_AHEAD, now: Date = new Date()) {
  return Array.from({ length: minutesAhead }, (_, index) => {
    const minuteOffset = index + 1;
    return formatMinuteKeyParts(new Date(now.getTime() + minuteOffset * 60_000)).minuteKey;
  });
}

export function getAdjacentMinuteKeys(now: Date = new Date()): AdjacentMinuteKeys {
  const snapshot = getClockSnapshot(now);
  const previousMinuteKey = formatMinuteKeyParts(new Date(now.getTime() - 60_000)).minuteKey;

  return {
    currentMinuteKey: snapshot.minuteKey,
    nextMinuteKey: snapshot.nextMinuteKey,
    previousMinuteKey,
  };
}

export function isRequestableMinuteKey(value: string, now: Date = new Date()) {
  const { currentMinuteKey, previousMinuteKey } = getAdjacentMinuteKeys(now);
  const allowedKeys = new Set([
    previousMinuteKey,
    currentMinuteKey,
    ...getFutureMinuteKeys(CLOCK_PREFETCH_MINUTES_AHEAD, now),
  ]);

  return allowedKeys.has(value);
}
