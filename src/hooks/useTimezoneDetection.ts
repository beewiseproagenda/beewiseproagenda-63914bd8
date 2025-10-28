import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface TimezoneInfo {
  timeZone: string;
  offsetMinutes: number;
}

export function useTimezoneDetection() {
  const { user } = useAuth();
  const [timezoneInfo, setTimezoneInfo] = useState<TimezoneInfo>({
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo',
    offsetMinutes: -new Date().getTimezoneOffset()
  });

  useEffect(() => {
    if (!user) return;

    const detectAndSave = async () => {
      try {
        const detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo';
        const offsetMinutes = -new Date().getTimezoneOffset();

        console.log('[BW][TZ] Detected timezone:', { timeZone: detectedTz, offsetMinutes });

        setTimezoneInfo({ timeZone: detectedTz, offsetMinutes });

        // Save to profile
        const { error } = await supabase
          .from('profiles')
          .update({ tz: detectedTz })
          .eq('user_id', user.id);

        if (error) {
          console.error('[BW][TZ] Error saving timezone:', error);
        } else {
          console.log('[BW][TZ] Timezone saved to profile');
        }
      } catch (err) {
        console.error('[BW][TZ] Error detecting timezone:', err);
      }
    };

    detectAndSave();
  }, [user]);

  return timezoneInfo;
}
