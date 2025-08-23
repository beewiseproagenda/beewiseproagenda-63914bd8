import { useState, useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';

export type DeviceType = 'android' | 'ios' | 'desktop';

interface UseInstallGuideReturn {
  deviceType: DeviceType;
  shouldShowGuide: boolean;
  hasSeenGuide: boolean;
  showGuide: () => void;
  hideGuide: () => void;
  markAsShown: () => void;
  resetGuide: () => void;
}

export const useInstallGuide = (): UseInstallGuideReturn => {
  const [hasSeenGuide, setHasSeenGuide] = useLocalStorage('pwa-install-guide-seen', false);
  const [shouldShowGuide, setShouldShowGuide] = useState(false);
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop');

  // Detect device type
  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isAndroid = /android/.test(userAgent);
    const isIOS = /iphone|ipad|ipod/.test(userAgent);

    if (isAndroid) {
      setDeviceType('android');
    } else if (isIOS) {
      setDeviceType('ios');
    } else {
      setDeviceType('desktop');
    }
  }, []);

  const showGuide = () => setShouldShowGuide(true);
  const hideGuide = () => setShouldShowGuide(false);

  const markAsShown = () => {
    setHasSeenGuide(true);
    setShouldShowGuide(false);
  };

  const resetGuide = () => {
    setHasSeenGuide(false);
  };

  return {
    deviceType,
    shouldShowGuide,
    hasSeenGuide,
    showGuide,
    hideGuide,
    markAsShown,
    resetGuide,
  };
};