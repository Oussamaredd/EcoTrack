import React from "react";
import { reportFrontendError } from "../services/api";
import { useToast } from "../context/ToastContext";

type ErrorInfo = {
  type: string;
  message: string;
  context: string;
  timestamp: string;
  severity: string;
  status?: number;
  stack?: string | null;
};

type ErrorBoundaryProps = {
  fallback?: React.ReactNode;
  children?: React.ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

export const ERROR_TYPES = {
  NETWORK: "NETWORK",
  AUTH: "AUTH",
  PERMISSION: "PERMISSION",
  VALIDATION: "VALIDATION",
  SERVER: "SERVER",
  REALTIME: "REALTIME",
  MAP_RENDER: "MAP_RENDER",
  MOBILE_NOTIFICATION: "MOBILE_NOTIFICATION",
  UNKNOWN: "UNKNOWN",
  NETWORK_ERROR: "NETWORK",
  API_ERROR: "SERVER",
  VALIDATION_ERROR: "VALIDATION",
  AUTHENTICATION_ERROR: "AUTH",
  TIMEOUT_ERROR: "NETWORK",
  UNKNOWN_ERROR: "UNKNOWN",
} as const;

export const ERROR_SEVERITY = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
} as const;

const getStatusCode = (error: unknown): number | undefined => {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  const candidate = error as {
    status?: unknown;
    statusCode?: unknown;
    response?: { status?: unknown };
  };

  if (typeof candidate.status === "number") {
    return candidate.status;
  }

  if (typeof candidate.statusCode === "number") {
    return candidate.statusCode;
  }

  if (typeof candidate.response?.status === "number") {
    return candidate.response.status;
  }

  return undefined;
};

export const classifyError = (error: unknown) => {
  const status = getStatusCode(error);

  if (error instanceof TypeError && error.message.toLowerCase().includes("failed to fetch")) {
    return {
      type: ERROR_TYPES.NETWORK,
      message: "Network connection error. Please check your connection.",
      status,
      isRecoverable: true,
    };
  }

  if (status === 401 || (error instanceof Error && error.message === "UNAUTHORIZED")) {
    return {
      type: ERROR_TYPES.AUTH,
      message: "You need to log in again to continue.",
      status: 401,
      isRecoverable: false,
    };
  }

  if (status === 403) {
    return {
      type: ERROR_TYPES.PERMISSION,
      message: "You do not have permission to perform this action.",
      status: 403,
      isRecoverable: false,
    };
  }

  if (status === 400 || (typeof error === "object" && error != null && "details" in error)) {
    return {
      type: ERROR_TYPES.VALIDATION,
      message:
        typeof (error as { details?: unknown }).details === "string"
          ? (error as { details: string }).details
          : error instanceof Error
            ? error.message
            : "Validation error",
      status: status ?? 400,
      isRecoverable: true,
    };
  }

  if (typeof status === "number" && status >= 500) {
    return {
      type: ERROR_TYPES.SERVER,
      message: "Server error. Please try again later.",
      status,
      isRecoverable: true,
    };
  }

  return {
    type: ERROR_TYPES.UNKNOWN,
    message: error instanceof Error ? error.message : "An unexpected error occurred",
    status,
    isRecoverable: true,
  };
};

const toErrorInfo = (error: unknown, context: string): ErrorInfo => {
  const classification = classifyError(error);

  return {
    type: classification.type,
    message: classification.message,
    context,
    timestamp: new Date().toISOString(),
    severity: classification.isRecoverable ? ERROR_SEVERITY.MEDIUM : ERROR_SEVERITY.HIGH,
    status: classification.status,
    stack: error instanceof Error ? error.stack ?? null : null,
  };
};

export const logErrorToService = (errorInfo: ErrorInfo, originalError: unknown) => {
  void reportFrontendError({
    ...errorInfo,
    stack: errorInfo.stack ?? (originalError instanceof Error ? originalError.stack ?? null : null),
  });
  void import("../monitoring/sentry").then(({ captureWebException }) => {
    captureWebException(originalError, errorInfo.context, {
      type: errorInfo.type,
      severity: errorInfo.severity,
      status: errorInfo.status,
    });
  });
};

export const reportRealtimeTransportError = (error: unknown, context = "planning.realtime.transport") =>
  logErrorToService(
    {
      type: ERROR_TYPES.REALTIME,
      message: error instanceof Error ? error.message : "Realtime transport failed",
      context,
      severity: ERROR_SEVERITY.HIGH,
      status: getStatusCode(error),
      timestamp: new Date().toISOString(),
      stack: error instanceof Error ? error.stack ?? null : null,
    },
    error,
  );

export const reportMapRenderError = (error: unknown, context = "dashboard.heatmap.render") =>
  logErrorToService(
    {
      type: ERROR_TYPES.MAP_RENDER,
      message: error instanceof Error ? error.message : "Map rendering failed",
      context,
      severity: ERROR_SEVERITY.HIGH,
      status: getStatusCode(error),
      timestamp: new Date().toISOString(),
      stack: error instanceof Error ? error.stack ?? null : null,
    },
    error,
  );

export const handleApiError = (error: unknown, context = "") => {
  const errorInfo = toErrorInfo(error, context || "app");

  if (process.env.NODE_ENV === "development") {
    // Keep local debugging visible while still forwarding structured telemetry.
    console.error("API Error:", errorInfo, error);
  }

  logErrorToService(errorInfo, error);
  return errorInfo;
};

export const ErrorFallback = ({
  error,
  resetError,
  resetErrorBoundary,
}: {
  error?: Error | null;
  resetError?: () => void;
  resetErrorBoundary?: () => void;
}) => {
  const handleReset = resetError ?? resetErrorBoundary;
  const handleGoHome = () => {
    window.location.href = "/";
  };

  return (
    <div className="app-error-fallback" role="alert">
      <h2>Something went wrong</h2>
      <p>The application encountered an unexpected error.</p>

      {process.env.NODE_ENV === "development" ? (
        <details className="app-error-fallback-details">
          <summary>Error Details</summary>
          <pre>{error?.stack}</pre>
        </details>
      ) : null}

      <div className="app-error-fallback-actions">
        <button type="button" onClick={handleReset}>
          Try Again
        </button>

        <button type="button" onClick={handleGoHome}>
          Go Home
        </button>
      </div>
    </div>
  );
};

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    this.setState({ error });
    handleApiError(error, "react.error-boundary");
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <ErrorFallback error={this.state.error} resetError={this.reset} resetErrorBoundary={this.reset} />
        )
      );
    }

    return this.props.children;
  }
}

export const useErrorHandler = () => {
  const toast = useToast();

  const classifyErrorMemo = React.useCallback((error: unknown) => classifyError(error), []);

  const handleError = React.useCallback(
    (error: unknown, context = "") => {
      const errorInfo = handleApiError(error, context);
      toast.error(errorInfo.message);
      return errorInfo;
    },
    [toast],
  );

  const handleAsyncError = React.useCallback(
    async <T,>(fn: () => Promise<T>) => {
      try {
        return await fn();
      } catch (error) {
        handleError(error, "async.operation");
        throw error;
      }
    },
    [handleError],
  );

  return { classifyError: classifyErrorMemo, handleError, handleAsyncError };
};

export const retryWithBackoff = async <T,>(fn: () => Promise<T>, maxRetries = 3, delay = 1000) => {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (
        typeof error === "object" &&
        error != null &&
        "response" in error &&
        typeof (error as { response?: { status?: number } }).response?.status === "number"
      ) {
        const status = (error as { response: { status: number } }).response.status;
        if (status >= 400 && status < 500) {
          break;
        }
      }

      if (attempt === maxRetries) {
        break;
      }

      const backoffDelay = delay * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
    }
  }

  throw lastError;
};

export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = React.useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return { isOnline };
};

export const formatErrorMessage = (error: unknown) => {
  if (!error) return "Unknown error occurred";

  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (
    typeof error === "object" &&
    error != null &&
    "response" in error &&
    typeof (error as { response?: { data?: { message?: string }; statusText?: string } }).response?.data?.message ===
      "string"
  ) {
    return (error as { response: { data: { message: string } } }).response.data.message;
  }
  if (
    typeof error === "object" &&
    error != null &&
    "response" in error &&
    typeof (error as { response?: { statusText?: string } }).response?.statusText === "string"
  ) {
    return (error as { response: { statusText: string } }).response.statusText;
  }

  return "An unexpected error occurred";
};

export const ERROR_RECOVERY = {
  RETRY: "retry",
  REDIRECT: "redirect",
  REFRESH: "refresh",
  IGNORE: "ignore",
} as const;

export const suggestRecovery = (
  errorType: string,
  error?: { response?: { status?: number } },
) => {
  switch (errorType) {
    case ERROR_TYPES.NETWORK:
    case ERROR_TYPES.NETWORK_ERROR:
      return {
        strategy: ERROR_RECOVERY.RETRY,
        message: "Check your internet connection and try again",
        action: "Retry",
      };

    case ERROR_TYPES.TIMEOUT_ERROR:
      return {
        strategy: ERROR_RECOVERY.RETRY,
        message: "Request timed out. Please try again",
        action: "Retry",
      };

    case ERROR_TYPES.AUTH:
    case ERROR_TYPES.AUTHENTICATION_ERROR:
      return {
        strategy: ERROR_RECOVERY.REDIRECT,
        message: "Please log in again",
        action: "Login",
      };

    case ERROR_TYPES.SERVER:
    case ERROR_TYPES.API_ERROR:
      if (error?.response?.status === 401) {
        return {
          strategy: ERROR_RECOVERY.REDIRECT,
          message: "Session expired. Please log in again",
          action: "Login",
        };
      }
      break;

    default:
      return {
        strategy: ERROR_RECOVERY.REFRESH,
        message: "Something went wrong. Try refreshing the page",
        action: "Refresh",
      };
  }

  return {
    strategy: ERROR_RECOVERY.REFRESH,
    message: "An error occurred. Please try again",
    action: "Try Again",
  };
};
