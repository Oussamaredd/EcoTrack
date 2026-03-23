import React from "react";

type NotificationsFeedContextValue = {
  dismissedNotificationIds: string[];
  highlightedNotificationId: string | null;
  markDismissed: (id: string) => void;
  clearDismissed: () => void;
  setHighlightedNotificationId: (id: string | null) => void;
  isDismissed: (id: string) => boolean;
};

const NotificationsFeedContext = React.createContext<NotificationsFeedContextValue | null>(null);

export function NotificationsFeedProvider({ children }: { children: React.ReactNode }) {
  const [dismissedNotificationIds, setDismissedNotificationIds] = React.useState<string[]>([]);
  const [highlightedNotificationId, setHighlightedNotificationId] = React.useState<string | null>(null);

  const value = React.useMemo<NotificationsFeedContextValue>(
    () => ({
      dismissedNotificationIds,
      highlightedNotificationId,
      markDismissed: (id) =>
        setDismissedNotificationIds((current) =>
          current.includes(id) ? current : [...current, id],
        ),
      clearDismissed: () => setDismissedNotificationIds([]),
      setHighlightedNotificationId,
      isDismissed: (id) => dismissedNotificationIds.includes(id),
    }),
    [dismissedNotificationIds, highlightedNotificationId],
  );

  return (
    <NotificationsFeedContext.Provider value={value}>
      {children}
    </NotificationsFeedContext.Provider>
  );
}

export const useNotificationsFeed = () => {
  const context = React.useContext(NotificationsFeedContext);
  if (!context) {
    throw new Error("useNotificationsFeed must be used within NotificationsFeedProvider.");
  }

  return context;
};
