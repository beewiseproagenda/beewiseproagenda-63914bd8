import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { corsHeaders, handleCors, logSafely } from '../_shared/auth.ts';

serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    logSafely('PING_START', { method: req.method, url: req.url });

    const response = {
      message: 'Pong! Edge Function is working',
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers.entries()),
      environment: {
        SUPABASE_URL: !!Deno.env.get('SUPABASE_URL'),
        MERCADOPAGO_ACCESS_TOKEN: !!Deno.env.get('MERCADOPAGO_ACCESS_TOKEN'),
        APP_URL: !!Deno.env.get('APP_URL'),
      }
    };

    logSafely('PING_SUCCESS', { hasRequiredEnvs: true });

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      },
    });
  } catch (error) {
    logSafely('PING_ERROR', { error: error.message });
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      }
    );
  }
});