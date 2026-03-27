import React from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
};

const INSTALL_BANNER_DISMISSED_KEY = 'ecotrack-install-banner-dismissed';

const readDismissedState = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.sessionStorage.getItem(INSTALL_BANNER_DISMISSED_KEY) === 'true';
};

const isStandaloneDisplayMode = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
};

export const useInstallPrompt = () => {
  const [installEvent, setInstallEvent] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = React.useState<boolean>(() => isStandaloneDisplayMode());
  const [isDismissed, setIsDismissed] = React.useState<boolean>(() => readDismissedState());

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      const promptEvent = event as BeforeInstallPromptEvent;
      promptEvent.preventDefault();
      setInstallEvent(promptEvent);
    };

    const handleInstalled = () => {
      window.sessionStorage.removeItem(INSTALL_BANNER_DISMISSED_KEY);
      setInstallEvent(null);
      setIsDismissed(false);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const dismiss = React.useCallback(() => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(INSTALL_BANNER_DISMISSED_KEY, 'true');
    }

    setIsDismissed(true);
  }, []);

  const install = React.useCallback(async () => {
    if (!installEvent) {
      return null;
    }

    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    setInstallEvent(null);

    if (choice.outcome === 'accepted' && typeof window !== 'undefined') {
      window.sessionStorage.removeItem(INSTALL_BANNER_DISMISSED_KEY);
      setIsDismissed(false);
    }

    return choice;
  }, [installEvent]);

  return {
    canInstall: Boolean(installEvent) && !isDismissed && !isInstalled,
    dismiss,
    install,
  };
};
