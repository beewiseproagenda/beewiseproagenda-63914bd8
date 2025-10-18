// Edge Function: diag-amounts
// Diagnóstico de valores em recurring rules, appointments e financial_entries

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

    const db = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: { persistSession: false },
        global: { headers: { Authorization: authHeader } }
      }
    )

    console.log('[diag-amounts] Running diagnostics for user:', user.id);

    // 1. Check recurring_rules
    const { data: rules, error: rulesError } = await db
      .from('recurring_rules')
      .select('id, amount, active, client_id')
      .eq('user_id', user.id);

    if (rulesError) throw rulesError;

    const rulesTotal = rules?.length || 0;
    const rulesWithAmount = rules?.filter(r => r.amount != null && r.amount > 0).length || 0;
    const rulesWithoutAmount = rulesTotal - rulesWithAmount;

    // 2. Check future appointments without amount
    const { data: appointmentsFuture, error: apptError } = await db
      .from('atendimentos')
      .select('id, recurring_rule_id, occurrence_date, valor, status')
      .eq('user_id', user.id)
      .gte('occurrence_date', new Date().toISOString().split('T')[0])
      .not('status', 'in', '(realizado)')
      .order('occurrence_date', { ascending: true });

    if (apptError) throw apptError;

    const appointmentsFutureTotal = appointmentsFuture?.length || 0;
    const appointmentsFutureWithoutAmount = appointmentsFuture?.filter(a => 
      a.recurring_rule_id && (a.valor == null || a.valor === 0)
    ).length || 0;

    // 3. Check future financial_entries without amount
    const { data: financeFuture, error: finError } = await db
      .from('financial_entries')
      .select('id, appointment_id, amount, status, due_date')
      .eq('user_id', user.id)
      .gte('due_date', new Date().toISOString().split('T')[0])
      .eq('status', 'expected')
      .order('due_date', { ascending: true });

    if (finError) throw finError;

    const financeFutureTotal = financeFuture?.length || 0;
    const financeFutureWithoutAmount = financeFuture?.filter(f => 
      f.appointment_id && (f.amount == null || f.amount === 0)
    ).length || 0;

    // 4. Sample missing appointments
    const sampleMissing = appointmentsFuture
      ?.filter(a => a.recurring_rule_id && (a.valor == null || a.valor === 0))
      .slice(0, 5)
      .map(a => ({
        id: a.id,
        recurring_rule_id: a.recurring_rule_id,
        occurrence_date: a.occurrence_date,
        valor: a.valor,
        status: a.status
      })) || [];

    // 5. Check if clients have package values
    const { data: clientsWithPackages, error: clientsError } = await db
      .from('clientes')
      .select('id, nome, pacote_id')
      .eq('user_id', user.id)
      .not('pacote_id', 'is', null);

    if (clientsError) throw clientsError;

    const result = {
      ok: true,
      rules: {
        total: rulesTotal,
        with_amount: rulesWithAmount,
        without_amount: rulesWithoutAmount,
        active: rules?.filter(r => r.active).length || 0
      },
      appointments_future: {
        total: appointmentsFutureTotal,
        without_amount: appointmentsFutureWithoutAmount,
        percentage_missing: appointmentsFutureTotal > 0 
          ? ((appointmentsFutureWithoutAmount / appointmentsFutureTotal) * 100).toFixed(1)
          : '0'
      },
      finance_expected_future: {
        total: financeFutureTotal,
        without_amount: financeFutureWithoutAmount,
        percentage_missing: financeFutureTotal > 0
          ? ((financeFutureWithoutAmount / financeFutureTotal) * 100).toFixed(1)
          : '0'
      },
      clients_with_packages: clientsWithPackages?.length || 0,
      sample_missing: sampleMissing,
      timestamp: new Date().toISOString()
    };

    console.log('[diag-amounts] Results:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('[diag-amounts] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
