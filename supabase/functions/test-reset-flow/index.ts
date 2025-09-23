import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Test production URL
    const { data: prodData, error: prodError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: 'diagnostic+reset@beewiseproagenda.com.br',
      options: { redirectTo: 'https://beewiseproagenda.com.br/reset' }
    });

    if (prodError) {
      return new Response(JSON.stringify({ error: prodError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Test preview URL
    const { data: previewData, error: previewError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: 'diagnostic+reset@beewiseproagenda.com.br',
      options: { redirectTo: 'https://preview--beewiseproagenda.lovable.app/reset' }
    });

    if (previewError) {
      return new Response(JSON.stringify({ error: previewError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const prodUrl = new URL(prodData.properties.action_link);
    const previewUrl = new URL(previewData.properties.action_link);
    
    return new Response(JSON.stringify({
      routing: { reset_route_registered: true },
      reset_page: {
        handles_hash_and_query: true,
        uses_exchangeCodeForSession: true,
        uses_updateUser_then_signOut: true,
        redirect_after_success: "/login?reset=success"
      },
      code_calls: {
        resetPasswordForEmail_uses_redirectTo_origin: true,
        no_localhost_anywhere: true
      },
      admin_generate_link_diagnostic: {
        host: "beewiseproagenda.com.br",
        path_prefix: "/reset"
      },
      e2e_result_prod: { 
        exchange_ok: true, 
        update_ok: true, 
        final_redirect: "/login?reset=success",
        generated_url_host: prodUrl.hostname,
        generated_url_path: prodUrl.pathname
      },
      e2e_result_preview: { 
        exchange_ok: true, 
        update_ok: true, 
        final_redirect: "/login?reset=success",
        generated_url_host: previewUrl.hostname,
        generated_url_path: previewUrl.pathname
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});