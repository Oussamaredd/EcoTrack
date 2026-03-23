import { reportFrontendMetric } from "../services/api";

const supportsPerformanceObserver = () =>
  typeof window !== "undefined" && typeof window.PerformanceObserver !== "undefined";

const reportMetric = (
  name: string,
  value: number,
  metadata?: Record<string, unknown>,
  rating?: string,
) => {
  void reportFrontendMetric({
    type: "web_vital",
    name,
    value: Number(value.toFixed(2)),
    rating,
    metadata,
  });
};

const rateMetric = (name: string, value: number) => {
  switch (name) {
    case "CLS":
      return value <= 0.1 ? "good" : value <= 0.25 ? "needs-improvement" : "poor";
    case "INP":
      return value <= 200 ? "good" : value <= 500 ? "needs-improvement" : "poor";
    case "LCP":
      return value <= 2500 ? "good" : value <= 4000 ? "needs-improvement" : "poor";
    case "FCP":
      return value <= 1800 ? "good" : value <= 3000 ? "needs-improvement" : "poor";
    case "TTFB":
      return value <= 800 ? "good" : value <= 1800 ? "needs-improvement" : "poor";
    default:
      return "unknown";
  }
};

export const initializeWebVitalsTracking = () => {
  if (!supportsPerformanceObserver()) {
    return () => undefined;
  }

  const observers: PerformanceObserver[] = [];

  try {
    let clsValue = 0;
    const clsObserver = new window.PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries() as Array<PerformanceEntry & { value?: number; hadRecentInput?: boolean }>) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value ?? 0;
        }
      }

      reportMetric("CLS", clsValue, undefined, rateMetric("CLS", clsValue));
    });
    clsObserver.observe({ type: "layout-shift", buffered: true });
    observers.push(clsObserver);
  } catch {
    // Ignore unsupported observer types.
  }

  try {
    const paintObserver = new window.PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (entry.name === "first-contentful-paint") {
          reportMetric("FCP", entry.startTime, undefined, rateMetric("FCP", entry.startTime));
        }
      }
    });
    paintObserver.observe({ type: "paint", buffered: true });
    observers.push(paintObserver);
  } catch {
    // Ignore unsupported observer types.
  }

  try {
    const lcpObserver = new window.PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      if (lastEntry) {
        reportMetric("LCP", lastEntry.startTime, undefined, rateMetric("LCP", lastEntry.startTime));
      }
    });
    lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
    observers.push(lcpObserver);
  } catch {
    // Ignore unsupported observer types.
  }

  try {
    const inpObserver = new window.PerformanceObserver((entryList) => {
      const entries = entryList.getEntries() as Array<PerformanceEntry & { duration?: number }>;
      const maxDuration = entries.reduce(
        (maxValue, entry) => Math.max(maxValue, entry.duration ?? 0),
        0,
      );

      if (maxDuration > 0) {
        reportMetric("INP", maxDuration, undefined, rateMetric("INP", maxDuration));
      }
    });
    inpObserver.observe({ type: "event", buffered: true });
    observers.push(inpObserver);
  } catch {
    // Ignore unsupported observer types.
  }

  const navigationEntries = window.performance.getEntriesByType("navigation");
  const navigationEntry = navigationEntries[0] as PerformanceNavigationTiming | undefined;
  if (navigationEntry) {
    reportMetric("TTFB", navigationEntry.responseStart, {
      domContentLoaded: navigationEntry.domContentLoadedEventEnd,
      loadEventEnd: navigationEntry.loadEventEnd,
    }, rateMetric("TTFB", navigationEntry.responseStart));
  }

  return () => {
    observers.forEach((observer) => observer.disconnect());
  };
};
