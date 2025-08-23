import { useState, useEffect } from 'react';
import { useProfile } from './useProfile';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

export type DeviceType = 'android' | 'ios' | 'desktop';

interface UseInstallGuideReturn {
  deviceType: DeviceType;
  shouldShowGuide: boolean;
  showGuide: () => void;
  hideGuide: () => void;
  markAsShownInSession: () => void;
  disablePermanently: () => Promise<void>;
  resetGuide: () => void;
  isDisabledPermanently: boolean;
  hasSeenInSession: boolean;
}

const SESSION_KEY = 'pwa-guide-shown-in-session';

export const useInstallGuide = (): UseInstallGuideReturn => {
  const [shouldShowGuide, setShouldShowGuide] = useState(false);
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop');
  const { profile, refetch } = useProfile();
  const { user } = useAuth();
  
  const isDisabledPermanently = (profile as any)?.pwa_install_guide_disabled || false;
  
  // Check if guide was shown in current session
  const hasSeenInSession = sessionStorage.getItem(SESSION_KEY) === 'true';

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

  // Reset session storage when user changes (login/logout)
  useEffect(() => {
    if (user) {
      // User logged in, reset session for this user
      const currentUserId = sessionStorage.getItem('current-user-id');
      if (currentUserId !== user.id) {
        sessionStorage.removeItem(SESSION_KEY);
        sessionStorage.setItem('current-user-id', user.id);
      }
    } else {
      // User logged out, clear session data
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem('current-user-id');
    }
  }, [user]);

  const showGuide = () => setShouldShowGuide(true);
  const hideGuide = () => setShouldShowGuide(false);

  const markAsShownInSession = () => {
    sessionStorage.setItem(SESSION_KEY, 'true');
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
    sessionStorage.removeItem(SESSION_KEY);
  };

  return {
    deviceType,
    shouldShowGuide,
    showGuide,
    hideGuide,
    markAsShownInSession,
    disablePermanently,
    resetGuide,
    isDisabledPermanently,
    hasSeenInSession,
  };
};