import type { PropsWithChildren } from "react";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PaperProvider } from "react-native-paper";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { initializeMobileErrorTracking } from "@/monitoring/clientTelemetry";
import { MobileSentrySessionBridge } from "@/monitoring/MobileSentrySessionBridge";
import { CitizenMenuProvider } from "@/providers/CitizenMenuProvider";
import { MobileErrorBoundary } from "@/providers/MobileErrorBoundary";
import { NotificationProvider } from "@/providers/NotificationProvider";
import { ReactQueryLifecycleProvider } from "@/providers/ReactQueryLifecycleProvider";
import { SessionProvider } from "@/providers/SessionProvider";
import type { AppTheme } from "@/theme/theme";

type AppProvidersProps = PropsWithChildren<{
  theme: AppTheme;
}>;

export function AppProviders({ children, theme }: AppProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 30_000
          }
        }
      })
  );

  useEffect(() => {
    const disposeErrorTracking = initializeMobileErrorTracking();
    return () => {
      disposeErrorTracking();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ReactQueryLifecycleProvider>
            <SessionProvider>
              <MobileSentrySessionBridge />
              <NotificationProvider>
                <PaperProvider theme={theme}>
                  <MobileErrorBoundary>
                    <CitizenMenuProvider>{children}</CitizenMenuProvider>
                  </MobileErrorBoundary>
                </PaperProvider>
              </NotificationProvider>
            </SessionProvider>
          </ReactQueryLifecycleProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
