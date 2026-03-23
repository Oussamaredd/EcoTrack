import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./hooks/useAuth";
import { ToastProvider } from "./context/ToastContext";
import { ErrorHandlingSetup } from "./components/ErrorHandlingSetup";
import { SentryScopeBridge } from "./monitoring/SentryScopeBridge";
import AppRouter from "./routes/AppRouter";
import { AppStateProvider } from "./state/AppStateProvider";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppStateProvider>
          <ToastProvider>
            <SentryScopeBridge />
            <ErrorHandlingSetup>
              <AppRouter />
            </ErrorHandlingSetup>
          </ToastProvider>
        </AppStateProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
