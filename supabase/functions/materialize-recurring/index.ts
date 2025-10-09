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

    const body = await req.json()
    const { rule_id } = body

    // Buscar regras ativas
    let rulesQuery = db
      .from('recurring_rules')
      .select('*')
      .eq('user_id', user.id)
      .eq('active', true)

    if (rule_id) {
      rulesQuery = rulesQuery.eq('id', rule_id)
    }

    const { data: rules, error: rulesError } = await rulesQuery

    if (rulesError) {
      console.error('Error fetching rules:', rulesError)
      return new Response(
        JSON.stringify({ error: rulesError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!rules || rules.length === 0) {
      return new Response(
        JSON.stringify({ created: 0, updated: 0, skipped: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let totalCreated = 0
    let totalUpdated = 0
    let totalSkipped = 0

    const today = new Date()
    const endWindow = new Date(today)
    endWindow.setDate(endWindow.getDate() + 84) // 12 semanas

    for (const rule of rules) {
      const { id: ruleId, weekdays, time_local, timezone, start_date, end_date, interval_weeks, occurrences_limit, client_id, title } = rule

      let currentDate = new Date(start_date)
      if (currentDate < today) {
        currentDate = new Date(today)
      }

      let occurrencesCount = 0
      const occurrences = []

      while (currentDate <= endWindow) {
        if (end_date && currentDate > new Date(end_date)) {
          break
        }

        if (occurrences_limit && occurrencesCount >= occurrences_limit) {
          break
        }

        const dayOfWeek = currentDate.getDay()
        if (weekdays.includes(dayOfWeek)) {
          const dateLocal = currentDate.toISOString().split('T')[0]
          
          // Converter para UTC
          const [hours, minutes] = time_local.split(':')
          const localDateTime = new Date(currentDate)
          localDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0)
          
          // Simples conversão UTC (assumindo BRT = UTC-3)
          const offset = timezone === 'America/Sao_Paulo' ? 3 : 0
          const utcDateTime = new Date(localDateTime.getTime() + (offset * 60 * 60 * 1000))

          occurrences.push({
            rule_id: ruleId,
            user_id: user.id,
            cliente_id: client_id,
            servico: title,
            valor: 0,
            forma_pagamento: 'a_combinar',
            status: 'confirmed',
            start_at_utc: utcDateTime.toISOString(),
            tz: timezone,
            occurrence_date: dateLocal,
            data: dateLocal,
            hora: time_local,
            observacoes: `Recorrência: ${title}`
          })

          occurrencesCount++
        }

        currentDate.setDate(currentDate.getDate() + 1)
        
        // Pular semanas conforme interval_weeks
        if (interval_weeks > 1 && currentDate.getDay() === 0) {
          currentDate.setDate(currentDate.getDate() + (7 * (interval_weeks - 1)))
        }
      }

      // Inserir ocorrências (upsert)
      for (const occ of occurrences) {
        const { error: insertError } = await db
          .from('atendimentos')
          .upsert(occ, {
            onConflict: 'rule_id,occurrence_date',
            ignoreDuplicates: false
          })

        if (insertError) {
          if (insertError.code === '23505') {
            totalSkipped++
          } else {
            console.error('Error inserting occurrence:', insertError)
          }
        } else {
          totalCreated++
        }
      }
    }

    console.log(`Materialization complete: created=${totalCreated}, updated=${totalUpdated}, skipped=${totalSkipped}`)

    return new Response(
      JSON.stringify({
        ok: true,
        created: totalCreated,
        updated: totalUpdated,
        skipped: totalSkipped
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
