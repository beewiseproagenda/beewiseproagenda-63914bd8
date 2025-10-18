// Edge Function: backfill-amounts
// Backfill de valores em appointments e financial_entries futuros

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

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    console.log('[backfill-amounts] Starting backfill for user:', user.id);

    let appointmentsUpdated = 0;
    let financeUpdated = 0;
    let skippedPaidOrCustom = 0;

    // 1. Get all active recurring rules with amounts
    const { data: rules, error: rulesError } = await serviceClient
      .from('recurring_rules')
      .select('id, amount, client_id, active')
      .eq('user_id', user.id)
      .eq('active', true);

    if (rulesError) throw rulesError;

    console.log('[backfill-amounts] Found', rules?.length || 0, 'active rules');

    // 2. For each rule, get package value and update appointments
    for (const rule of rules || []) {
      // Get package value for client
      const { data: cliente, error: clienteError } = await serviceClient
        .from('clientes')
        .select('pacote_id')
        .eq('id', rule.client_id)
        .single();

      if (clienteError) {
        console.warn('[backfill-amounts] Error fetching client:', clienteError);
        continue;
      }

      let packageValue = 0;
      if (cliente?.pacote_id) {
        const { data: pacote, error: pacoteError } = await serviceClient
          .from('servicos_pacotes')
          .select('valor')
          .eq('id', cliente.pacote_id)
          .single();

        if (!pacoteError && pacote) {
          packageValue = Number(pacote.valor) || 0;
        }
      }

      // Priority: rule.amount > packageValue > 0
      const amountToUse = rule.amount ?? packageValue;

      console.log('[backfill-amounts] Rule', rule.id, 'amount:', amountToUse);

      // 3. Update future appointments without amount
      const { data: appointmentsToUpdate, error: apptFetchError } = await serviceClient
        .from('atendimentos')
        .select('id, valor, status')
        .eq('recurring_rule_id', rule.id)
        .eq('user_id', user.id)
        .gte('occurrence_date', new Date().toISOString().split('T')[0])
        .or('valor.is.null,valor.eq.0');

      if (apptFetchError) {
        console.warn('[backfill-amounts] Error fetching appointments:', apptFetchError);
        continue;
      }

      for (const appt of appointmentsToUpdate || []) {
        // Skip if paid/realized or has custom value
        if (appt.status === 'realizado' || (appt.valor && appt.valor > 0)) {
          skippedPaidOrCustom++;
          continue;
        }

        const { error: updateError } = await serviceClient
          .from('atendimentos')
          .update({ valor: amountToUse })
          .eq('id', appt.id);

        if (!updateError) {
          appointmentsUpdated++;
        } else {
          console.warn('[backfill-amounts] Error updating appointment:', updateError);
        }
      }

      // 4. Update future financial_entries without amount
      const { data: financeToUpdate, error: finFetchError } = await serviceClient
        .from('financial_entries')
        .select('id, amount, status, appointment_id')
        .eq('user_id', user.id)
        .gte('due_date', new Date().toISOString().split('T')[0])
        .eq('status', 'expected')
        .or('amount.is.null,amount.eq.0')
        .in('appointment_id', (appointmentsToUpdate || []).map(a => a.id));

      if (finFetchError) {
        console.warn('[backfill-amounts] Error fetching finance entries:', finFetchError);
        continue;
      }

      for (const fin of financeToUpdate || []) {
        const { error: updateError } = await serviceClient
          .from('financial_entries')
          .update({ amount: amountToUse })
          .eq('id', fin.id);

        if (!updateError) {
          financeUpdated++;
        } else {
          console.warn('[backfill-amounts] Error updating finance entry:', updateError);
        }
      }
    }

    const result = {
      ok: true,
      appointments_updated: appointmentsUpdated,
      finance_expected_updated: financeUpdated,
      rules_considered: rules?.length || 0,
      skipped_paid_or_custom: skippedPaidOrCustom,
      timestamp: new Date().toISOString()
    };

    console.log('[backfill-amounts] Results:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('[backfill-amounts] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
