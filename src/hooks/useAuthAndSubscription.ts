import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import { FREEMIUM_MODE } from '@/config/freemium';

type SubStatus = { 
  active: boolean; 
  plan?: 'mensal' | 'anual' | null;
  status?: string;
};

type TrialInfo = {
  startedAt: string | null;
  expiresAt: string | null;
  daysLeft: number;
  expired: boolean;
};

export function useAuthAndSubscription() {
  const { data: sessionData, isLoading: sessionLoading } = useQuery({
    queryKey: ['session'],
    queryFn: () => supabase.auth.getSession(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const user = sessionData?.data?.session?.user ?? null;

  const { data: profileData, isLoading: profileLoading } = useQuery<{sub: SubStatus, trial: TrialInfo, subscriptionStatus: string}>({
    queryKey: ['profile-full', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      // Get profile with trial and subscription data
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_active, subscription_status, trial_started_at, trial_expires_at, trial_days')
        .eq('user_id', user!.id)
        .maybeSingle();

      // Calculate trial information
      const now = new Date();
      const trialStarted = profile?.trial_started_at ? new Date(profile.trial_started_at) : null;
      const trialExpires = profile?.trial_expires_at ? new Date(profile.trial_expires_at) : null;
      const trialDays = profile?.trial_days || 7;
      
      let daysLeft = 0;
      let expired = true;
      
      if (trialExpires) {
        const diffMs = trialExpires.getTime() - now.getTime();
        daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        expired = diffMs <= 0;
      }

      const trial: TrialInfo = {
        startedAt: trialStarted?.toISOString() || null,
        expiresAt: trialExpires?.toISOString() || null,
        daysLeft: daysLeft,
        expired: expired
      };

      const subscriptionStatus = profile?.subscription_status || 'none';
      
      // Check if subscription is active
      if (profile?.subscription_active || subscriptionStatus === 'active') {
        return { 
          sub: { 
            active: true, 
            plan: 'mensal' as 'mensal' | 'anual',
            status: 'active' 
          },
          trial,
          subscriptionStatus: 'active'
        };
      }

      // Fallback to subscriptions table check
      const subscriptionsResult = await supabase
        .from('subscriptions')
        .select('status, plan_code, cancelled_at, next_charge_at')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subscriptionsResult.data) {
        const newSub = subscriptionsResult.data;
        const isActive = newSub.status === 'active' && 
                        !newSub.cancelled_at &&
                        (!newSub.next_charge_at || new Date(newSub.next_charge_at) > new Date());
        
        return { 
          sub: { 
            active: isActive, 
            plan: newSub.plan_code as 'mensal' | 'anual',
            status: newSub.status 
          },
          trial,
          subscriptionStatus: isActive ? 'active' : newSub.status
        };
      }

      return { 
        sub: { active: false, plan: null, status: 'none' },
        trial,
        subscriptionStatus: 'none'
      };
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  // Setup auth state listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      // Invalidate queries on auth state change
      setTimeout(() => {
        supabase.auth.getSession().then(() => {
          // This will trigger query refetch
        });
      }, 0);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Tri-state: loading or ready
  const status = sessionLoading || (!!user && profileLoading) ? 'loading' : 'ready';

  return useMemo(() => ({ 
    loading: status === 'loading',
    user,
    // FREEMIUM MODE: Force active subscription for all authenticated users
    subscriptionStatus: FREEMIUM_MODE && user ? 'active' : (profileData?.subscriptionStatus || 'none'),
    trial: FREEMIUM_MODE && user 
      ? { startedAt: null, expiresAt: null, daysLeft: 999, expired: false }
      : (profileData?.trial || { startedAt: null, expiresAt: null, daysLeft: 0, expired: true }),
    // Legacy compatibility
    status,
    isAuthenticated: !!user,
    hasActive: FREEMIUM_MODE && user ? true : (profileData?.sub?.active ?? false),
    subscription: FREEMIUM_MODE && user 
      ? { active: true, plan: 'freemium', status: 'active' }
      : (profileData?.sub ?? { active: false, plan: null, status: 'none' })
  }), [status, user, profileData, sessionLoading, profileLoading]);
}