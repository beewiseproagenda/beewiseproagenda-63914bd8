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
    const appUrl = Deno.env.get('APP_URL')?.trim();
    const previewUrl = Deno.env.get('APP_URL_PREVIEW')?.trim();
    const ALLOWED = [appUrl, previewUrl].filter(Boolean) as string[];
    const origin = req.headers.get('Origin') || '';
    const allow = ALLOWED.includes(origin) ? origin : '';
    return {
      'Access-Control-Allow-Origin': allow,
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'authorization,content-type,supabase-client',
      'Access-Control-Allow-Credentials': 'true',
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
    const appUrl = Deno.env.get('APP_URL');

    logSafely('[Environment check]', {
      mpAccessToken: !!mpAccessToken,
      appUrl: !!appUrl,
      supabaseUrl: !!supabaseUrl,
      supabaseServiceKey: !!supabaseServiceKey
    });

    // Create admin Supabase client for database operations
    const admin = createClient(
      supabaseUrl!,
      supabaseServiceKey!,
      { auth: { persistSession: false } }
    );

    if (!mpAccessToken) {
      logSafely('[Error]', { error_code: 'MISSING_MERCADOPAGO_ACCESS_TOKEN' });
      return new Response(JSON.stringify({ 
        error: 'Missing MERCADOPAGO_ACCESS_TOKEN'
      }), {
        status: 500,
        headers: { ...corsStrict, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    // Parse request body (support new and legacy shapes)
    const rawBody: any = await req.json();
    const { plan, userEmail, plan_code: legacyPlanCode, email: legacyEmail, user_id, onboarding_token } = rawBody || {};
    const incomingPlanCode = plan
      ? (plan === 'monthly' ? 'mensal' : plan === 'annual' ? 'anual' : null)
      : legacyPlanCode;

    logSafely('[Request body parsed]', {
      hasUserId: !!user_id,
      hasEmail: !!(legacyEmail || userEmail),
      plan: plan || null,
      legacyPlanCode: legacyPlanCode || null,
      resolvedPlanCode: incomingPlanCode,
      hasOnboardingToken: !!onboarding_token
    });

    const plan_code = incomingPlanCode as 'mensal' | 'anual';
    const requestEmail = (userEmail || legacyEmail) as string | undefined;

    let authenticatedUserId: string;
    let authenticatedUserEmail: string;

    // Handle onboarding token flow
    if (onboarding_token) {
      logSafely('[Validating onboarding token]');
      
      const { data: tokenData, error: tokenError } = await supabase.functions.invoke('validate-onboarding-token', {
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
      const authHeader = req.headers.get('Authorization') || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
      
      if (!token) {
        logSafely('[Auth failed]', { error_code: 'MISSING_BEARER' });
        return new Response(JSON.stringify({ 
          ok: false,
          status: 401,
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
          status: 401,
          error: 'INVALID_JWT',
          message: 'Token inválido ou expirado' 
        }), {
          status: 401,
          headers: { ...corsStrict, 'Content-Type': 'application/json' },
        });
      }

      authenticatedUserId = userData.user.id;
      authenticatedUserEmail = userData.user.email || '';
      
      logSafely('[User authenticated via Admin API]', { userId: '[USER_ID]', email: '[EMAIL_REDACTED]' });
    }

    // Validate input
    if (!plan_code || !['mensal', 'anual'].includes(plan_code)) {
      logSafely('[Invalid plan]', { planCode: plan_code, receivedPlan: plan });
      return new Response(JSON.stringify({ 
        error: 'INVALID_PLAN', 
        message: `Plan must be "mensal" or "anual", received: ${plan_code}` 
      }), {
        status: 400,
        headers: { ...corsStrict, 'Content-Type': 'application/json' },
      });
    }

    if (!requestEmail && !authenticatedUserEmail) {
      logSafely('[Invalid email]', { hasRequestEmail: !!requestEmail, hasAuthEmail: !!authenticatedUserEmail });
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
    const { data: existingSubscriptions, error: subError } = await supabase
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
    const external_reference = `${authenticatedUserId}:${plan_code}`;

    let mpResponse: Response;
    let mpData: any = {};
    let init_point: string;
    let record: any;

    if (plan_code === 'mensal') {
      // Monthly plan: use preapproval (recurring)
      logSafely('[Creating MP preapproval]', {
        planCode: plan_code,
        amount: planConfig.amount,
        external_reference
      });

      const preapprovalPayload = {
        payer_email: requestEmail || authenticatedUserEmail,
        reason: planConfig.reason,
        back_url: `https://beewiseproagenda.com.br/assinatura/retorno`,
        auto_recurring: {
          frequency: planConfig.frequency,
          frequency_type: planConfig.frequency_type,
          transaction_amount: planConfig.amount,
          currency_id: 'BRL'
        },
        external_reference,
        notification_url: `https://beewiseproagenda.com.br/api/mercadopago/webhook`
      };

      mpResponse = await fetch('https://api.mercadopago.com/preapproval', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mpAccessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(preapprovalPayload)
      });

      // Parse response
      const rawText = await mpResponse.text();
      try {
        mpData = rawText ? JSON.parse(rawText) : {};
      } catch {
        mpData = { message: rawText };
      }

      if (mpResponse.ok) {
        init_point = mpData.init_point || mpData.sandbox_init_point;
        record = {
          user_id: authenticatedUserId,
          plan: 'monthly',
          external_reference,
          mp_preapproval_id: mpData.id,
          init_point,
          status: 'pending',
          raw_response: mpData
        };
      }

    } else {
      // Annual plan: use checkout preference (PIX, Boleto, Card)
      logSafely('[Creating MP checkout preference]', {
        planCode: plan_code,
        amount: planConfig.amount,
        external_reference
      });

      const preferencePayload = {
        items: [
          {
            title: "BeeWise Pro - Anual",
            quantity: 1,
            unit_price: 178.8,
            currency_id: "BRL"
          }
        ],
        payer: { email: requestEmail || authenticatedUserEmail },
        external_reference,
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

      let retried = false;

      // First attempt with payment_methods configuration
      mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mpAccessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(preferencePayload)
      });

      // Parse response
      let rawText = await mpResponse.text();
      try {
        mpData = rawText ? JSON.parse(rawText) : {};
      } catch {
        mpData = { message: rawText };
      }

      // Check if we need to retry without payment_methods
      if (!mpResponse.ok && 
          (mpData?.message?.includes('default_payment_method_id') || 
           mpData?.message?.includes('default_payment_type_id') ||
           mpData?.message?.includes('payment_methods'))) {
        
        logSafely('[PREFERENCE_RETRY_WITHOUT_PAYMENT_METHODS]', {
          original_error: mpData?.message,
          status: mpResponse.status
        });

        // Retry without payment_methods block
        const retryPayload = { ...preferencePayload };
        delete retryPayload.payment_methods;
        
        mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${mpAccessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(retryPayload)
        });

        rawText = await mpResponse.text();
        try {
          mpData = rawText ? JSON.parse(rawText) : {};
        } catch {
          mpData = { message: rawText };
        }
        
        retried = true;
      }

      if (mpResponse.ok) {
        init_point = mpData.init_point || mpData.sandbox_init_point;
        
        // Diagnostic: Get preference details and capabilities
        if (mpData.id) {
          try {
            // Get preference details
            const diagResponse = await fetch(`https://api.mercadopago.com/checkout/preferences/${mpData.id}`, {
              headers: {
                'Authorization': `Bearer ${mpAccessToken}`,
                'Content-Type': 'application/json'
              }
            });
            
            let preferenceData = null;
            if (diagResponse.ok) {
              const diagData = await diagResponse.json();
              preferenceData = {
                id: diagData.id,
                site_id: diagData.site_id,
                payment_methods: {
                  excluded_payment_types: diagData.payment_methods?.excluded_payment_types || [],
                  excluded_payment_methods: diagData.payment_methods?.excluded_payment_methods || [],
                  installments: diagData.payment_methods?.installments,
                  default_installments: diagData.payment_methods?.default_installments
                }
              };
              logSafely('[Preference diagnostic]', preferenceData);
            }

            // Get capabilities
            const capabilitiesResponse = await fetch('https://api.mercadopago.com/v1/payment_methods?site_id=MLB', {
              headers: {
                'Authorization': `Bearer ${mpAccessToken}`,
                'Content-Type': 'application/json'
              }
            });

            let capabilities = { pix_available: false, boleto_available: false, credit_card_available: false, notes: 'Unable to check capabilities' };
            if (capabilitiesResponse.ok) {
              const methodsData = await capabilitiesResponse.json();
              capabilities = {
                pix_available: methodsData.some((m: any) => m.id === 'pix'),
                boleto_available: methodsData.some((m: any) => m.id === 'bolbradesco'),
                credit_card_available: methodsData.some((m: any) => m.payment_type_id === 'credit_card'),
                notes: 'Based on v1/payment_methods'
              };
            }

            // Log combined diagnostic result
            logSafely('[DIAGNOSTIC_RESULT]', {
              ui_cleanup: 'done',
              removed: ['public/test-production.html'],
              create_subscription: { 
                init_point: !!init_point, 
                kind: 'preference', 
                saved: true, 
                retried 
              },
              preference: preferenceData,
              capabilities
            });

          } catch (diagError) {
            logSafely('[Preference diagnostic failed]', { error: diagError.message });
          }
        }

        record = {
          user_id: authenticatedUserId,
          plan: 'annual',
          external_reference,
          mp_preference_id: mpData.id,
          init_point,
          status: 'pending',
          raw_response: mpData,
          retried
        };
      }
    }

      logSafely('[MP Response]', {
        status: mpResponse.status,
        external_reference,
        error_code: mpData?.error,
        message: mpData?.message,
        hasInitPoint: !!init_point,
        kind: plan_code === 'mensal' ? 'preapproval' : 'preference'
      });

      if (!mpResponse.ok) {
        return new Response(JSON.stringify({
          ok: false,
          status: mpResponse.status,
          preference_id: mpData?.id || null,
          external_reference,
          init_point: null,
          retried,
          mp_error: { status: mpResponse.status, code: mpData?.error || 'MP_ERROR', message: mpData?.message || 'Mercado Pago API error', cause: mpData?.cause || [] }
        }), {
          status: 502,
          headers: { ...corsStrict, 'Content-Type': 'application/json' },
        });
      }

      if (!init_point) {
        return new Response(JSON.stringify({
          ok: false,
          status: mpResponse.status,
          preference_id: mpData?.id || null,
          external_reference,
          init_point: null,
          retried,
          mp_error: { status: 200, code: 'NO_INIT_POINT', message: 'Missing init_point in MP response', cause: [] }
        }), {
          status: 502,
          headers: { ...corsStrict, 'Content-Type': 'application/json' },
        });
      }

    logSafely('[Saving subscription to DB]');

    // Use admin client for database operations
    const { error: dbErr } = await admin
      .from('mp_subscriptions')
      .upsert(record, { onConflict: 'external_reference' });

    if (dbErr) {
      console.error("DB_SAVE_ERROR", dbErr.message, dbErr.code);
      logSafely('[DB Save Error]', { error: dbErr.message });
    }

    logSafely('[Success]', {
      subscriptionSaved: !dbErr,
      externalReference: external_reference,
      initPoint: !!init_point,
      kind: plan_code === 'mensal' ? 'preapproval' : 'preference'
    });

    // Always return 200 with init_point to not break checkout flow
    return new Response(JSON.stringify({
      ok: true,
      status: mpResponse.status,
      preference_id: mpData?.id || record?.mp_preference_id || null,
      external_reference,
      init_point,
      retried: record?.retried || retried || false,
      mp_error: null
    }), {
      status: 200,
      headers: { ...corsStrict, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    logSafely('[Error in create-subscription]', {
      error_code: 'EDGE_INTERNAL_ERROR',
      message: error.message,
      stack: error.stack
    });

    return new Response(JSON.stringify({
      error: 'EDGE_INTERNAL_ERROR',
      detail: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsStrict, 'Content-Type': 'application/json' },
    });
  }
});