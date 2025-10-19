import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { toUTCFromLocal, fmt, DEFAULT_TZ, browserTz } from '../_shared/datetime.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-viewer-tz',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: { persistSession: false }
      }
    )

    // Get auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Set auth for supabase client
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create an authenticated client for RLS-aware queries
    const db = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: { persistSession: false },
        global: { headers: { Authorization: authHeader } }
      }
    )

    const body = await req.json()
    const { date, time, tz = DEFAULT_TZ, ...otherFields } = body

    // Validação básica de campos obrigatórios
    if (!date || !time) {
      return new Response(
        JSON.stringify({ error: 'Date and time are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validação de campos críticos de otherFields
    const requiredFields = ['cliente_id', 'servico', 'valor', 'forma_pagamento', 'status']
    const missingFields = requiredFields.filter(field => !otherFields[field])
    
    if (missingFields.length > 0) {
      return new Response(
        JSON.stringify({ error: `Missing required fields: ${missingFields.join(', ')}` }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validação de tipos e limites
    if (typeof otherFields.valor !== 'number' || otherFields.valor <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid valor: must be a positive number' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validação de strings (limite de tamanho e sanitização básica)
    if (otherFields.servico && (typeof otherFields.servico !== 'string' || otherFields.servico.length > 200)) {
      return new Response(
        JSON.stringify({ error: 'Invalid servico: must be a string with max 200 characters' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (otherFields.observacoes && (typeof otherFields.observacoes !== 'string' || otherFields.observacoes.length > 1000)) {
      return new Response(
        JSON.stringify({ error: 'Invalid observacoes: must be a string with max 1000 characters' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validação de enums
    const validFormaPagamento = ['dinheiro', 'pix', 'cartao_debito', 'cartao_credito', 'transferencia', 'outro']
    if (!validFormaPagamento.includes(otherFields.forma_pagamento)) {
      return new Response(
        JSON.stringify({ error: `Invalid forma_pagamento: must be one of ${validFormaPagamento.join(', ')}` }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const validStatus = ['agendado', 'realizado', 'cancelado']
    if (!validStatus.includes(otherFields.status)) {
      return new Response(
        JSON.stringify({ error: `Invalid status: must be one of ${validStatus.join(', ')}` }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get workspace timezone from user profile
    const { data: profile } = await db
      .from('profiles')
      .select('tz')
      .eq('user_id', user.id)
      .maybeSingle()

    const workspaceTz = profile?.tz || DEFAULT_TZ

    // Convert to UTC
    const startAtUtc = toUTCFromLocal(date, time, tz)

    // Create appointment
    const { data: appointment, error } = await db
      .from('atendimentos')
      .insert({
        ...otherFields,
        user_id: user.id,
        start_at_utc: startAtUtc.toISOString(),
        tz: tz,
        // Keep legacy fields for compatibility
        data: date,
        hora: time
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating appointment:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get viewer timezone from header or use workspace timezone
    const viewerTz = req.headers.get('x-viewer-tz') || workspaceTz

    console.log(`Created appointment: ${appointment.id} at ${startAtUtc.toISOString()} (${tz})`)

    return new Response(
      JSON.stringify({
        ok: true,
        appointment: {
          ...appointment,
          viewer: {
            tz: viewerTz,
            date: fmt(startAtUtc, viewerTz, 'DATE'),
            time: fmt(startAtUtc, viewerTz, 'TIME'),
            datetime: fmt(startAtUtc, viewerTz, 'DATETIME')
          },
          workspace_tz: workspaceTz
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
