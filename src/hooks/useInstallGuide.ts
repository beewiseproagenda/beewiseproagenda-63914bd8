import { useState, useEffect } from 'react';
import { useProfile } from './useProfile';
import { supabase } from '@/integrations/supabase/client';

export type DeviceType = 'android' | 'ios' | 'desktop';

interface UseInstallGuideReturn {
  deviceType: DeviceType;
  shouldShowGuide: boolean;
  hasSeenInSession: boolean;
  showGuide: () => void;
  hideGuide: () => void;
  markAsShownInSession: () => void;
  disablePermanently: () => Promise<void>;
  resetGuide: () => void;
  isDisabledPermanently: boolean;
}

export const useInstallGuide = (): UseInstallGuideReturn => {
  const [hasSeenInSession, setHasSeenInSession] = useState(false);
  const [shouldShowGuide, setShouldShowGuide] = useState(false);
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop');
  const { profile, refetch } = useProfile();
  
  const isDisabledPermanently = (profile as any)?.pwa_install_guide_disabled || false;

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

  const markAsShownInSession = () => {
    setHasSeenInSession(true);
    setShouldShowGuide(false);
  };

  const disablePermanently = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ pwa_install_guide_disabled: true })
        .eq('user_id', profile?.user_id);
      
      if (error) throw error;
      
      // Refetch profile to update local data
      await refetch();
      
      setShouldShowGuide(false);
    } catch (error) {
      console.error('Error disabling PWA install guide:', error);
    }
  };

  const resetGuide = () => {
    setHasSeenInSession(false);
  };

  return {
    deviceType,
    shouldShowGuide,
    hasSeenInSession,
    showGuide,
    hideGuide,
    markAsShownInSession,
    disablePermanently,
    resetGuide,
    isDisabledPermanently,
  };
};