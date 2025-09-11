
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
      // garantir sessão válida
      try { await supabase.auth.refreshSession(); } catch {}
      const { data: s } = await supabase.auth.getSession();
      const token = s?.session?.access_token;
      const email = s?.session?.user?.email;

      if (!token || !email) {
        throw new Error('Faça login para assinar');
      }

      console.log('[createSubscription] token_present=true, plan=', planCode);
      
      const planValue = planCode === 'mensal' ? 'monthly' : 'annual';
      const EDGE = 'https://obdwvgxxunkomacbifry.supabase.co/functions/v1';

      const resp = await fetch(`${EDGE}/create-subscription`, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ plan: planValue, userEmail: email })
      });

      const response = {
        data: null,
        error: null
      };

      if (!resp.ok) {
        const json = await resp.json().catch(() => ({}));
        response.error = {
          message: `Falha: status=${resp.status} code=${json?.code||''} msg=${json?.message||json?.detail||'erro desconhecido'}`
        };
      } else {
        response.data = await resp.json().catch(() => ({}));
      }

      console.log('[createSubscription] Response received:', { 
        hasError: !!response.error,
        hasData: !!response.data,
        errorMessage: response.error?.message 
      });

      if (response.error) {
        console.error('[createSubscription] Edge function error:', response.error);
        throw new Error(`Failed to create subscription: ${response.error.message}`);
      }

      return response.data;
    } catch (error) {
      console.error('[createSubscription] Network/client error:', error);
      
      // Enhanced error handling
      if (error.message?.includes('Failed to fetch')) {
        throw new Error('Network error: Unable to connect to server. Please check your internet connection.');
      } else if (error.message?.includes('Failed to send a request')) {
        throw new Error('Request failed: The server is not responding. Please try again later.');
      }
      
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
