import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';

const getCorsHeaders = (req: Request) => {
  const appUrl = Deno.env.get('APP_URL')?.trim();
  const previewUrl = Deno.env.get('APP_URL_PREVIEW')?.trim();
  const ALLOWED = [appUrl, previewUrl].filter(Boolean) as string[];
  const origin = req.headers.get('Origin') || '';
  const allow = ALLOWED.includes(origin) ? origin : '';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

  const origin = req.headers.get('Origin') || '';
  const allowHeader = cors['Access-Control-Allow-Origin'];

  return new Response(JSON.stringify({ ok: true, originRecebido: origin, allowHeader }), {
    status: 200,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
});