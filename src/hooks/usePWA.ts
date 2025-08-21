import React, { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAInstallState {
  isInstallable: boolean;
  isInstalled: boolean;
  isStandalone: boolean;
  isIOS: boolean;
  showIOSInstructions: boolean;
  deferredPrompt: BeforeInstallPromptEvent | null;
}

export const usePWA = () => {
  const [installState, setInstallState] = useState<PWAInstallState>({
    isInstallable: false,
    isInstalled: false,
    isStandalone: false,
    isIOS: false,
    showIOSInstructions: false,
    deferredPrompt: null
  });

  useEffect(() => {
    // Check if running in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                         (window.navigator as any).standalone === true;

    // Check if iOS device
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

    // Check if app is already installed
    const isInstalled = isStandalone;

    setInstallState(prev => ({
      ...prev,
      isStandalone,
      isIOS,
      isInstalled
    }));

    // Listen for beforeinstallprompt event (Android/Chrome)
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setInstallState(prev => ({
        ...prev,
        isInstallable: true,
        deferredPrompt: e
      }));
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setInstallState(prev => ({
        ...prev,
        isInstalled: true,
        isInstallable: false,
        deferredPrompt: null
      }));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installApp = async (): Promise<boolean> => {
    const { deferredPrompt } = installState;

    if (!deferredPrompt) {
      return false;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      setInstallState(prev => ({
        ...prev,
        deferredPrompt: null,
        isInstallable: false
      }));

      return outcome === 'accepted';
    } catch (error) {
      console.error('Error installing PWA:', error);
      return false;
    }
  };

  const showIOSInstructionsModal = () => {
    setInstallState(prev => ({
      ...prev,
      showIOSInstructions: true
    }));
  };

  const hideIOSInstructions = () => {
    setInstallState(prev => ({
      ...prev,
      showIOSInstructions: false
    }));
  };

  const registerServiceWorker = async (): Promise<boolean> => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered successfully:', registration);
        return true;
      } catch (error) {
        console.error('Service Worker registration failed:', error);
        return false;
      }
    }
    return false;
  };

  return {
    ...installState,
    installApp,
    showIOSInstructionsModal,
    hideIOSInstructions,
    registerServiceWorker
  };
};