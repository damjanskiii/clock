import {
  CLOCK_BUDGET_TIME_ZONE,
  CLOCK_DAILY_BUDGET_USD,
  CLOCK_DAILY_LIMIT_MESSAGE,
  CLOCK_ESTIMATED_IMAGE_COST_USD,
} from "@/lib/clock-config";
import { getCache } from "@vercel/functions";

type BudgetState = {
  dayKey: string;
  spentUsd: number;
};

type BudgetReservation = {
  dayKey: string;
  estimatedCostUsd: number;
  spentUsd: number;
};

const BUDGET_CACHE_KEY_PREFIX = "clock-daily-budget";
const BUDGET_CACHE_TTL_SECONDS = 60 * 60 * 30;

declare global {
  var __clockDailyBudgetState: BudgetState | undefined;
}

const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: CLOCK_BUDGET_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function getDayKey(now: Date = new Date()) {
  return dayFormatter.format(now);
}

function getBudgetState(now: Date = new Date()) {
  const dayKey = getDayKey(now);

  if (!globalThis.__clockDailyBudgetState || globalThis.__clockDailyBudgetState.dayKey !== dayKey) {
    globalThis.__clockDailyBudgetState = {
      dayKey,
      spentUsd: 0,
    };
  }

  return globalThis.__clockDailyBudgetState;
}

function getBudgetCacheKey(dayKey: string) {
  return `${BUDGET_CACHE_KEY_PREFIX}:${dayKey}`;
}

async function getCachedBudgetState(now: Date = new Date()) {
  const cache = getCache({ namespace: "damjanskios-clock" });
  const dayKey = getDayKey(now);
  const cacheKey = getBudgetCacheKey(dayKey);
  const cachedValue = await cache.get(cacheKey);

  if (
    cachedValue &&
    typeof cachedValue === "object" &&
    "dayKey" in cachedValue &&
    "spentUsd" in cachedValue &&
    typeof cachedValue.dayKey === "string" &&
    typeof cachedValue.spentUsd === "number"
  ) {
    return {
      cache,
      cacheKey,
      state: cachedValue as BudgetState,
    };
  }

  const state: BudgetState = {
    dayKey,
    spentUsd: 0,
  };

  await cache.set(cacheKey, state, {
    name: "Clock daily budget",
    tags: ["clock-budget"],
    ttl: BUDGET_CACHE_TTL_SECONDS,
  });

  return {
    cache,
    cacheKey,
    state,
  };
}

export class DailyClockBudgetExceededError extends Error {
  constructor(message = CLOCK_DAILY_LIMIT_MESSAGE) {
    super(message);
    this.name = "DailyClockBudgetExceededError";
  }
}

export async function reserveDailyImageBudget(now: Date = new Date()): Promise<BudgetReservation> {
  const estimatedCostUsd = CLOCK_ESTIMATED_IMAGE_COST_USD;

  try {
    const { cache, cacheKey, state } = await getCachedBudgetState(now);

    if (CLOCK_DAILY_BUDGET_USD > 0 && state.spentUsd + estimatedCostUsd > CLOCK_DAILY_BUDGET_USD) {
      throw new DailyClockBudgetExceededError();
    }

    const updatedState: BudgetState = {
      dayKey: state.dayKey,
      spentUsd: Number((state.spentUsd + estimatedCostUsd).toFixed(6)),
    };

    await cache.set(cacheKey, updatedState, {
      name: "Clock daily budget",
      tags: ["clock-budget"],
      ttl: BUDGET_CACHE_TTL_SECONDS,
    });

    return {
      dayKey: updatedState.dayKey,
      estimatedCostUsd,
      spentUsd: updatedState.spentUsd,
    };
  } catch (error) {
    if (error instanceof DailyClockBudgetExceededError) {
      throw error;
    }

    const state = getBudgetState(now);

    if (CLOCK_DAILY_BUDGET_USD > 0 && state.spentUsd + estimatedCostUsd > CLOCK_DAILY_BUDGET_USD) {
      throw new DailyClockBudgetExceededError();
    }

    state.spentUsd = Number((state.spentUsd + estimatedCostUsd).toFixed(6));

    return {
      dayKey: state.dayKey,
      estimatedCostUsd,
      spentUsd: state.spentUsd,
    };
  }
}

export async function releaseDailyImageBudget(reservation: BudgetReservation) {
  try {
    const { cache, cacheKey, state } = await getCachedBudgetState();

    if (state.dayKey === reservation.dayKey) {
      const updatedState: BudgetState = {
        dayKey: state.dayKey,
        spentUsd: Math.max(Number((state.spentUsd - reservation.estimatedCostUsd).toFixed(6)), 0),
      };

      await cache.set(cacheKey, updatedState, {
        name: "Clock daily budget",
        tags: ["clock-budget"],
        ttl: BUDGET_CACHE_TTL_SECONDS,
      });
    }
  } catch {
    const state = getBudgetState();

    if (state.dayKey !== reservation.dayKey) {
      return;
    }

    state.spentUsd = Math.max(Number((state.spentUsd - reservation.estimatedCostUsd).toFixed(6)), 0);
  }
}

export async function getDailyImageBudgetSnapshot(now: Date = new Date()) {
  try {
    const { state } = await getCachedBudgetState(now);

    return {
      dayKey: state.dayKey,
      remainingUsd: Math.max(CLOCK_DAILY_BUDGET_USD - state.spentUsd, 0),
      spentUsd: state.spentUsd,
      limitUsd: CLOCK_DAILY_BUDGET_USD,
      estimatedCostUsd: CLOCK_ESTIMATED_IMAGE_COST_USD,
    };
  } catch {
    const state = getBudgetState(now);

    return {
      dayKey: state.dayKey,
      remainingUsd: Math.max(CLOCK_DAILY_BUDGET_USD - state.spentUsd, 0),
      spentUsd: state.spentUsd,
      limitUsd: CLOCK_DAILY_BUDGET_USD,
      estimatedCostUsd: CLOCK_ESTIMATED_IMAGE_COST_USD,
    };
  }
}
