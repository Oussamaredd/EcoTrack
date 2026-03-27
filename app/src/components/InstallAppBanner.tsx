import React from 'react';

import { useInstallPrompt } from '../hooks/useInstallPrompt';

export default function InstallAppBanner() {
  const { canInstall, dismiss, install } = useInstallPrompt();
  const [isInstalling, setIsInstalling] = React.useState(false);

  if (!canInstall) {
    return null;
  }

  const handleInstall = async () => {
    try {
      setIsInstalling(true);
      await install();
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <div className="app-install-banner" role="status" aria-live="polite">
      <div className="app-install-banner-copy">
        <strong>Install EcoTrack</strong>
        <span>Pin the workspace for faster launches and offline access to cached tours and maps.</span>
      </div>
      <div className="app-install-banner-actions">
        <button type="button" className="app-install-banner-dismiss" onClick={dismiss}>
          Not now
        </button>
        <button type="button" className="app-install-banner-accept" onClick={handleInstall} disabled={isInstalling}>
          {isInstalling ? 'Preparing...' : 'Install app'}
        </button>
      </div>
    </div>
  );
}
