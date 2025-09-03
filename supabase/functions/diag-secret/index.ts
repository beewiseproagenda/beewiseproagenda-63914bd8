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
    const raw = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN') || '';
    const trimmed = raw.trim();
    const has_mp = trimmed.length > 0;
    const prefix = has_mp && trimmed.startsWith('APP_USR-') ? 'APP_USR-' : 'other';

    return new Response(JSON.stringify({
      has_mp,
      name_used: 'MERCADOPAGO_ACCESS_TOKEN',
      length: has_mp ? trimmed.length : 0,
      prefix
    }), {
      status: 200,
      headers: { ...corsStrict, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({
      ok: false,
      error: 'EDGE_INTERNAL_ERROR',
      message: e.message
    }), {
      status: 500,
      headers: { ...corsStrict, 'Content-Type': 'application/json' },
    });
  }
});