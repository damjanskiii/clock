export const CLOCK_PREFETCH_MINUTES_AHEAD = 2;

export type ClockRequestFormat = "square";

export type ClockTarget = {
  cacheKey: string;
  displayTime: string;
  localMinuteKey: string;
  requestMinuteKey: string;
};

export type ClockSnapshot = ClockTarget & {
  msUntilNextMinute: number;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function buildLocalMinuteKey(date: Date) {
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join("-") + `T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function buildDisplayTime(date: Date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function buildRequestMinuteKey(date: Date) {
  return `${date.toISOString().slice(0, 16)}Z`;
}

export function getClockTarget(date: Date = new Date(), format: ClockRequestFormat = "square"): ClockTarget {
  const displayTime = buildDisplayTime(date);
  const requestMinuteKey = buildRequestMinuteKey(date);

  return {
    cacheKey: `${requestMinuteKey}|${displayTime}|${format}`,
    displayTime,
    localMinuteKey: buildLocalMinuteKey(date),
    requestMinuteKey,
  };
}

export function getClockSnapshot(now: Date = new Date(), format: ClockRequestFormat = "square"): ClockSnapshot {
  const nextMinuteAt = Math.floor(now.getTime() / 60_000) * 60_000 + 60_000;
  const target = getClockTarget(now, format);

  return {
    ...target,
    msUntilNextMinute: Math.max(nextMinuteAt - now.getTime(), 0),
  };
}

export function getFutureClockTargets(
  minutesAhead = CLOCK_PREFETCH_MINUTES_AHEAD,
  now: Date = new Date(),
  format: ClockRequestFormat = "square",
) {
  return Array.from({ length: minutesAhead }, (_, index) => {
    const minuteOffset = index + 1;
    return getClockTarget(new Date(now.getTime() + minuteOffset * 60_000), format);
  });
}

export function isValidDisplayTime(value: string) {
  return /^\d{2}:\d{2}$/.test(value);
}

export function isValidLocalMinuteKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value);
}

export function isValidRequestMinuteKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}Z$/.test(value);
}

export function isRequestableRequestMinuteKey(value: string, now: Date = new Date()) {
  const currentMinute = buildRequestMinuteKey(now);
  const previousMinute = buildRequestMinuteKey(new Date(now.getTime() - 60_000));
  const futureMinutes = getFutureClockTargets(CLOCK_PREFETCH_MINUTES_AHEAD, now).map((target) => target.requestMinuteKey);
  const allowedKeys = new Set([previousMinute, currentMinute, ...futureMinutes]);

  return allowedKeys.has(value);
}
