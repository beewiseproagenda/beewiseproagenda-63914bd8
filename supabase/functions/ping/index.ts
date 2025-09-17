import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';

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

serve(async (req) => {
  const cors = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ ok: false, error: 'METHOD_NOT_ALLOWED' }), {
      status: 405,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const origin = req.headers.get('Origin') || null;
  const appUrl = Deno.env.get('APP_URL')?.trim();
  const previewUrl = Deno.env.get('APP_URL_PREVIEW')?.trim();
  const allowedOrigins = [appUrl, previewUrl].filter(Boolean) as string[];
  const allowedForThisRequest = origin ? allowedOrigins.includes(origin) : false;

  return new Response(JSON.stringify({ 
    ok: true, 
    received_origin: origin, 
    allowed_origins: allowedOrigins,
    allowed_for_this_request: allowedForThisRequest
  }), {
    status: 200,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
});