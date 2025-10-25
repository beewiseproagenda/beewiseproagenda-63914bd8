import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export const usePWA = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [swVersion, setSwVersion] = useState<string>('');

  useEffect(() => {
    // Check if app is already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isInWebApp = (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone || isInWebApp);

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    // [BW][PWA_UPDATE] Listen for SW updates
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SW_UPDATED') {
        console.log('[BW][PWA_UPDATE] New SW version detected:', event.data.version);
        setSwVersion(event.data.version);
        setUpdateAvailable(true);
        
        // Auto-reload após 2 segundos
        setTimeout(() => {
          console.log('[BW][PWA_UPDATE] Reloading to apply update');
          window.location.reload();
        }, 2000);
      }
    };

    // [BW][PWA_UPDATE] Detect controller change (novo SW assumiu controle)
    const handleControllerChange = () => {
      console.log('[BW][PWA_UPDATE] Controller changed, reloading');
      window.location.reload();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    navigator.serviceWorker?.addEventListener('message', handleSWMessage);
    navigator.serviceWorker?.addEventListener('controllerchange', handleControllerChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
      navigator.serviceWorker?.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) return false;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setIsInstallable(false);
        setDeferredPrompt(null);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error installing PWA:', error);
      return false;
    }
  };

  const registerServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('[BW][PWA_UPDATE] SW registered:', registration);
        
        // Check for updates immediately
        await registration.update();
        
        // Check for updates on updatefound
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('[BW][PWA_UPDATE] Update found, new worker installing');
          
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              console.log('[BW][PWA_UPDATE] New worker state:', newWorker.state);
              
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[BW][PWA_UPDATE] New version installed, will activate');
                setUpdateAvailable(true);
                
                // Ativar imediatamente o novo SW
                newWorker.postMessage({ type: 'SKIP_WAITING' });
              }
            });
          }
        });

        return registration;
      } catch (error) {
        console.error('[BW][PWA_UPDATE] SW registration failed:', error);
        return null;
      }
    }
    return null;
  };

  const checkForUpdates = async () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      try {
        console.log('[BW][PWA_UPDATE] Checking for updates');
        const registration = await navigator.serviceWorker.getRegistration();
        await registration?.update();
      } catch (error) {
        console.error('[BW][PWA_UPDATE] Error checking for updates:', error);
      }
    }
  };

  // [BW][PWA_UPDATE] Check for updates quando o app volta ao foco
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[BW][PWA_UPDATE] App focused, checking for updates');
        checkForUpdates();
      }
    };

    const handleFocus = () => {
      console.log('[BW][PWA_UPDATE] Window focused, checking for updates');
      checkForUpdates();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  return {
    isInstallable,
    isInstalled,
    isOnline,
    installApp,
    registerServiceWorker,
    checkForUpdates,
    updateAvailable,
    swVersion,
  };
};