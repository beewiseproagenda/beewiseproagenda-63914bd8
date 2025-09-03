import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204, 
      headers: corsHeaders 
    });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Create admin client
    const admin = createClient(
      supabaseUrl,
      supabaseServiceKey,
      { auth: { persistSession: false } }
    );

    // Test database connectivity with a simple query
    const { data, error } = await admin
      .from('mp_subscriptions')
      .select('count')
      .limit(1);

    if (error) {
      console.error('DB_HEALTH_ERROR:', error.message);
      return new Response(JSON.stringify({ 
        ok: false, 
        message: error.message 
      }), {
        status: 200,
        headers: corsHeaders
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('DB_HEALTH_EXCEPTION:', error.message);
    return new Response(JSON.stringify({ 
      ok: false, 
      message: error.message 
    }), {
      status: 200,
      headers: corsHeaders
    });
  }
});