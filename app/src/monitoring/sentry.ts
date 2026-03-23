import type { SeverityLevel } from "@sentry/react";

type WebSentryModule = typeof import("@sentry/react");

type WebSentryUser = {
  id: string;
  email?: string | null;
  displayName?: string | null;
  role?: string | null;
  provider?: string | null;
};

const WEB_SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN?.trim() ?? "";
const WEB_SENTRY_ENVIRONMENT =
  import.meta.env.VITE_SENTRY_ENVIRONMENT?.trim() || import.meta.env.MODE;
const WEB_SENTRY_RELEASE = import.meta.env.VITE_RELEASE_VERSION?.trim() || undefined;
const SCRUBBED_KEYS = ["authorization", "cookie", "password", "secret", "token"];

let isInitialized = false;
let sentryPromise: Promise<WebSentryModule | null> | null = null;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const scrubValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((entry) => scrubValue(entry));
  }

  if (!isPlainObject(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entryValue]) => {
      const normalizedKey = key.toLowerCase();
      if (SCRUBBED_KEYS.some((token) => normalizedKey.includes(token))) {
        return [key, "[Filtered]"];
      }

      return [key, scrubValue(entryValue)];
    }),
  );
};

const loadSentry = async () => {
  if (import.meta.env.MODE === "test" || typeof window === "undefined" || !WEB_SENTRY_DSN) {
    return null;
  }

  if (!sentryPromise) {
    sentryPromise = import("@sentry/react")
      .then((module) => module)
      .catch(() => null);
  }

  return sentryPromise;
};

export const initializeWebErrorTracking = () => {
  if (isInitialized || !WEB_SENTRY_DSN || import.meta.env.MODE === "test") {
    return;
  }

  isInitialized = true;

  void loadSentry().then((Sentry) => {
    if (!Sentry) {
      return;
    }

    Sentry.init({
      dsn: WEB_SENTRY_DSN,
      environment: WEB_SENTRY_ENVIRONMENT,
      release: WEB_SENTRY_RELEASE,
      enabled: true,
      attachStacktrace: true,
      sendDefaultPii: false,
      tracesSampleRate: 0.1,
      beforeSend(event) {
        const nextEvent = { ...event };
        const request = nextEvent.request as { headers?: unknown } | undefined;

        if (request?.headers) {
          nextEvent.request = {
            ...request,
            headers: scrubValue(request.headers),
          } as typeof nextEvent.request;
        }

        if (nextEvent.extra) {
          nextEvent.extra = scrubValue(nextEvent.extra) as typeof nextEvent.extra;
        }

        if (nextEvent.contexts) {
          nextEvent.contexts = scrubValue(nextEvent.contexts) as typeof nextEvent.contexts;
        }

        return nextEvent;
      },
    });
  });
};

export const captureWebException = (
  error: unknown,
  context: string,
  metadata?: Record<string, unknown>,
  level: SeverityLevel = "error",
) => {
  if (!WEB_SENTRY_DSN) {
    return;
  }

  initializeWebErrorTracking();

  void loadSentry().then((Sentry) => {
    if (!Sentry) {
      return;
    }

    Sentry.withScope((scope) => {
      scope.setLevel(level);
      scope.setTag("ecotrack.context", context);

      if (metadata) {
        scope.setContext("ecotrack.metadata", scrubValue(metadata) as Record<string, unknown>);
      }

      if (error instanceof Error) {
        Sentry.captureException(error);
        return;
      }

      scope.setExtra("nonErrorValue", scrubValue(error));
      Sentry.captureMessage(typeof error === "string" ? error : "Captured non-error value");
    });
  });
};

export const captureWebMessage = (
  message: string,
  context: string,
  metadata?: Record<string, unknown>,
  level: SeverityLevel = "warning",
) => {
  if (!WEB_SENTRY_DSN) {
    return;
  }

  initializeWebErrorTracking();

  void loadSentry().then((Sentry) => {
    if (!Sentry) {
      return;
    }

    Sentry.withScope((scope) => {
      scope.setLevel(level);
      scope.setTag("ecotrack.context", context);

      if (metadata) {
        scope.setContext("ecotrack.metadata", scrubValue(metadata) as Record<string, unknown>);
      }

      Sentry.captureMessage(message);
    });
  });
};

export const syncWebSentryUser = (user: WebSentryUser | null) => {
  if (!WEB_SENTRY_DSN) {
    return;
  }

  initializeWebErrorTracking();

  void loadSentry().then((Sentry) => {
    if (!Sentry) {
      return;
    }

    if (!user) {
      Sentry.setUser(null);
      return;
    }

    Sentry.setUser({
      id: user.id,
      email: user.email ?? undefined,
      username: user.displayName ?? undefined,
    });

    if (user.role) {
      Sentry.setTag("ecotrack.role", user.role);
    }

    if (user.provider) {
      Sentry.setTag("ecotrack.provider", user.provider);
    }
  });
};
