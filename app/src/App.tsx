import React, { Suspense, lazy } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./hooks/useAuth";
import { ToastProvider } from "./context/ToastContext";
import { ErrorHandlingSetup } from "./components/ErrorHandlingSetup";
import { SentryScopeBridge } from "./monitoring/SentryScopeBridge";
import AppRouter from "./routes/AppRouter";
import { AppStateProvider } from "./state/AppStateProvider";

const InstallAppBanner = lazy(() => import("./components/InstallAppBanner"));
const INSTALL_BANNER_DELAY_MS = 5000;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function DeferredInstallAppBanner() {
  const [isReady, setIsReady] = React.useState(false);

  React.useEffect(() => {
    const timeoutId = globalThis.setTimeout(() => setIsReady(true), INSTALL_BANNER_DELAY_MS);
    return () => globalThis.clearTimeout(timeoutId);
  }, []);

  if (!isReady) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <InstallAppBanner />
    </Suspense>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppStateProvider>
          <ToastProvider>
            <SentryScopeBridge />
            <DeferredInstallAppBanner />
            <ErrorHandlingSetup>
              <AppRouter />
            </ErrorHandlingSetup>
          </ToastProvider>
        </AppStateProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
