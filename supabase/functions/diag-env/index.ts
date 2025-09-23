import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';

serve(async (req) => {
  const appUrl = Deno.env.get('APP_URL') || 'https://seu-dominio.com';
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const cors = {
    'Access-Control-Allow-Origin': appUrl,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'authorization,content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('', { status: 204, headers: cors });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  try {
    const mpPresent = !!(Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')?.trim());
    const envName = appUrl.includes('preview--beewiseproagenda.lovable.app') ? 'preview' : 'production';
    const edgeBase = supabaseUrl ? `${supabaseUrl}/functions/v1` : '';

    return new Response(JSON.stringify({
      env: envName,
      mercadopago_token_present: mpPresent,
      edge_url: edgeBase,
    }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'EDGE_INTERNAL_ERROR', detail: e.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
