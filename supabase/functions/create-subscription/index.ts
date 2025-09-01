import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { requireAuth, corsHeaders, handleCors, logSafely } from '../_shared/auth.ts';

interface CreateSubscriptionRequest {
  user_id: string;
  email: string;
  plan_code: 'mensal' | 'anual';
}

serve(async (req) => {
  logSafely('Request received', { method: req.method });
  
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

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

    // SECURITY: Require authentication for all subscription operations
    const authResult = await requireAuth(req);
    if (!authResult) {
      logSafely('Authentication failed');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Valid authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get environment variables with better error handling
    const mpAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN') || Deno.env.get('MP_ACCESS_TOKEN');
    const appUrl = Deno.env.get('APP_URL');

    logSafely('Environment check', { 
      mpAccessToken: !!mpAccessToken, 
      appUrl: !!appUrl,
      authenticatedUser: true
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
    logSafely('Request data parsed', { plan_code: requestData.plan_code });

    let { user_id, email, plan_code, onboarding_token } = requestData;

    // SECURITY: Enforce user can only create subscriptions for themselves
    if (user_id && user_id !== authResult.userId) {
      logSafely('Authorization failed - user mismatch');
      return new Response(
        JSON.stringify({ error: 'Forbidden - Can only create subscriptions for yourself' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use authenticated user's data as source of truth
    user_id = authResult.userId;
    email = authResult.email;

    logSafely('Request validated', { plan_code, has_onboarding_token: !!onboarding_token });

    // If onboarding_token is provided, validate it and get real user_id (for pre-login flow)
    if (onboarding_token) {
      const { data: tokenValidation, error: tokenError } = await supabase.functions.invoke('validate-onboarding-token', {
        body: { token: onboarding_token }
      });

      if (tokenError || !tokenValidation?.valid) {
        logSafely('Invalid onboarding token', { error_code: 'INVALID_TOKEN' });
        return new Response(
          JSON.stringify({ error: 'Invalid or expired onboarding token' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      logSafely('Onboarding token validated');
      
      // For onboarding flow, we need to find the real user_id by email
      // since the token might have "temp" as user_id initially
      const { data: authUser, error: userError } = await supabase.auth.admin.listUsers();
      
      if (userError) {
        logSafely('Error fetching users', { error_code: 'USER_FETCH_ERROR' });
        throw new Error('Failed to validate user');
      }
      
      const foundUser = authUser.users.find(u => u.email === email);
      if (!foundUser) {
        logSafely('User not found by email', { error_code: 'USER_NOT_FOUND' });
        throw new Error('User not found');
      }
      
      user_id = foundUser.id;
      logSafely('Real user_id found');
    }

    if (!user_id || !email || !plan_code) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: user_id, email, plan_code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Buscar o plano pelo plan_code - SECURITY: Only return whitelisted fields
    logSafely('Fetching plan', { plan_code });
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('id, code, price_cents, interval')
      .eq('code', plan_code)
      .eq('is_active', true)
      .single();

    if (planError || !plan) {
      logSafely('Plan not found', { error_code: 'PLAN_NOT_FOUND', plan_code });
      return new Response(
        JSON.stringify({ error: 'Plan not found or inactive' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logSafely('Plan found', { plan_code: plan.code, interval: plan.interval });

    // 2. SECURITY: Check if user already has active subscription to prevent abuse
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('user_id', user_id)
      .in('status', ['authorized', 'active'])
      .single();

    if (existingSubscription) {
      logSafely('User already has active subscription', { status: existingSubscription.status });
      return new Response(
        JSON.stringify({ error: 'User already has an active subscription' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Fazer upsert em subscriptions com status='pending'
    const subscriptionData = {
      user_id,
      plan_code,
      status: 'pending',
      started_at: new Date().toISOString(),
    };

    logSafely('Upserting subscription', { plan_code, status: 'pending' });
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .upsert(subscriptionData, { onConflict: 'user_id' })
      .select('id, user_id, plan_code, status')
      .single();

    if (subscriptionError) {
      logSafely('Subscription upsert failed', { error_code: 'SUBSCRIPTION_ERROR' });
      throw subscriptionError;
    }

    logSafely('Subscription created/updated', { subscription_id: subscription.id });

    // 4. Chamar API do Mercado Pago para criar preapproval
    const externalReference = `${user_id}|${plan_code}|${subscription.id}`;
    const idempotencyKey = `${user_id}-${plan_code}-${Date.now()}`;

    // SECURITY: Build safe payload with validated data
    const preapprovalPayload = {
      reason: `Assinatura BeeWise Pro - ${plan_code === 'mensal' ? 'Mensal' : 'Anual'}`,
      payer_email: email,
      back_url: `${appUrl}/assinatura/sucesso`,
      external_reference: externalReference,
      auto_recurring: {
        frequency: plan_code === 'mensal' ? 1 : 12,
        frequency_type: 'months',
        transaction_amount: plan.price_cents / 100, // Convert cents to reais
        currency_id: 'BRL'
      },
      notification_url: `${appUrl}/functions/v1/mercadopago-webhook`
    };

    logSafely('Creating preapproval with Mercado Pago', { 
      external_reference: externalReference,
      plan_code,
      amount: plan.price_cents / 100,
      endpoint: 'https://api.mercadopago.com/preapproval' 
    });

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
    
    // SECURITY: Safe logging without exposing sensitive data
    logSafely('Mercado Pago response', { 
      status: mpResponse.status, 
      statusText: mpResponse.statusText,
      has_init_point: !!mpResponseData.init_point,
      external_reference: externalReference
    });

    if (!mpResponse.ok) {
      logSafely('Mercado Pago API error', {
        status: mpResponse.status,
        statusText: mpResponse.statusText,
        external_reference: externalReference,
        error_code: `MP_${mpResponse.status}`
      });
      
      // Atualizar subscription com erro
      await supabase
        .from('subscriptions')
        .update({ status: 'rejected' })
        .eq('id', subscription.id);

      // SECURITY: Return safe error messages without exposing sensitive data
      if (mpResponse.status === 401) {
        logSafely('Authentication error with Mercado Pago', { error_code: 'MP_AUTH_ERROR' });
        return new Response(
          JSON.stringify({ 
            error: 'Erro de autenticação com Mercado Pago. Verifique as credenciais.',
            code: 'MP_AUTH_ERROR'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (mpResponse.status === 400) {
        logSafely('Bad request to Mercado Pago', { error_code: 'MP_VALIDATION_ERROR' });
        return new Response(
          JSON.stringify({ 
            error: 'Dados inválidos para o Mercado Pago.',
            code: 'MP_VALIDATION_ERROR'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          error: `Erro na API do Mercado Pago (${mpResponse.status})`,
          status: mpResponse.status,
          code: 'MP_API_ERROR'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. SECURITY: Return only whitelisted response data
    const { init_point } = mpResponseData;
    
    if (!init_point) {
      logSafely('No init_point in response', { error_code: 'NO_INIT_POINT' });
      throw new Error('No init_point received from Mercado Pago');
    }

    logSafely('Success', { has_init_point: true, external_reference: externalReference });

    return new Response(
      JSON.stringify({ init_point }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    logSafely('Error in create-subscription', { 
      error_code: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});