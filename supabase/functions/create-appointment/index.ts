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

    const body = await req.json()
    const { date, time, tz = DEFAULT_TZ, ...otherFields } = body

    if (!date || !time) {
      return new Response(
        JSON.stringify({ error: 'Date and time are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get workspace timezone from user profile
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('tz')
      .eq('user_id', user.id)
      .single()

    const workspaceTz = profile?.tz || DEFAULT_TZ

    // Convert to UTC
    const startAtUtc = toUTCFromLocal(date, time, tz)

    // Create appointment
    const { data: appointment, error } = await supabaseClient
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
