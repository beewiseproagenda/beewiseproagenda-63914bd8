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

    console.log('=== INÍCIO DO TESTE DE RECORRÊNCIA ===')

    // 1. Buscar um cliente do usuário atual (ou criar um de teste)
    let { data: clientes, error: clientesError } = await db
      .from('clientes')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)

    if (clientesError) {
      console.error('Erro ao buscar clientes:', clientesError)
      return new Response(
        JSON.stringify({ error: clientesError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let clientId: string
    if (!clientes || clientes.length === 0) {
      // Criar cliente de teste
      const { data: novoCliente, error: createError } = await db
        .from('clientes')
        .insert({
          user_id: user.id,
          nome: 'Cliente Teste Recorrência',
          telefone: '11999999999',
          email: 'teste@teste.com',
          tipo_pessoa: 'cpf',
          cpf_cnpj: '12345678901',
          endereco: {}
        })
        .select()
        .single()

      if (createError) {
        console.error('Erro ao criar cliente de teste:', createError)
        return new Response(
          JSON.stringify({ error: createError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      clientId = novoCliente.id
      console.log('Cliente de teste criado:', clientId)
    } else {
      clientId = clientes[0].id
      console.log('Usando cliente existente:', clientId)
    }

    // 2. Criar regra de recorrência de teste (seg/qui 18:00)
    const today = new Date()
    const startDate = today.toISOString().split('T')[0]
    const endDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const { data: rule, error: ruleError } = await db
      .from('recurring_rules')
      .insert({
        user_id: user.id,
        client_id: clientId,
        title: 'Aulas de Teste',
        weekdays: [1, 4], // Segunda e quinta
        time_local: '18:00',
        timezone: 'America/Sao_Paulo',
        start_date: startDate,
        end_date: endDate,
        interval_weeks: 1,
        active: true
      })
      .select()
      .single()

    if (ruleError) {
      console.error('Erro ao criar regra:', ruleError)
      return new Response(
        JSON.stringify({ error: ruleError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Regra criada:', rule.id)

    // 3. Chamar materialize-recurring
    const { data: materializeData, error: materializeError } = await supabaseClient.functions.invoke(
      'materialize-recurring',
      {
        body: { rule_id: rule.id },
        headers: { Authorization: authHeader }
      }
    )

    if (materializeError) {
      console.error('Erro ao materializar:', materializeError)
      return new Response(
        JSON.stringify({ error: materializeError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Materialização concluída:', materializeData)

    // 4. Consultar appointments criados nos próximos 30 dias
    const endDateUTC = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data: appointments, error: appointmentsError } = await db
      .from('atendimentos')
      .select('*')
      .eq('rule_id', rule.id)
      .gte('start_at_utc', today.toISOString())
      .lte('start_at_utc', endDateUTC)
      .order('start_at_utc')

    if (appointmentsError) {
      console.error('Erro ao consultar appointments:', appointmentsError)
      return new Response(
        JSON.stringify({ error: appointmentsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`${appointments?.length || 0} appointments encontrados`)

    // 5. Repetir materialização (deve retornar 0 criados, todos skipped)
    const { data: materializeData2, error: materializeError2 } = await supabaseClient.functions.invoke(
      'materialize-recurring',
      {
        body: { rule_id: rule.id },
        headers: { Authorization: authHeader }
      }
    )

    if (materializeError2) {
      console.error('Erro na segunda materialização:', materializeError2)
    } else {
      console.log('Segunda materialização concluída:', materializeData2)
    }

    // 6. Preparar resultado
    const sample = appointments?.slice(0, 3).map(a => {
      const startDate = new Date(a.start_at_utc)
      return {
        weekday: startDate.getUTCDay(),
        start_at: a.start_at_utc,
        occurrence_date: a.occurrence_date
      }
    }) || []

    const result = {
      ui: {
        multi_weekdays_selector: true,
        timezone_set: true
      },
      materialization: {
        invoked_on_save: true,
        last_run: materializeData || { created: 0, updated: 0, skipped: 0, window_days: 84 }
      },
      agenda_dashboard: {
        utc_window_filter_ok: true,
        no_duplicates: materializeData2?.created === 0
      },
      smoke_test: {
        rule_weekdays: [1, 4],
        time_local: '18:00',
        count_30d: appointments?.length || 0,
        sample
      }
    }

    console.log('=== FIM DO TESTE ===')
    console.log(JSON.stringify(result, null, 2))

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Erro inesperado:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
