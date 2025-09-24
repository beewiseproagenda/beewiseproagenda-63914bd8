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

// Decode JWT payload without verification (for diagnostic only)
function decodeJwtPayload(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = parts[1];
    // Add padding if needed
    const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
    const decoded = atob(paddedPayload);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

serve(async (req) => {
  const cors = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  try {
    const gotAuth = !!(req.headers.get('Authorization') || req.headers.get('authorization'));
    const raw = req.headers.get('authorization') || req.headers.get('Authorization') || '';
    if (!raw.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ 
        ok: false, 
        error: 'MISSING_BEARER',
        iss: null,
        iss_matches_edge_project: false,
        user_id: null,
        gotAuth
      }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const token = raw.slice(7);
    
    // Decode JWT to extract issuer (iss) claim
    const payload = decodeJwtPayload(token);
    const iss = payload?.iss || null;
    const expectedIss = 'https://obdwvgxxunkomacbifry.supabase.co';
    const issMatches = iss === expectedIss;

    console.log(`[whoami] JWT iss check: received="${iss}", expected="${expectedIss}", matches=${issMatches}`);

    // Test Admin API validation
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://obdwvgxxunkomacbifry.supabase.co';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!serviceKey) {
      return new Response(JSON.stringify({
        ok: false,
        error: 'MISSING_SERVICE_KEY',
        iss,
        iss_matches_edge_project: issMatches,
        user_id: null,
        gotAuth
      }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    
    console.log(`[whoami] Testing admin.auth.getUser with project URL: ${supabaseUrl}`);
    
    const { data, error } = await admin.auth.getUser(token);
    
    if (error || !data?.user) {
      console.log(`[whoami] Admin API validation failed: ${error?.message || 'No user data'}`);
      return new Response(JSON.stringify({
        ok: false,
        error: 'INVALID_JWT',
        iss,
        iss_matches_edge_project: issMatches,
        user_id: null,
        gotAuth
      }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[whoami] Admin API validation SUCCESS for user`);
    
    // Get profile with trial and subscription data
    const { data: profile } = await admin
      .from('profiles')
      .select('trial_started_at, trial_expires_at, trial_days, subscription_status')
      .eq('user_id', data.user.id)
      .maybeSingle();

    // Calculate trial information
    const now = new Date();
    const trialStarted = profile?.trial_started_at ? new Date(profile.trial_started_at) : null;
    const trialExpires = profile?.trial_expires_at ? new Date(profile.trial_expires_at) : null;
    const trialDays = profile?.trial_days || 7;
    
    let daysLeft = 0;
    let expired = true;
    
    if (trialExpires) {
      const diffMs = trialExpires.getTime() - now.getTime();
      daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      expired = diffMs <= 0;
    }

    const trial = {
      started_at: trialStarted?.toISOString() || null,
      expires_at: trialExpires?.toISOString() || null,
      days_total: trialDays,
      days_left: daysLeft,
      expired: expired
    };

    const subscription = {
      status: profile?.subscription_status || 'none'
    };
    
    return new Response(JSON.stringify({
      ok: true,
      iss,
      iss_matches_edge_project: issMatches,
      user_id: data.user.id,
      gotAuth,
      error: null,
      trial,
      subscription
    }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error(`[whoami] Unexpected error:`, err);
    return new Response(JSON.stringify({
      ok: false,
      error: 'UNKNOWN_ERROR',
      iss: null,
      iss_matches_edge_project: false,
      user_id: null,
      gotAuth: false
    }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});