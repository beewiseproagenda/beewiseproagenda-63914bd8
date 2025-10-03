import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { requireAuth, logSafely } from '../_shared/auth.ts';

interface CreateSubscriptionRequest {
  user_id: string;
  email: string;
  plan_code: 'mensal' | 'anual';
  onboarding_token?: string;
}

serve(async (req) => {
  // FREEMIUM MODE: Temporarily disabled for freemium testing
  if (Deno.env.get('FREEMIUM_MODE') === 'true') {
    return new Response(JSON.stringify({ 
      ok: true, 
      freemium: true, 
      message: 'Billing temporarily disabled - freemium mode active' 
    }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  // Dynamic CORS whitelist from APP_URL and APP_URL_PREVIEW
  const getCorsHeaders = (req: Request) => {
    const ALLOWED = ["https://beewiseproagenda.com.br"];
    const origin = req.headers.get('Origin') || '';
    const allow = ALLOWED.includes(origin) ? origin : '';
    return {
      'Access-Control-Allow-Origin': allow,
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'authorization, content-type, accept, x-requested-with, x-client-info, apikey, x-supabase-authorization, x-origin',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin',
    } as Record<string, string>;
  };

  const corsStrict = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsStrict });
  }

  logSafely('[Request received]', { method: req.method });

  try {
    // Only allow POST method
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsStrict, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const mpAccessTokenRaw = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN') || '';
    const mpAccessToken = mpAccessTokenRaw.trim();

    logSafely('[Environment check]', {
      mpAccessToken: !!mpAccessToken,
      supabaseUrl: !!supabaseUrl,
      supabaseServiceKey: !!supabaseServiceKey
    });

    if (!mpAccessToken) {
      logSafely('[Error]', { error_code: 'MISSING_MERCADOPAGO_ACCESS_TOKEN' });
      return new Response(JSON.stringify({ 
        error: 'Missing MERCADOPAGO_ACCESS_TOKEN'
      }), {
        status: 500,
        headers: { ...corsStrict, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const rawBody: any = await req.json();
    const { plan, userEmail, onboarding_token } = rawBody || {};
    
    logSafely('[Request body parsed]', {
      hasEmail: !!userEmail,
      plan: plan || null,
      hasOnboardingToken: !!onboarding_token
    });

    // UNIFIED AUTH - validate JWT for both monthly and annual plans
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    
    if (!token) {
      return new Response(JSON.stringify({ 
        ok: false, 
        status: 401, 
        error: 'MISSING_BEARER' 
      }), {
        status: 401,
        headers: { ...corsStrict, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );
    
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ 
        ok: false, 
        status: 401, 
        error: 'INVALID_JWT' 
      }), {
        status: 401,
        headers: { ...corsStrict, 'Content-Type': 'application/json' },
      });
    }

    const user = userData.user;
    const payerEmail = user.email as string;

    // Validate input
    const plan_code = plan === 'monthly' ? 'mensal' : plan === 'annual' ? 'anual' : null;
    if (!plan_code || !['mensal', 'anual'].includes(plan_code)) {
      logSafely('[Invalid plan]', { planCode: plan_code, receivedPlan: plan });
      return new Response(JSON.stringify({ 
        error: 'INVALID_PLAN', 
        message: `Plan must be "monthly" or "annual", received: ${plan}` 
      }), {
        status: 400,
        headers: { ...corsStrict, 'Content-Type': 'application/json' },
      });
    }

    if (!payerEmail) {
      logSafely('[Invalid email]', { hasPayerEmail: !!payerEmail });
      return new Response(JSON.stringify({ 
        error: 'INVALID_EMAIL', 
        message: 'User email is required' 
      }), {
        status: 400,
        headers: { ...corsStrict, 'Content-Type': 'application/json' },
      });
    }

    // Check for existing active subscription in both tables
    logSafely('[Checking existing subscriptions]');
    
    // Check subscriptions table
    const { data: existingSubscriptions, error: subError } = await admin
      .from('subscriptions')
      .select('id, status')
      .eq('user_id', user.id)
      .in('status', ['pending', 'authorized'])
      .limit(1);

    // Check subscribers table (legacy)
    const { data: existingSubscribers, error: subscribersError } = await admin
      .from('subscribers')
      .select('id, subscribed')
      .or(`user_id.eq.${user.id},email.eq.${payerEmail}`)
      .eq('subscribed', true)
      .limit(1);

    if (subError) {
      logSafely('[Database error on subscriptions]', { error: subError.message });
      return new Response(JSON.stringify({ 
        error: 'DATABASE_ERROR', 
        message: 'Failed to check existing subscriptions' 
      }), {
        status: 500,
        headers: { ...corsStrict, 'Content-Type': 'application/json' },
      });
    }

    if (subscribersError) {
      logSafely('[Database error on subscribers]', { error: subscribersError.message });
      return new Response(JSON.stringify({ 
        error: 'DATABASE_ERROR', 
        message: 'Failed to check existing subscribers' 
      }), {
        status: 500,
        headers: { ...corsStrict, 'Content-Type': 'application/json' },
      });
    }

    const hasActiveSubscription = (existingSubscriptions && existingSubscriptions.length > 0);
    const hasActiveSubscriber = (existingSubscribers && existingSubscribers.length > 0);

    if (hasActiveSubscription || hasActiveSubscriber) {
      logSafely('[Active subscription exists]', { 
        inSubscriptions: hasActiveSubscription,
        inSubscribers: hasActiveSubscriber,
        subscriptionStatus: existingSubscriptions?.[0]?.status 
      });
      return new Response(JSON.stringify({ 
        error: 'SUBSCRIPTION_EXISTS', 
        message: 'User already has an active subscription' 
      }), {
        status: 409,
        headers: { ...corsStrict, 'Content-Type': 'application/json' },
      });
    }

    // Initialize all variables used in final JSON
    let retried = false;
    let ok = false;
    let status = 0;
    let preferenceId: string | null = null;
    let initPoint: string | null = null;
    // Fix external_reference for monthly vs annual
    const externalRef = plan_code === 'mensal' ? `${user.id}:monthly` : `${user.id}:annual`;
    let mpError: any = null;

    // Define plan configurations
    const planConfigs = {
      mensal: {
        reason: 'BeeWise Pro - Mensal',
        amount: 19.9,
        frequency: 1,
        frequency_type: 'months'
      },
      anual: {
        reason: 'BeeWise Pro - Anual',
        amount: 178.8,
        frequency: 12,
        frequency_type: 'months'
      }
    };

    const planConfig = planConfigs[plan_code];
    let record: any;

    if (plan_code === 'mensal') {
      // Monthly plan: use preapproval (recurring)
      logSafely('[Creating MP preapproval]', {
        planCode: plan_code,
        amount: planConfig.amount,
        external_reference: externalRef
      });

      const preapprovalPayload = {
        reason: "BeeWise Pro - Mensal",
        external_reference: externalRef,
        back_url: "https://beewiseproagenda.com.br/assinatura/retorno?status=success",
        payer_email: payerEmail,
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: 19.90,
          currency_id: "BRL"
        }
      };

      const mpResponse = await fetch('https://api.mercadopago.com/preapproval', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mpAccessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(preapprovalPayload)
      });

      status = mpResponse.status;
      const rawText = await mpResponse.text();
      let mpData: any = {};
      try {
        mpData = rawText ? JSON.parse(rawText) : {};
      } catch {
        mpData = { message: rawText };
      }

      ok = mpResponse.ok;
      if (ok) {
        preferenceId = mpData?.id ?? null;
        initPoint = mpData?.init_point ?? null;
        mpError = null;
        record = {
          user_id: user.id,
          plan: 'monthly',
          external_reference: externalRef,
          mp_preapproval_id: mpData?.id,
          init_point: initPoint,
          status: 'pending',
          raw_response: mpData
        };
      } else {
        mpError = {
          status,
          code: mpData?.code || mpData?.error || 'MP_ERROR',
          message: mpData?.message || 'Mercado Pago error',
          cause: mpData?.cause || []
        };
      }

    } else {
      // Annual plan: use checkout preference (PIX, Boleto, Card)
      logSafely('[Creating MP checkout preference]', {
        planCode: plan_code,
        amount: planConfig.amount,
        external_reference: externalRef
      });

      const payload = {
        items: [
          {
            title: "BeeWise Pro - Anual",
            quantity: 1,
            unit_price: 178.8,
            currency_id: "BRL"
          }
        ],
        payer: { email: payerEmail },
        external_reference: externalRef,
        back_urls: {
          success: "https://beewiseproagenda.com.br/assinatura/retorno?status=success",
          pending: "https://beewiseproagenda.com.br/assinatura/retorno?status=pending",
          failure: "https://beewiseproagenda.com.br/assinatura/retorno?status=failure"
        },
        auto_return: "approved",
        notification_url: "https://beewiseproagenda.com.br/api/mercadopago/webhook",
        payment_methods: {
          excluded_payment_types: [],
          excluded_payment_methods: [],
          installments: 12,
          default_installments: 1
        },
        statement_descriptor: "BEEWISE PRO"
      };

      // First attempt with payment_methods configuration
      const pref1 = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mpAccessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      status = pref1.status;
      let body = await pref1.json().catch(() => ({}));
      
      if (!pref1.ok && status === 400) {
        // retry without payment_methods
        retried = true;
        const { payment_methods, ...payloadNoPM } = payload as any;
        
        logSafely('[PREFERENCE_RETRY_WITHOUT_PAYMENT_METHODS]', {
          original_error: body?.message,
          status
        });
        
        const pref2 = await fetch('https://api.mercadopago.com/checkout/preferences', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${mpAccessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payloadNoPM)
        });
        
        status = pref2.status;
        body = await pref2.json().catch(() => ({}));
        ok = pref2.ok;
      } else {
        ok = pref1.ok;
      }

      if (ok) {
        preferenceId = body?.id ?? null;
        initPoint = body?.init_point ?? null;
        mpError = null;
      } else {
        mpError = {
          status,
          code: body?.code || body?.error || 'MP_ERROR',
          message: body?.message || body?.error || 'Mercado Pago error',
          cause: body?.cause || []
        };
      }

      if (ok && preferenceId) {
        record = {
          user_id: user.id,
          plan: 'annual',
          external_reference: externalRef,
          mp_preference_id: preferenceId,
          init_point: initPoint,
          status: 'pending',
          raw_response: body
        };
      }
    }

    logSafely('[MP Response]', {
      status,
      external_reference: externalRef,
      error_code: mpError?.code,
      message: mpError?.message,
      hasInitPoint: !!initPoint,
      kind: plan_code === 'mensal' ? 'preapproval' : 'preference'
    });

    // Save to database if successful
    if (ok && record) {
      logSafely('[Saving subscription to DB]');
      
      const { error: dbErr } = await admin
        .from('mp_subscriptions')
        .upsert(record, { onConflict: 'external_reference' });

      if (dbErr) {
        console.error("DB_SAVE_ERROR", dbErr.message, dbErr.code);
        logSafely('[DB Save Error]', { error: dbErr.message });
      }

      logSafely('[Success]', {
        subscriptionSaved: !dbErr,
        externalReference: externalRef,
        initPoint: !!initPoint,
        kind: plan_code === 'mensal' ? 'preapproval' : 'preference'
      });
    }

    // Always return standardized response based on plan type
    if (plan_code === 'mensal') {
      // Monthly preapproval response
      if (ok) {
        return new Response(JSON.stringify({
          ok: true,
          status,
          kind: "preapproval",
          preapproval_id: preferenceId,
          external_reference: externalRef,
          init_point: initPoint
        }), {
          status: 201,
          headers: { ...corsStrict, 'Content-Type': 'application/json' },
        });
      } else if (mpError) {
        return new Response(JSON.stringify({
          ok: false,
          status,
          error: "MP_ERROR",
          code: mpError.code,
          message: mpError.message,
          cause: mpError.cause
        }), {
          status,
          headers: { ...corsStrict, 'Content-Type': 'application/json' },
        });
      } else {
        return new Response(JSON.stringify({
          ok: false,
          status: 500,
          error: "EDGE_INTERNAL_ERROR",
          detail: "Unexpected response from Mercado Pago"
        }), {
          status: 500,
          headers: { ...corsStrict, 'Content-Type': 'application/json' },
        });
      }
    } else {
      // Annual preference response (existing format)
      return new Response(JSON.stringify({
        ok,
        status,
        retried,
        preference_id: preferenceId,
        external_reference: externalRef,
        init_point: initPoint,
        mp_error: mpError
      }), {
        status: ok ? 200 : status,
        headers: { ...corsStrict, 'Content-Type': 'application/json' },
      });
    }

  } catch (e) {
    logSafely('[Error in create-subscription]', {
      error_code: 'EDGE_INTERNAL_ERROR',
      message: String(e),
      stack: e.stack
    });

    return new Response(JSON.stringify({
      ok: false,
      status: 500,
      error: "EDGE_INTERNAL_ERROR",
      detail: String(e)
    }), {
      status: 500,
      headers: { ...corsStrict, 'Content-Type': 'application/json' },
    });
  }
});