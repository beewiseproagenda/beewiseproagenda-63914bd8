// Edge Function: materialize-recurring
// Delegates to fn_materialize_rule SQL function for recurring appointment materialization

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[materialize-recurring] User authenticated:', user.id);

    const db = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: { persistSession: false },
        global: { headers: { Authorization: authHeader } }
      }
    )

    const body = await req.json().catch(() => ({}))
    const { rule_id, window_days = 180 } = body

    if (rule_id) {
      // Materialize specific rule using SQL function
      console.log(`[materialize-recurring] Materializing rule ${rule_id} with window ${window_days} days`);
      
      const { data, error } = await db.rpc('fn_materialize_rule', {
        p_rule_id: rule_id,
        p_window_days: window_days,
      });

      if (error) {
        console.error('[materialize-recurring] Error calling fn_materialize_rule:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        });
      }

      console.log('[materialize-recurring] Result:', data);
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    } else {
      // Materialize all active rules for user
      console.log(`[materialize-recurring] Materializing all active rules for user ${user.id}`);
      
      const { data: rules, error: rulesError } = await db
        .from('recurring_rules')
        .select('id')
        .eq('user_id', user.id)
        .eq('active', true);

      if (rulesError) {
        console.error('[materialize-recurring] Error fetching rules:', rulesError);
        return new Response(JSON.stringify({ error: rulesError.message }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        });
      }

      const results = [];
      for (const rule of rules || []) {
        const { data, error } = await db.rpc('fn_materialize_rule', {
          p_rule_id: rule.id,
          p_window_days: window_days,
        });

        if (!error && data) {
          results.push({ rule_id: rule.id, ...data });
        }
      }

      console.log(`[materialize-recurring] Materialized ${results.length} rules`);
      return new Response(JSON.stringify({ results, total_rules: results.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }
  } catch (error) {
    console.error('[materialize-recurring] Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})