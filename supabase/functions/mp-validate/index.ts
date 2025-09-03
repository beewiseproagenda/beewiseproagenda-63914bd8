import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';

serve(async (req) => {
  const appUrl = Deno.env.get('APP_URL') || 'https://obdwvgxxunkomacbifry.supabase.co';
  
  const corsStrict = {
    'Access-Control-Allow-Origin': appUrl,
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsStrict });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ 
      ok: false, 
      error: 'METHOD_NOT_ALLOWED', 
      message: 'Only GET requests allowed' 
    }), {
      status: 405,
      headers: { ...corsStrict, 'Content-Type': 'application/json' },
    });
  }

  try {
    const mpTokenRaw = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN') || '';
    const mpToken = mpTokenRaw.trim();
    
    if (!mpToken) {
      return new Response(JSON.stringify({
        ok: false,
        status: 0,
        error: 'TOKEN_NOT_CONFIGURED',
        message: 'MERCADOPAGO_ACCESS_TOKEN not found in environment'
      }), {
        status: 500,
        headers: { ...corsStrict, 'Content-Type': 'application/json' },
      });
    }

    const mpResponse = await fetch('https://api.mercadopago.com/users/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${mpToken}`,
        'Content-Type': 'application/json'
      }
    });

    const mpData = await mpResponse.json().catch(() => ({}));

    if (mpResponse.status === 200) {
      return new Response(JSON.stringify({
        ok: true,
        status: mpResponse.status,
        site_id: mpData.site_id,
        user_id: mpData.id,
        nickname: mpData.nickname
      }), {
        status: 200,
        headers: { ...corsStrict, 'Content-Type': 'application/json' },
      });
    } else {
      return new Response(JSON.stringify({
        ok: false,
        status: mpResponse.status,
        error: 'TOKEN_INVALIDO',
        message: mpData.message || mpData.error || 'Invalid token response from Mercado Pago'
      }), {
        status: 200,
        headers: { ...corsStrict, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    return new Response(JSON.stringify({
      ok: false,
      status: 0,
      error: 'NETWORK_ERROR',
      message: 'Failed to connect to Mercado Pago API'
    }), {
      status: 500,
      headers: { ...corsStrict, 'Content-Type': 'application/json' },
    });
  }
});