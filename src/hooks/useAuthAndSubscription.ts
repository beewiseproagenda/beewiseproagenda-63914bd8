import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

type SubStatus = { 
  active: boolean; 
  plan?: 'mensal' | 'anual' | null;
  status?: string;
};

export function useAuthAndSubscription() {
  const { data: sessionData, isLoading: sessionLoading } = useQuery({
    queryKey: ['session'],
    queryFn: () => supabase.auth.getSession(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const user = sessionData?.data?.session?.user ?? null;

  const { data: sub, isLoading: subLoading } = useQuery<SubStatus>({
    queryKey: ['subscription', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      // First check new subscriptions table
      const { data: newSub } = await supabase
        .from('subscriptions')
        .select('status, plan_code, cancelled_at, next_charge_at')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (newSub) {
        const isActive = newSub.status === 'active' && 
                        !newSub.cancelled_at &&
                        (!newSub.next_charge_at || new Date(newSub.next_charge_at) > new Date());
        
        return { 
          active: isActive, 
          plan: newSub.plan_code as 'mensal' | 'anual',
          status: newSub.status 
        };
      }

      // Fallback to legacy subscribers table
      const { data: legacySub } = await supabase
        .from('subscribers')
        .select('subscribed, subscription_tier, subscription_end')
        .or(`user_id.eq.${user!.id},email.eq.${user!.email}`)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (legacySub) {
        const isActive = legacySub.subscribed &&
                        (!legacySub.subscription_end || new Date(legacySub.subscription_end) > new Date());
        
        return { 
          active: isActive, 
          plan: legacySub.subscription_tier as 'mensal' | 'anual',
          status: legacySub.subscribed ? 'active' : 'inactive'
        };
      }

      return { active: false, plan: null, status: 'none' };
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

  // Tri-state loading: only loading if we have user but subscription is loading
  const loading = sessionLoading || (!!user && subLoading);

  return useMemo(() => ({ 
    user, 
    loading, 
    subscription: sub ?? { active: false, plan: null, status: 'none' }
  }), [user, loading, sub]);
}