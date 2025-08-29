
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Plan {
  id: string;
  code: 'mensal' | 'anual';
  mp_preapproval_plan_id: string;
  price_cents: number;
  interval: 'month' | 'year';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_code: 'mensal' | 'anual';
  mp_preapproval_id: string | null;
  status: 'pending' | 'authorized' | 'paused' | 'cancelled' | 'rejected';
  next_charge_at: string | null;
  started_at: string;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export const useSubscription = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchPlans();
    if (user) {
      fetchCurrentSubscription();
    } else {
      setLoading(false);
      setCurrentSubscription(null);
    }
  }, [user]);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('is_active', true)
        .order('price_cents', { ascending: true });

      if (error) throw error;
      setPlans(data?.map(plan => ({
        ...plan,
        code: plan.code as 'mensal' | 'anual',
        interval: plan.interval as 'month' | 'year'
      })) || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
    }
  };

  const fetchCurrentSubscription = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('[useSubscription] Buscando assinatura para usuário:', user.id, user.email);
      
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('[useSubscription] Erro ao buscar assinatura:', error);
        throw error;
      }
      
      const subscription = data?.[0] ? {
        ...data[0],
        plan_code: data[0].plan_code as 'mensal' | 'anual',
        status: data[0].status as 'pending' | 'authorized' | 'paused' | 'cancelled' | 'rejected'
      } : null;
      
      console.log('[useSubscription] Resultado da busca:', {
        hasSubscription: !!subscription,
        status: subscription?.status,
        isActive: subscription?.status === 'authorized',
        subscriptionData: subscription
      });
      
      setCurrentSubscription(subscription);
    } catch (error) {
      console.error('[useSubscription] Error fetching subscription:', error);
      setCurrentSubscription(null);
    } finally {
      setLoading(false);
    }
  };

  const createSubscription = async (planCode: 'mensal' | 'anual') => {
    if (!user) throw new Error('User not authenticated');

    try {
      const response = await supabase.functions.invoke('create-subscription', {
        body: {
          user_id: user.id,
          email: user.email,
          plan_code: planCode,
        },
      });

      if (response.error) {
        throw response.error;
      }

      return response.data;
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw error;
    }
  };

  const cancelSubscription = async () => {
    if (!currentSubscription?.mp_preapproval_id) {
      throw new Error('No active subscription to cancel');
    }

    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ 
          status: 'cancelled',
          cancelled_at: new Date().toISOString()
        })
        .eq('id', currentSubscription.id);

      if (error) throw error;
      
      await fetchCurrentSubscription();
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      throw error;
    }
  };

  const formatPrice = (priceCents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(priceCents / 100);
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'authorized':
        return 'Assinatura ativa ✅';
      case 'pending':
        return 'Processando...';
      case 'paused':
        return 'Assinatura pausada ⏸️';
      case 'cancelled':
        return 'Assinatura cancelada ❌';
      case 'rejected':
        return 'Assinatura rejeitada ❌';
      default:
        return 'Status desconhecido';
    }
  };

  const isActiveSubscription = currentSubscription?.status === 'authorized';

  console.log('[useSubscription] Hook state:', {
    loading,
    hasSubscription: !!currentSubscription,
    subscriptionStatus: currentSubscription?.status,
    isActiveSubscription,
    userEmail: user?.email
  });

  return {
    plans,
    currentSubscription,
    loading,
    createSubscription,
    cancelSubscription,
    formatPrice,
    getStatusText,
    isActiveSubscription,
    refetch: fetchCurrentSubscription,
  };
};
