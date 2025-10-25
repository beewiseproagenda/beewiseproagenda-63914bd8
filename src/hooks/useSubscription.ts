
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Plan {
  id: string;
  code: 'mensal' | 'anual';
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
  status: 'pending' | 'active' | 'paused' | 'cancelled' | 'expired';
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
      
      // Verificar na tabela subscriptions
      const { data: subscriptionsData, error: subscriptionsError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (subscriptionsError) {
        console.error('[useSubscription] Erro ao buscar subscriptions:', subscriptionsError);
      }

      // Pegar a assinatura mais recente
      let subscription = null;
      if (subscriptionsData?.[0]) {
        subscription = {
          ...subscriptionsData[0],
          plan_code: subscriptionsData[0].plan_code as 'mensal' | 'anual',
          status: subscriptionsData[0].status as 'pending' | 'active' | 'paused' | 'cancelled' | 'expired'
        };
      }
      
      console.log('[useSubscription] Resultado da busca:', {
        hasSubscription: !!subscription,
        status: subscription?.status,
        isActive: subscription?.status === 'active',
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

    // Verificar se já tem assinatura ativa antes de criar nova
    await fetchCurrentSubscription();
    if (currentSubscription?.status === 'active') {
      throw new Error('Você já possui uma assinatura ativa');
    }

    // Sistema de pagamento manual - não há criação automática
    throw new Error('Sistema de assinatura em modo manual. Entre em contato para ativar sua assinatura.');
  };

  const cancelSubscription = async () => {
    if (!currentSubscription) {
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
      case 'active':
        return 'Assinatura ativa ✅';
      case 'pending':
        return 'Processando...';
      case 'paused':
        return 'Assinatura pausada ⏸️';
      case 'cancelled':
        return 'Assinatura cancelada ❌';
      case 'expired':
        return 'Assinatura expirada ❌';
      default:
        return 'Status desconhecido';
    }
  };

  const isActiveSubscription = currentSubscription?.status === 'active';

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
