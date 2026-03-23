import { useEffect } from "react";

import { useAuth } from "@/hooks/useAuth";

export function SentryScopeBridge() {
  const { user, authState } = useAuth();

  useEffect(() => {
    if (authState !== "authenticated" || !user) {
      void import("./sentry").then(({ syncWebSentryUser }) => {
        syncWebSentryUser(null);
      });
      return;
    }

    void import("./sentry").then(({ syncWebSentryUser }) => {
      syncWebSentryUser({
        id: user.id,
        email: user.email,
        displayName: user.displayName ?? user.name ?? null,
        role: user.role,
        provider: user.provider,
      });
    });
  }, [authState, user]);

  return null;
}
