import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const getCorsHeaders = (req: Request) => {
  const ALLOWED = ["https://beewiseproagenda.com.br"];
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

  try {
    const gotAuth = !!(req.headers.get('Authorization') || req.headers.get('authorization'));
    const raw = (req.headers.get('authorization') || req.headers.get('Authorization') || '').toString();
    const token = raw.replace('Bearer ', '').trim();
    if (!token) {
      return new Response(JSON.stringify({ 
        ok: false, 
        error: 'MISSING_BEARER',
        gotAuth
      }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return new Response(JSON.stringify({ 
        ok: false, 
        error: 'INVALID_JWT',
        gotAuth
      }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const email = data.user.email || null;
    const domain = email ? email.split('@')[1] || null : null;

    return new Response(
      JSON.stringify({ 
        ok: true, 
        user_id: data.user.id,
        gotAuth
      }),
      { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ 
      ok: false, 
      error: 'UNKNOWN_ERROR',
      gotAuth: false
    }), {
      status: 500,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    });
  }
});