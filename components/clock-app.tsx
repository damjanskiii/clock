"use client";

import { useEffect, useRef, useState } from "react";
import { ClockShell } from "@/components/clock-shell";
import { clockVariants, type ClockVariantId } from "@/lib/clock-variants";
import { CLOCK_PREFETCH_MINUTES_AHEAD, getClockSnapshot, getFutureMinuteKeys, type ClockSnapshot } from "@/lib/clock-time";

type FetchResult = {
  minuteKey: string;
  objectUrl: string;
};

type ClockAppProps = {
  variant: ClockVariantId;
};

export function ClockApp({ variant }: ClockAppProps) {
  const variantConfig = clockVariants[variant];
  const [displayTime, setDisplayTime] = useState(() => getClockSnapshot().displayTime);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [statusText, setStatusText] = useState<string>("Generating current clock...");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);

  const currentMinuteRef = useRef<string | null>(null);
  const currentObjectUrlRef = useRef<string | null>(null);
  const prefetchedRef = useRef<Map<string, FetchResult>>(new Map());
  const requestCacheRef = useRef<Map<string, Promise<FetchResult>>>(new Map());
  const prefetchTaskRef = useRef<Promise<void> | null>(null);
  const boundaryTimerRef = useRef<number | null>(null);
  const titleTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const prefetchedStore = prefetchedRef.current;
    const requestCache = requestCacheRef.current;

    const revokeObjectUrl = (objectUrl: string | null) => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };

    const revokeFetchResult = (result: FetchResult | null | undefined) => {
      if (result) {
        revokeObjectUrl(result.objectUrl);
      }
    };

    const getRetainedMinuteKeys = () => [getClockSnapshot().minuteKey, ...getFutureMinuteKeys(CLOCK_PREFETCH_MINUTES_AHEAD)];

    const prunePrefetchedMinutes = (minuteKeys = getRetainedMinuteKeys()) => {
      const keep = new Set(minuteKeys);

      for (const [minuteKey, result] of prefetchedStore.entries()) {
        if (!keep.has(minuteKey)) {
          revokeFetchResult(result);
          prefetchedStore.delete(minuteKey);
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

    const swapCurrentImage = (nextImage: FetchResult) => {
      revokeObjectUrl(currentObjectUrlRef.current);
      currentObjectUrlRef.current = nextImage.objectUrl;
      currentMinuteRef.current = nextImage.minuteKey;
      setImageUrl(nextImage.objectUrl);
      setErrorText(null);
      setIsGenerating(false);
      setStatusText("");
    };

    const requestMinuteImage = (minuteKey: string) => {
      const cachedRequest = requestCache.get(minuteKey);
      if (cachedRequest) {
        return cachedRequest;
      }

      const task = fetchMinuteImage(minuteKey).finally(() => {
        requestCache.delete(minuteKey);
      });

      requestCache.set(minuteKey, task);
      return task;
    };

    const fetchMinuteImage = async (minuteKey: string): Promise<FetchResult> => {
      const response = await fetch(`/api/clock?minute=${encodeURIComponent(minuteKey)}`, {
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
          // Keep the default message if the response body is not JSON.
        }

        throw new Error(message);
      }

      const blob = await response.blob();

      return {
        minuteKey,
        objectUrl: URL.createObjectURL(blob),
      };
    };

    const ensureCurrentMinute = async (snapshot: ClockSnapshot) => {
      const prefetched = prefetchedStore.get(snapshot.minuteKey);
      if (prefetched) {
        prefetchedStore.delete(snapshot.minuteKey);
        swapCurrentImage(prefetched);
        return;
      }

      if (currentMinuteRef.current === snapshot.minuteKey && currentObjectUrlRef.current) {
        setIsGenerating(false);
        return;
      }

      setIsGenerating(true);
      setStatusText(currentMinuteRef.current ? `Generating ${snapshot.displayTime}...` : "Generating current clock...");

      try {
        const result = await requestMinuteImage(snapshot.minuteKey);

        if (cancelled) {
          revokeFetchResult(result);
          return;
        }

        swapCurrentImage(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown clock generation error.";
        setErrorText(message);
        setIsGenerating(false);
        setStatusText(currentMinuteRef.current ? `Holding the previous clock while ${snapshot.displayTime} loads.` : "Unable to load the clock.");
      }
    };

    const prefetchUpcomingMinutes = async () => {
      const futureMinuteKeys = getFutureMinuteKeys(CLOCK_PREFETCH_MINUTES_AHEAD);
      prunePrefetchedMinutes();

      for (const futureMinuteKey of futureMinuteKeys) {
        if (futureMinuteKey === currentMinuteRef.current || prefetchedStore.has(futureMinuteKey)) {
          continue;
        }

        try {
          const prefetched = await requestMinuteImage(futureMinuteKey);

          if (cancelled) {
            revokeFetchResult(prefetched);
            return;
          }

          if (!getRetainedMinuteKeys().includes(futureMinuteKey)) {
            revokeFetchResult(prefetched);
            continue;
          }

          prefetchedStore.set(futureMinuteKey, prefetched);
          prunePrefetchedMinutes();
        } catch (error) {
          console.error("Clock prefetch failed", error);
        }
      }
    };

    const scheduleMinuteLoop = async () => {
      if (cancelled) {
        return;
      }

      clearScheduledTimeouts();

      const snapshot = updateTitle();
      prunePrefetchedMinutes();
      await ensureCurrentMinute(snapshot);

      if (cancelled) {
        return;
      }

      if (!prefetchTaskRef.current) {
        prefetchTaskRef.current = prefetchUpcomingMinutes().finally(() => {
          prefetchTaskRef.current = null;
        });
      }

      boundaryTimerRef.current = window.setTimeout(() => {
        void scheduleMinuteLoop();
      }, snapshot.msUntilNextMinute + 40);
    };

    titleTimerRef.current = window.setInterval(() => {
      updateTitle();
    }, 1000);

    void scheduleMinuteLoop();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        clearScheduledTimeouts();
        void scheduleMinuteLoop();
      }
    };

    window.addEventListener("focus", handleVisibility);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      clearScheduledTimeouts();
      const prefetchedEntries = [...prefetchedStore.values()];
      if (titleTimerRef.current) {
        window.clearInterval(titleTimerRef.current);
      }
      window.removeEventListener("focus", handleVisibility);
      document.removeEventListener("visibilitychange", handleVisibility);
      revokeObjectUrl(currentObjectUrlRef.current);
      for (const prefetched of prefetchedEntries) {
        revokeFetchResult(prefetched);
      }
    };
  }, []);

  return (
    <ClockShell
      displayTime={displayTime}
      errorText={errorText}
      imageAlt={`AI-generated clock showing ${displayTime} in New York`}
      imageUrl={imageUrl}
      isGenerating={isGenerating}
      isModalOpen={isModalOpen}
      questionMarkColor={variantConfig.questionMarkColor}
      statusText={statusText}
      variant={variant}
      variantCopy={variantConfig.modalCopy}
      onCloseModal={() => setIsModalOpen(false)}
      onOpenModal={() => setIsModalOpen(true)}
    />
  );
}
