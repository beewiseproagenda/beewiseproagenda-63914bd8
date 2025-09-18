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
  // Dynamic CORS whitelist from APP_URL and APP_URL_PREVIEW
  const getCorsHeaders = (req: Request) => {
    const ALLOWED = ["https://beewiseproagenda.com.br","https://preview--beewiseproagenda.lovable.app"];
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

    // Create admin Supabase client for database operations
    const admin = createClient(
      supabaseUrl!,
      supabaseServiceKey!,
      { auth: { persistSession: false } }
    );

    // Parse request body
    const rawBody: any = await req.json();
    const { plan, userEmail, onboarding_token } = rawBody || {};
    
    logSafely('[Request body parsed]', {
      hasEmail: !!userEmail,
      plan: plan || null,
      hasOnboardingToken: !!onboarding_token
    });

    let authenticatedUserId: string;
    let authenticatedUserEmail: string;

    // Handle onboarding token flow
    if (onboarding_token) {
      logSafely('[Validating onboarding token]');
      
      const { data: tokenData, error: tokenError } = await admin.functions.invoke('validate-onboarding-token', {
        body: { token: onboarding_token }
      });

      if (tokenError || !tokenData?.valid) {
        logSafely('[Token validation failed]', { error: tokenError?.message });
        return new Response(JSON.stringify({ 
          error: 'INVALID_TOKEN', 
          message: 'Invalid or expired onboarding token' 
        }), {
          status: 401,
          headers: { ...corsStrict, 'Content-Type': 'application/json' },
        });
      }

      authenticatedUserId = tokenData.userId;
      authenticatedUserEmail = tokenData.email;
      
      logSafely('[Token validated]', { userId: '[USER_ID]' });
    } else {
      // Standard auth flow - validate JWT via Admin API
      const h = req.headers;
      const raw = h.get('authorization') || h.get('Authorization') || '';
      const token = raw.startsWith('Bearer ') ? raw.slice(7) : null;
      
      if (!token) {
        logSafely('[Auth failed]', { error_code: 'MISSING_BEARER' });
        return new Response(JSON.stringify({ 
          ok: false,
          error: 'MISSING_BEARER',
          message: 'Authorization Bearer token required' 
        }), {
          status: 401,
          headers: { ...corsStrict, 'Content-Type': 'application/json' },
        });
      }

      // Use Admin API to validate JWT
      const { data: userData, error: authError } = await admin.auth.getUser(token);
      
      if (authError || !userData?.user) {
        logSafely('[Auth failed]', { error_code: 'INVALID_JWT', message: authError?.message });
        return new Response(JSON.stringify({ 
          ok: false,
          error: 'INVALID_JWT',
          message: 'Token inválido ou expirado' 
        }), {
          status: 401,
          headers: { ...corsStrict, 'Content-Type': 'application/json' },
        });
      }

      authenticatedUserId = userData.user.id;
      authenticatedUserEmail = userData.user.email || userEmail || '';
      
      logSafely('[User authenticated via Admin API]', { userId: '[USER_ID]', email: '[EMAIL_REDACTED]' });
    }

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

    if (!authenticatedUserEmail) {
      logSafely('[Invalid email]', { hasAuthEmail: !!authenticatedUserEmail });
      return new Response(JSON.stringify({ 
        error: 'INVALID_EMAIL', 
        message: 'User email is required' 
      }), {
        status: 400,
        headers: { ...corsStrict, 'Content-Type': 'application/json' },
      });
    }

    // Check for existing active subscription
    logSafely('[Checking existing subscriptions]');
    const { data: existingSubscriptions, error: subError } = await admin
      .from('subscriptions')
      .select('id, status')
      .eq('user_id', authenticatedUserId)
      .in('status', ['pending', 'authorized'])
      .limit(1);

    if (subError) {
      logSafely('[Database error]', { error: subError.message });
      return new Response(JSON.stringify({ 
        error: 'DATABASE_ERROR', 
        message: 'Failed to check existing subscriptions' 
      }), {
        status: 500,
        headers: { ...corsStrict, 'Content-Type': 'application/json' },
      });
    }

    if (existingSubscriptions && existingSubscriptions.length > 0) {
      logSafely('[Active subscription exists]', { status: existingSubscriptions[0].status });
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
    const externalRef = plan_code === 'mensal' ? `${authenticatedUserId}:monthly` : `${authenticatedUserId}:annual`;
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
        payer_email: authenticatedUserEmail,
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
          user_id: authenticatedUserId,
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
        payer: { email: authenticatedUserEmail },
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
          user_id: authenticatedUserId,
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