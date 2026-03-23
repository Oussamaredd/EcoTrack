import { DashboardPreferencesProvider } from "./DashboardPreferencesContext";
import { NotificationsFeedProvider } from "./NotificationsFeedContext";
import { PlanningDraftProvider } from "./PlanningDraftContext";
import { ShellPreferencesProvider } from "./ShellPreferencesContext";

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  return (
    <ShellPreferencesProvider>
      <PlanningDraftProvider>
        <DashboardPreferencesProvider>
          <NotificationsFeedProvider>{children}</NotificationsFeedProvider>
        </DashboardPreferencesProvider>
      </PlanningDraftProvider>
    </ShellPreferencesProvider>
  );
}
