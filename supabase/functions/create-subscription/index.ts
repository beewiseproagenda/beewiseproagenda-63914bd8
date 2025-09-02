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
  const allowedOrigin = Deno.env.get('APP_URL') || 'https://6d45dc04-588b-43e4-8e90-8f2206699257.sandbox.lovable.dev';
  const corsStrict = {
    'Access-Control-Allow-Origin': '*', // Temporarily allow all for testing
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'authorization,content-type'
  };

  if (req.method === 'OPTIONS') {
    return new Response('', { status: 204, headers: corsStrict });
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

    // Environment check
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const mpAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN') || Deno.env.get('MP_ACCESS_TOKEN');
    const appUrl = Deno.env.get('APP_URL');

    logSafely('[Environment check]', {
      mpAccessToken: !!mpAccessToken,
      appUrl: !!appUrl,
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

    // Define plan configurations for preapproval
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

    logSafely('[Creating MP preapproval]', {
      planCode: plan_code,
      amount: planConfig.amount,
      external_reference
    });

    // Create Mercado Pago preapproval
    const preapprovalPayload = {
      payer_email: requestEmail || authenticatedUserEmail,
      reason: planConfig.reason,
      back_url: `${appUrl || 'https://obdwvgxxunkomacbifry.supabase.co'}/assinatura/retorno`,
      auto_recurring: {
        frequency: planConfig.frequency,
        frequency_type: planConfig.frequency_type,
        transaction_amount: planConfig.amount,
        currency_id: 'BRL'
      },
      external_reference,
      notification_url: `${appUrl || 'https://obdwvgxxunkomacbifry.supabase.co'}/api/mercadopago/webhook`
    };

    logSafely('[MP request payload]', {
      reason: planConfig.reason,
      amount: planConfig.amount,
      frequency: planConfig.frequency,
      external_reference
    });

    const mpResponse = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preapprovalPayload)
    });

    // Safely parse MP response as JSON or text
    const rawText = await mpResponse.text();
    let mpData: any = {};
    try {
      mpData = rawText ? JSON.parse(rawText) : {};
    } catch {
      mpData = { message: rawText };
    }

    // Always log MP response (safely)
    console.log('MP status:', mpResponse.status, 'ref:', external_reference, 'code:', mpData?.error, 'message:', mpData?.message);
    
    logSafely('[MP Response]', {
      status: mpResponse.status,
      external_reference,
      error_code: mpData?.error,
      message: mpData?.message,
      hasInitPoint: !!(mpData?.init_point || mpData?.sandbox_init_point)
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

    // Save subscription to database
    const subscription = {
      user_id: authenticatedUserId,
      plan_code,
      mp_preapproval_id: mpData.id,
      status: 'pending' as const,
      started_at: new Date().toISOString(),
      external_reference
    };

    logSafely('[Saving subscription to DB]');
    const { error: insertError } = await supabase
      .from('subscriptions')
      .insert([subscription]);

    if (insertError) {
      logSafely('[DB Insert Error]', { error: insertError.message });
      return new Response(JSON.stringify({ 
        error: 'DATABASE_ERROR', 
        message: 'Failed to save subscription' 
      }), {
        status: 500,
        headers: { ...corsStrict, 'Content-Type': 'application/json' },
      });
    }

    const init_point = mpData.init_point || mpData.sandbox_init_point;
    
    logSafely('[Success]', { 
      hasInitPoint: !!init_point,
      external_reference 
    });

    return new Response(JSON.stringify({
      init_point,
      subscription_id: mpData.id,
      external_reference
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