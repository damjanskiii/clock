"use client";

import { useEffect, useRef, useState } from "react";
import { ClockShell } from "@/components/clock-shell";
import { clockVariants, type ClockVariantId } from "@/lib/clock-variants";
import {
  CLOCK_PREFETCH_MINUTES_AHEAD,
  getClockSnapshot,
  getFutureClockTargets,
  type ClockSnapshot,
  type ClockTarget,
} from "@/lib/clock-time";
import {
  getViewportClockSettings,
  type ViewportClockSettings,
} from "@/lib/viewport-clock";

type FetchResult = {
  cacheKey: string;
  debugText: string;
  objectUrl: string;
};

type ClockAppProps = {
  apiPath?: string;
  strictBoundarySwitch?: boolean;
  useViewportSizing?: boolean;
  variant: ClockVariantId;
};

const DAILY_LIMIT_MESSAGE = "Too many people apparently don't know how late it is and are visiting this site. Hold your horses - the daily token limit has been reached. Come back tomorrow.";
const URGENT_PREFETCH_LEAD_MS = 25_000;
const RETIRED_OBJECT_URL_BUFFER = 4;

function buildClockRequestUrl(
  target: ClockTarget,
  apiPath: string,
  viewportSettings: ViewportClockSettings | null,
) {
  const params = new URLSearchParams({
    requestMinute: target.requestMinuteKey,
    time: target.displayTime,
  });

  if (viewportSettings) {
    params.set("viewportWidth", String(viewportSettings.width));
    params.set("viewportHeight", String(viewportSettings.height));
  } else {
    params.set("format", "square");
  }

  return `${apiPath}?${params.toString()}`;
}

function getRequestScopeKey(viewportSettings: ViewportClockSettings | null) {
  return viewportSettings?.cacheKey ?? "square";
}

export function ClockApp({
  apiPath = "/api/clock",
  strictBoundarySwitch = false,
  useViewportSizing = false,
  variant,
}: ClockAppProps) {
  const variantConfig = clockVariants[variant];
  const [debugText, setDebugText] = useState("");
  const [displayTime, setDisplayTime] = useState(() => getClockSnapshot().displayTime);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [viewportSettings, setViewportSettings] = useState<ViewportClockSettings | null>(() => {
    if (typeof window === "undefined" || !useViewportSizing) {
      return null;
    }

    return getViewportClockSettings(window.innerWidth, window.innerHeight);
  });

  const currentTargetRef = useRef<ClockTarget | null>(null);
  const currentObjectUrlRef = useRef<string | null>(null);
  const imageRecoveryRef = useRef<(() => void) | null>(null);
  const prefetchedRef = useRef<Map<string, FetchResult>>(new Map());
  const requestCacheRef = useRef<Map<string, Promise<FetchResult>>>(new Map());
  const prefetchTaskRef = useRef<Promise<void> | null>(null);
  const boundaryTimerRef = useRef<number | null>(null);
  const titleTimerRef = useRef<number | null>(null);
  const budgetExceededRef = useRef(false);
  const viewportCacheKey = viewportSettings?.cacheKey ?? null;

  useEffect(() => {
    if (!useViewportSizing) {
      return;
    }

    let resizeTimer: number | null = null;

    const updateViewportSettings = () => {
      setViewportSettings(
        getViewportClockSettings(window.innerWidth, window.innerHeight),
      );
    };

    updateViewportSettings();

    const handleResize = () => {
      if (resizeTimer) {
        window.clearTimeout(resizeTimer);
      }

      resizeTimer = window.setTimeout(() => {
        updateViewportSettings();
      }, 150);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      if (resizeTimer) {
        window.clearTimeout(resizeTimer);
      }

      window.removeEventListener("resize", handleResize);
    };
  }, [useViewportSizing]);

  useEffect(() => {
    if (useViewportSizing && !viewportSettings) {
      return;
    }

    let cancelled = false;
    const prefetchedStore = prefetchedRef.current;
    const requestCache = requestCacheRef.current;
    const retiredObjectUrls: string[] = [];
    const scopeKey = getRequestScopeKey(viewportSettings);

    const getRequestCacheKey = (target: ClockTarget) => `${target.cacheKey}|${scopeKey}`;

    const revokeObjectUrl = (objectUrl: string | null) => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };

    const revokeFetchResult = (result: FetchResult | null | undefined) => {
      if (result) {
        if (result.objectUrl === currentObjectUrlRef.current) {
          return;
        }

        revokeObjectUrl(result.objectUrl);
      }
    };

    const retireObjectUrl = (objectUrl: string | null) => {
      if (!objectUrl || objectUrl === currentObjectUrlRef.current) {
        return;
      }

      retiredObjectUrls.push(objectUrl);

      while (retiredObjectUrls.length > RETIRED_OBJECT_URL_BUFFER) {
        const oldestObjectUrl = retiredObjectUrls.shift() ?? null;
        revokeObjectUrl(oldestObjectUrl);
      }
    };

    const getRetainedTargetKeys = () => {
      const snapshot = getClockSnapshot();
      return [
        getRequestCacheKey(snapshot),
        ...getFutureClockTargets(CLOCK_PREFETCH_MINUTES_AHEAD).map((target) => getRequestCacheKey(target)),
      ];
    };

    const prunePrefetchedMinutes = (targetKeys = getRetainedTargetKeys()) => {
      const keep = new Set(targetKeys);

      for (const [targetKey, result] of prefetchedStore.entries()) {
        if (!keep.has(targetKey)) {
          revokeFetchResult(result);
          prefetchedStore.delete(targetKey);
        }
      }
    };

    const clearScheduledTimeouts = () => {
      if (boundaryTimerRef.current) {
        window.clearTimeout(boundaryTimerRef.current);
      }
    };

    const updateTitle = () => {
      const snapshot = getClockSnapshot();
      document.title = snapshot.displayTime;
      setDisplayTime(snapshot.displayTime);
      return snapshot;
    };

    const swapCurrentImage = (nextImage: FetchResult, target: ClockTarget) => {
      if (currentObjectUrlRef.current && currentObjectUrlRef.current !== nextImage.objectUrl) {
        retireObjectUrl(currentObjectUrlRef.current);
      }

      currentObjectUrlRef.current = nextImage.objectUrl;
      currentTargetRef.current = target;
      setDebugText(nextImage.debugText);
      setImageUrl(nextImage.objectUrl);
      setErrorText(null);
      setIsGenerating(false);
    };

    const requestClockImage = (target: ClockTarget) => {
      const requestCacheKey = getRequestCacheKey(target);
      const cachedRequest = requestCache.get(requestCacheKey);
      if (cachedRequest) {
        return cachedRequest;
      }

      const task = fetchClockImage(target).finally(() => {
        requestCache.delete(requestCacheKey);
      });

      requestCache.set(requestCacheKey, task);
      return task;
    };

    const fetchClockImage = async (target: ClockTarget): Promise<FetchResult> => {
      const response = await fetch(buildClockRequestUrl(target, apiPath, viewportSettings), {
        cache: "no-store",
      });

      if (!response.ok) {
        let message = `Clock generation failed with status ${response.status}.`;

        try {
          const body = (await response.json()) as { error?: string };
          if (body.error) {
            message = body.error;
          }
        } catch {
          // Ignore non-JSON error bodies.
        }

        throw new Error(message);
      }

      const blob = await response.blob();

      return {
        cacheKey: getRequestCacheKey(target),
        debugText: [
          `prompt_time=${response.headers.get("X-Clock-Time") ?? target.displayTime}`,
          `request_minute=${response.headers.get("X-Clock-Minute") ?? target.requestMinuteKey}`,
          `generated_at=${response.headers.get("X-Clock-Generated-At") ?? "unknown"}`,
          `model=${response.headers.get("X-Clock-Model") ?? "unknown"}`,
          `prompt_format=${response.headers.get("X-Clock-Prompt-Format") ?? "unknown"}`,
          `image_size=${response.headers.get("X-Clock-Size") ?? "unknown"}`,
          `viewport=${response.headers.get("X-Clock-Viewport") ?? scopeKey}`,
        ].join(" | "),
        objectUrl: URL.createObjectURL(blob),
      };
    };

    const ensureCurrentMinute = async (snapshot: ClockSnapshot) => {
      const requestCacheKey = getRequestCacheKey(snapshot);
      const prefetched = prefetchedStore.get(requestCacheKey);
      if (prefetched) {
        prefetchedStore.delete(requestCacheKey);
        swapCurrentImage(prefetched, snapshot);
        return;
      }

      if (currentTargetRef.current?.cacheKey === snapshot.cacheKey && currentObjectUrlRef.current) {
        setIsGenerating(false);
        return;
      }

      setIsGenerating(true);

      try {
        const result = await requestClockImage(snapshot);

        if (cancelled) {
          revokeFetchResult(result);
          return;
        }

        const latestSnapshot = getClockSnapshot();

        if (latestSnapshot.requestMinuteKey !== snapshot.requestMinuteKey) {
          revokeFetchResult(result);
          await ensureCurrentMinute(latestSnapshot);
          return;
        }

        swapCurrentImage(result, snapshot);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown clock generation error.";

        if (message === DAILY_LIMIT_MESSAGE) {
          budgetExceededRef.current = true;
        }

        setErrorText(message);
        setIsGenerating(false);
      }
    };

    imageRecoveryRef.current = () => {
      const latestSnapshot = getClockSnapshot();
      const brokenUrl = currentObjectUrlRef.current;

      if (brokenUrl) {
        revokeObjectUrl(brokenUrl);
      }

      currentObjectUrlRef.current = null;
      currentTargetRef.current = null;
      setImageUrl(null);
      setErrorText(null);
      setIsGenerating(true);

      void ensureCurrentMinute(latestSnapshot);
    };

    const clearVisibleImage = () => {
      revokeObjectUrl(currentObjectUrlRef.current);
      currentObjectUrlRef.current = null;
      currentTargetRef.current = null;
      setDebugText("");
      setImageUrl(null);
      setIsGenerating(true);
    };

    const prefetchUpcomingMinutes = async () => {
      const futureTargets = getFutureClockTargets(CLOCK_PREFETCH_MINUTES_AHEAD);
      prunePrefetchedMinutes();

      const targetsToPrefetch = futureTargets.filter((futureTarget) => {
        if (budgetExceededRef.current || document.visibilityState !== "visible") {
          return false;
        }

        if (futureTarget.cacheKey === currentTargetRef.current?.cacheKey) {
          return false;
        }

        return !prefetchedStore.has(getRequestCacheKey(futureTarget));
      });

      await Promise.allSettled(
        targetsToPrefetch.map(async (futureTarget) => {
          try {
            const prefetched = await requestClockImage(futureTarget);

            if (cancelled) {
              revokeFetchResult(prefetched);
              return;
            }

            if (futureTarget.cacheKey === currentTargetRef.current?.cacheKey) {
              return;
            }

            if (!getRetainedTargetKeys().includes(getRequestCacheKey(futureTarget))) {
              revokeFetchResult(prefetched);
              return;
            }

            prefetchedStore.set(getRequestCacheKey(futureTarget), prefetched);
            prunePrefetchedMinutes();
          } catch (error) {
            const message = error instanceof Error ? error.message : "Clock prefetch failed.";

            if (message === DAILY_LIMIT_MESSAGE) {
              budgetExceededRef.current = true;
              setErrorText(message);
              setIsGenerating(false);
              return;
            }

            console.error("Clock prefetch failed", error);
          }
        }),
      );
    };

    const primeUpcomingMinutes = () => {
      if (prefetchTaskRef.current || budgetExceededRef.current || document.visibilityState !== "visible") {
        return;
      }

      prefetchTaskRef.current = prefetchUpcomingMinutes().finally(() => {
        prefetchTaskRef.current = null;
      });
    };

    const scheduleMinuteLoop = async () => {
      if (cancelled || document.visibilityState !== "visible") {
        return;
      }

      const snapshot = updateTitle();

      if (budgetExceededRef.current) {
        setErrorText(DAILY_LIMIT_MESSAGE);
        setIsGenerating(false);
        clearScheduledTimeouts();
        return;
      }

      clearScheduledTimeouts();
      prunePrefetchedMinutes();

      if (
        strictBoundarySwitch
        || currentObjectUrlRef.current
        || snapshot.msUntilNextMinute <= URGENT_PREFETCH_LEAD_MS
      ) {
        primeUpcomingMinutes();
      }

      if (
        strictBoundarySwitch
        && currentTargetRef.current
        && currentTargetRef.current.requestMinuteKey !== snapshot.requestMinuteKey
      ) {
        const prefetched = prefetchedStore.get(getRequestCacheKey(snapshot));

        if (prefetched) {
          prefetchedStore.delete(getRequestCacheKey(snapshot));
          swapCurrentImage(prefetched, snapshot);
        } else {
          clearVisibleImage();
        }
      }

      await ensureCurrentMinute(snapshot);

      if (cancelled || budgetExceededRef.current || document.visibilityState !== "visible") {
        return;
      }

      primeUpcomingMinutes();

      boundaryTimerRef.current = window.setTimeout(() => {
        void scheduleMinuteLoop();
      }, snapshot.msUntilNextMinute);
    };

    titleTimerRef.current = window.setInterval(() => {
      updateTitle();
    }, 1_000);

    if (document.visibilityState === "visible") {
      void scheduleMinuteLoop();
    }

    const handleVisibilityChange = () => {
      clearScheduledTimeouts();

      if (document.visibilityState === "visible") {
        void scheduleMinuteLoop();
      }
    };

    window.addEventListener("focus", handleVisibilityChange);
    window.addEventListener("blur", clearScheduledTimeouts);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      imageRecoveryRef.current = null;
      clearScheduledTimeouts();
      const prefetchedEntries = [...prefetchedStore.values()];
      if (titleTimerRef.current) {
        window.clearInterval(titleTimerRef.current);
      }
      window.removeEventListener("focus", handleVisibilityChange);
      window.removeEventListener("blur", clearScheduledTimeouts);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      revokeObjectUrl(currentObjectUrlRef.current);
      for (const retiredObjectUrl of retiredObjectUrls) {
        revokeObjectUrl(retiredObjectUrl);
      }
      for (const prefetched of prefetchedEntries) {
        revokeFetchResult(prefetched);
      }
    };
  }, [apiPath, strictBoundarySwitch, useViewportSizing, viewportSettings, viewportCacheKey]);

  return (
    <ClockShell
      debugText={debugText}
      errorText={errorText}
      imageAlt={`AI-generated clock showing ${displayTime} in your local time`}
      imageUrl={imageUrl}
      onImageError={() => imageRecoveryRef.current?.()}
      isGenerating={isGenerating}
      isModalOpen={isModalOpen}
      isViewportFill={useViewportSizing}
      questionMarkColor={variantConfig.questionMarkColor}
      variant={variant}
      variantCopy={variantConfig.modalCopy}
      onCloseModal={() => setIsModalOpen(false)}
      onOpenModal={() => setIsModalOpen(true)}
    />
  );
}
