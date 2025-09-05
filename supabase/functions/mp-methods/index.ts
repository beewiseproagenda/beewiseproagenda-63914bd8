import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { logSafely } from '../_shared/auth.ts';

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

  logSafely('[MP Methods Check]', { method: req.method });

  try {
    // Only allow GET method
    if (req.method !== 'GET') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsStrict, 'Content-Type': 'application/json' },
      });
    }

    const mpAccessTokenRaw = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN') || '';
    const mpAccessToken = mpAccessTokenRaw.trim();

    if (!mpAccessToken) {
      logSafely('[Error]', { error_code: 'MISSING_MERCADOPAGO_ACCESS_TOKEN' });
      return new Response(JSON.stringify({ 
        error: 'Missing MERCADOPAGO_ACCESS_TOKEN'
      }), {
        status: 500,
        headers: { ...corsStrict, 'Content-Type': 'application/json' },
      });
    }

    // Check available payment methods in Brazil (MLB)
    logSafely('[Checking payment methods]');
    
    const paymentMethodsResponse = await fetch('https://api.mercadopago.com/v1/payment_methods?site_id=MLB', {
      headers: {
        'Authorization': `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json'
      }
    });

    const paymentMethods = await paymentMethodsResponse.json();

    logSafely('[Payment methods response]', {
      status: paymentMethodsResponse.status,
      hasResults: Array.isArray(paymentMethods)
    });

    // Try to get account-specific accepted payment methods
    let acceptedMethods: any = null;
    let acceptedMethodsError: string | null = null;
    
    try {
      const acceptedResponse = await fetch('https://api.mercadopago.com/users/me/accepted_payment_methods', {
        headers: {
          'Authorization': `Bearer ${mpAccessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (acceptedResponse.ok) {
        acceptedMethods = await acceptedResponse.json();
        logSafely('[Accepted methods found]', { hasData: !!acceptedMethods });
      } else {
        acceptedMethodsError = `HTTP ${acceptedResponse.status}`;
        logSafely('[Accepted methods failed]', { status: acceptedResponse.status });
      }
    } catch (error) {
      acceptedMethodsError = error.message;
      logSafely('[Accepted methods error]', { error: error.message });
    }

    // Analyze available methods
    let pix_available = false;
    let boleto_available = false;
    let credit_card_available = false;
    let source = 'v1_payment_methods';
    let notes = '';

    if (Array.isArray(paymentMethods)) {
      // Check for PIX
      pix_available = paymentMethods.some((method: any) => 
        method.payment_type_id === 'bank_transfer' && method.id === 'pix'
      );
      
      // Check for Boleto
      boleto_available = paymentMethods.some((method: any) => 
        method.payment_type_id === 'ticket' && method.id === 'bolbradesco'
      ) || paymentMethods.some((method: any) => 
        method.payment_type_id === 'ticket'
      );
      
      // Check for Credit Card
      credit_card_available = paymentMethods.some((method: any) => 
        method.payment_type_id === 'credit_card'
      );

      if (acceptedMethods) {
        source = 'accepted_payment_methods';
        // If we have account-specific data, use that for validation
        const acceptedIds = Array.isArray(acceptedMethods) 
          ? acceptedMethods.map((m: any) => m.id) 
          : [];
        
        if (acceptedIds.length > 0) {
          pix_available = acceptedIds.includes('pix');
          boleto_available = acceptedIds.some((id: string) => 
            id.includes('boleto') || id.includes('bolbradesco') || id === 'ticket'
          );
          credit_card_available = acceptedIds.some((id: string) => 
            ['visa', 'master', 'amex', 'elo', 'hipercard'].includes(id)
          );
        }
      }

      if (!pix_available) {
        notes = 'PIX may not be enabled for this account. Check Mercado Pago dashboard: Seu Negócio > Meios de pagamento aceitos';
      }
    } else {
      notes = 'Unable to fetch payment methods from MercadoPago API';
    }

    const result = {
      pix_available,
      boleto_available,
      credit_card_available,
      source,
      notes,
      debug: {
        payment_methods_count: Array.isArray(paymentMethods) ? paymentMethods.length : 0,
        accepted_methods_available: !!acceptedMethods,
        accepted_methods_error: acceptedMethodsError
      }
    };

    logSafely('[MP Methods Result]', {
      pix_available,
      boleto_available,
      credit_card_available,
      source
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsStrict, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    logSafely('[Error in mp-methods]', {
      error_code: 'MP_METHODS_ERROR',
      message: error.message
    });

    return new Response(JSON.stringify({
      error: 'MP_METHODS_ERROR',
      detail: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsStrict, 'Content-Type': 'application/json' },
    });
  }
});