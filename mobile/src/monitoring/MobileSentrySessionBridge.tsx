import { useEffect } from "react";

import { useSession } from "@/providers/SessionProvider";

import { syncMobileSentryUser } from "./sentry";

export function MobileSentrySessionBridge() {
  const { user, authState } = useSession();

  useEffect(() => {
    if (authState !== "authenticated" || !user) {
      syncMobileSentryUser(null);
      return;
    }

    syncMobileSentryUser({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      provider: user.provider,
    });
  }, [authState, user]);

  return null;
}

