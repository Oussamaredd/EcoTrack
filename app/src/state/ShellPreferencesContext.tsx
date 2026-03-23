import React from "react";

const SIDEBAR_COLLAPSED_STORAGE_KEY = "ecotrack.sidebar.collapsed";

type ShellPreferencesContextValue = {
  isSidebarCollapsed: boolean;
  isMobileSidebarOpen: boolean;
  setSidebarCollapsed: (value: boolean) => void;
  toggleSidebarCollapsed: () => void;
  setMobileSidebarOpen: (value: boolean) => void;
  toggleMobileSidebar: () => void;
  closeMobileSidebar: () => void;
};

const ShellPreferencesContext = React.createContext<ShellPreferencesContextValue | null>(null);

const readCollapsedPreference = () => {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "1";
};

export function ShellPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [isSidebarCollapsed, setSidebarCollapsed] = React.useState<boolean>(() =>
    readCollapsedPreference(),
  );
  const [isMobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      SIDEBAR_COLLAPSED_STORAGE_KEY,
      isSidebarCollapsed ? "1" : "0",
    );
  }, [isSidebarCollapsed]);

  const value = React.useMemo<ShellPreferencesContextValue>(
    () => ({
      isSidebarCollapsed,
      isMobileSidebarOpen,
      setSidebarCollapsed,
      toggleSidebarCollapsed: () => setSidebarCollapsed((current) => !current),
      setMobileSidebarOpen,
      toggleMobileSidebar: () => setMobileSidebarOpen((current) => !current),
      closeMobileSidebar: () => setMobileSidebarOpen(false),
    }),
    [isMobileSidebarOpen, isSidebarCollapsed],
  );

  return (
    <ShellPreferencesContext.Provider value={value}>
      {children}
    </ShellPreferencesContext.Provider>
  );
}

export const useShellPreferences = () => {
  const context = React.useContext(ShellPreferencesContext);
  if (!context) {
    throw new Error("useShellPreferences must be used within ShellPreferencesProvider.");
  }

  return context;
};
