import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { fmt, DEFAULT_TZ } from '../_shared/datetime.ts'

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

    // Get query parameters
    const url = new URL(req.url)
    const startDate = url.searchParams.get('start_date')
    const endDate = url.searchParams.get('end_date')

    // Get workspace timezone from user profile
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('tz')
      .eq('user_id', user.id)
      .single()

    const workspaceTz = profile?.tz || DEFAULT_TZ

    // Get viewer timezone from header or use workspace timezone
    const viewerTz = req.headers.get('x-viewer-tz') || workspaceTz

    // Build query
    let query = supabaseClient
      .from('atendimentos')
      .select('*')
      .eq('user_id', user.id)
      .order('start_at_utc', { ascending: true })

    // Add date filters if provided (using UTC range)
    if (startDate) {
      query = query.gte('start_at_utc', new Date(startDate).toISOString())
    }
    if (endDate) {
      query = query.lte('start_at_utc', new Date(endDate).toISOString())
    }

    const { data: appointments, error } = await query

    if (error) {
      console.error('Error fetching appointments:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Format appointments with timezone information
    const formattedAppointments = appointments?.map(appointment => {
      const startAtUtc = new Date(appointment.start_at_utc)
      
      return {
        ...appointment,
        viewer_formatted: {
          date: fmt(startAtUtc, viewerTz, 'DATE'),
          time: fmt(startAtUtc, viewerTz, 'TIME'),
          datetime: fmt(startAtUtc, viewerTz, 'DATETIME')
        },
        workspace_formatted: {
          date: fmt(startAtUtc, workspaceTz, 'DATE'),
          time: fmt(startAtUtc, workspaceTz, 'TIME'),
          datetime: fmt(startAtUtc, workspaceTz, 'DATETIME')
        }
      }
    }) || []

    console.log(`Listed ${formattedAppointments.length} appointments for user ${user.id}`)

    return new Response(
      JSON.stringify({
        ok: true,
        appointments: formattedAppointments,
        viewer_tz: viewerTz,
        workspace_tz: workspaceTz
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