import Constants from "expo-constants";

type SeverityLevel = "fatal" | "error" | "warning" | "log" | "info" | "debug";
type MobileSentryScope = {
  setLevel: (level: SeverityLevel) => void;
  setTag: (key: string, value: string) => void;
  setContext: (key: string, value: Record<string, unknown>) => void;
  setExtra: (key: string, value: unknown) => void;
};
type MobileSentryModule = {
  init: (options: {
    dsn: string;
    environment: string;
    release?: string;
    enabled: boolean;
    attachStacktrace: boolean;
    sendDefaultPii: boolean;
    tracesSampleRate: number;
    beforeSend: (event: Record<string, unknown>) => Record<string, unknown> | null;
  }) => void;
  withScope: (callback: (scope: MobileSentryScope) => void) => void;
  captureException: (error: Error) => void;
  captureMessage: (message: string) => void;
  setUser: (user: { id: string; email?: string; username?: string } | null) => void;
  setTag: (key: string, value: string) => void;
};

type MobileSentryUser = {
  id: string;
  email?: string | null;
  displayName?: string | null;
  role?: string | null;
  provider?: string | null;
};

const MOBILE_SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim() ?? "";
const MOBILE_SENTRY_ENVIRONMENT =
  process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT?.trim() ||
  process.env.NODE_ENV ||
  "development";
const MOBILE_SENTRY_RELEASE =
  process.env.EXPO_PUBLIC_RELEASE_VERSION?.trim() ||
  Constants.expoConfig?.version ||
  undefined;
const SCRUBBED_KEYS = ["authorization", "cookie", "password", "secret", "token"];

let isInitialized = false;
let sentryPromise: Promise<MobileSentryModule | null> | null = null;

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
  if (process.env.NODE_ENV === "test" || !MOBILE_SENTRY_DSN) {
    return null;
  }

  if (!sentryPromise) {
    sentryPromise = import("@sentry/react-native")
      .then((module) => module as unknown as MobileSentryModule)
      .catch(() => null);
  }

  return sentryPromise;
};

export const initializeMobileSentry = () => {
  if (isInitialized || !MOBILE_SENTRY_DSN || process.env.NODE_ENV === "test") {
    return;
  }

  isInitialized = true;

  void loadSentry().then((Sentry) => {
    if (!Sentry) {
      return;
    }

    Sentry.init({
      dsn: MOBILE_SENTRY_DSN,
      environment: MOBILE_SENTRY_ENVIRONMENT,
      release: MOBILE_SENTRY_RELEASE,
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

    Sentry.setTag("ecotrack.executionEnvironment", String(Constants.executionEnvironment));
  });
};

export const captureMobileException = (
  error: unknown,
  context: string,
  metadata?: Record<string, unknown>,
  level: SeverityLevel = "error",
) => {
  if (!MOBILE_SENTRY_DSN) {
    return;
  }

  initializeMobileSentry();

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

export const captureMobileMessage = (
  message: string,
  context: string,
  metadata?: Record<string, unknown>,
  level: SeverityLevel = "warning",
) => {
  if (!MOBILE_SENTRY_DSN) {
    return;
  }

  initializeMobileSentry();

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

export const syncMobileSentryUser = (user: MobileSentryUser | null) => {
  if (!MOBILE_SENTRY_DSN) {
    return;
  }

  initializeMobileSentry();

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
