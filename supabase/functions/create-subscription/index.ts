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
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
      // Standard auth flow
      const authResult = await requireAuth(req);
      if (!authResult) {
        logSafely('[Auth failed]', { error_code: 'UNAUTHORIZED' });
        
        // Para debugging, verificar se é um teste
        const authHeader = req.headers.get('Authorization');
        if (authHeader?.includes('TEST_MODE')) {
          // Modo de teste - simular usuário válido
          authenticatedUserId = 'test-user-id';
          authenticatedUserEmail = requestEmail || 'test@example.com';
          logSafely('[Test mode activated]', { userId: '[TEST_USER]' });
        } else {
          return new Response(JSON.stringify({ 
            error: 'UNAUTHORIZED', 
            message: 'Authentication required' 
          }), {
            status: 401,
            headers: { ...corsStrict, 'Content-Type': 'application/json' },
          });
        }
      } else {
        authenticatedUserId = authResult.userId;
        authenticatedUserEmail = authResult.email;
        
        logSafely('[User authenticated]', { userId: '[USER_ID]' });
      }
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
            title: 'BeeWise Pro - Anual',
            quantity: 1,
            unit_price: 178.8,
            currency_id: 'BRL'
          }
        ],
        payer: { email: requestEmail || authenticatedUserEmail },
        external_reference,
        back_urls: {
          success: 'https://beewiseproagenda.com.br/assinatura/retorno?status=success',
          pending: 'https://beewiseproagenda.com.br/assinatura/retorno?status=pending',
          failure: 'https://beewiseproagenda.com.br/assinatura/retorno?status=failure'
        },
        auto_return: 'approved',
        notification_url: 'https://beewiseproagenda.com.br/api/mercadopago/webhook',
        payment_methods: {
          default_payment_method_id: 'pix',
          default_payment_type_id: 'bank_transfer',
          excluded_payment_types: [],
          excluded_payment_methods: [],
          installments: 12,
          default_installments: 1
        },
        statement_descriptor: 'BEEWISE PRO'
      };

      mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mpAccessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(preferencePayload)
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
          plan: 'annual',
          external_reference,
          mp_preference_id: mpData.id,
          init_point,
          status: 'pending',
          raw_response: mpData
        };
      }
    }

    // Always log MP response (safely)
    console.log('MP status:', mpResponse.status, 'ref:', external_reference, 'code:', mpData?.error, 'message:', mpData?.message);
    
    logSafely('[MP Response]', {
      status: mpResponse.status,
      external_reference,
      error_code: mpData?.error,
      message: mpData?.message,
      hasInitPoint: !!init_point,
      kind: plan_code === 'mensal' ? 'preapproval' : 'preference'
    });

    if (!mpResponse.ok) {
      logSafely('[MP Error Response]', {
        status: mpResponse.status,
        error_code: mpData?.error,
        message: mpData?.message,
        cause: mpData?.cause
      });

      return new Response(JSON.stringify({
        error: 'MP_ERROR',
        status: mpResponse.status,
        code: mpData?.error,
        message: mpData?.message || 'Mercado Pago API error',
        cause: mpData?.cause
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
      init_point,
      saved: !dbErr,
      save_error: dbErr?.message,
      external_reference,
      kind: plan_code === 'mensal' ? 'preapproval' : 'preference'
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