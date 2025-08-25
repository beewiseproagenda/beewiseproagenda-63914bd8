import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, data?: any) => {
  console.log(`[create-subscription] ${step}`, data ? JSON.stringify(data, null, 2) : '');
};

interface CreateSubscriptionRequest {
  user_id: string;
  email: string;
  plan_code: 'mensal' | 'anual';
}

serve(async (req) => {
  logStep('Request received', { method: req.method, url: req.url });
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get environment variables with better error handling
    const mpAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN') || Deno.env.get('MP_ACCESS_TOKEN');
    const appUrl = Deno.env.get('APP_URL');

    logStep('Environment check', { 
      mpAccessToken: !!mpAccessToken, 
      appUrl: !!appUrl,
      supabaseUrl: !!supabaseUrl,
      supabaseServiceKey: !!supabaseServiceKey 
    });

    if (!mpAccessToken || !appUrl || !supabaseUrl || !supabaseServiceKey) {
      const missingVars = [];
      if (!mpAccessToken) missingVars.push('MERCADOPAGO_ACCESS_TOKEN or MP_ACCESS_TOKEN');
      if (!appUrl) missingVars.push('APP_URL');
      if (!supabaseUrl) missingVars.push('SUPABASE_URL');
      if (!supabaseServiceKey) missingVars.push('SUPABASE_SERVICE_ROLE_KEY');
      
      logStep('Missing environment variables', { missingVars });
      return new Response(
        JSON.stringify({ 
          error: 'Configuração ausente', 
          details: `Missing variables: ${missingVars.join(', ')}` 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const requestData: CreateSubscriptionRequest = await req.json();
    logStep('Request data parsed', requestData);

    const { user_id, email, plan_code, onboarding_token } = requestData;

    logStep('Request data parsed', { user_id, email, plan_code, has_onboarding_token: !!onboarding_token });

    if (!user_id || !email || !plan_code) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: user_id, email, plan_code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If onboarding_token is provided, validate it (for pre-login flow)
    if (onboarding_token) {
      const { data: tokenValidation, error: tokenError } = await supabase.functions.invoke('validate-onboarding-token', {
        body: { token: onboarding_token }
      });

      if (tokenError || !tokenValidation?.valid) {
        logStep('Invalid onboarding token', { tokenError });
        return new Response(
          JSON.stringify({ error: 'Invalid or expired onboarding token' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      logStep('Onboarding token validated', { userId: tokenValidation.userId });
    }

    // 1. Buscar o plano pelo plan_code
    logStep('Fetching plan', { plan_code });
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('*')
      .eq('code', plan_code)
      .eq('is_active', true)
      .single();

    if (planError || !plan) {
      logStep('Plan not found', { planError, plan_code });
      return new Response(
        JSON.stringify({ error: 'Plan not found or inactive' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logStep('Plan found', plan);

    // 2. Fazer upsert em subscriptions com status='pending'
    const subscriptionData = {
      user_id,
      plan_code,
      status: 'pending',
      started_at: new Date().toISOString(),
    };

    logStep('Upserting subscription', subscriptionData);
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .upsert(subscriptionData, { onConflict: 'user_id,plan_code' })
      .select()
      .single();

    if (subscriptionError) {
      logStep('Subscription upsert failed', subscriptionError);
      throw subscriptionError;
    }

    logStep('Subscription created/updated', subscription);

    // 3. Chamar API do Mercado Pago para criar preapproval
    const externalReference = `${user_id}|${plan_code}|${subscription.id}`;
    const idempotencyKey = `${user_id}-${plan_code}-${Date.now()}`;

    const preapprovalPayload = {
      preapproval_plan_id: plan.mp_preapproval_plan_id,
      payer_email: email,
      back_url: `${appUrl}/assinatura/sucesso`,
      external_reference: externalReference,
      reason: `Assinatura BeeWise Pro - ${plan_code === 'mensal' ? 'Mensal' : 'Anual'}`,
    };

    logStep('Creating preapproval with Mercado Pago', { preapprovalPayload, idempotencyKey });

    const mpResponse = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(preapprovalPayload),
    });

    const mpResponseData = await mpResponse.json();
    logStep('Mercado Pago response', { status: mpResponse.status, data: mpResponseData });

    if (!mpResponse.ok) {
      logStep('Mercado Pago API error', mpResponseData);
      
      // Atualizar subscription com erro
      await supabase
        .from('subscriptions')
        .update({ status: 'rejected' })
        .eq('id', subscription.id);

      return new Response(
        JSON.stringify({ 
          error: 'Failed to create subscription with Mercado Pago',
          details: mpResponseData 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Retornar init_point
    const { init_point } = mpResponseData;
    
    if (!init_point) {
      logStep('No init_point in response', mpResponseData);
      throw new Error('No init_point received from Mercado Pago');
    }

    logStep('Success', { init_point });

    return new Response(
      JSON.stringify({ init_point }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    logStep('Error in create-subscription', error);
    console.error('Error in create-subscription:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});