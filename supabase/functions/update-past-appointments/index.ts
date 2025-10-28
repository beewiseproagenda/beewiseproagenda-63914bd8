import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('[update-past-appointments] Starting batch status update...');

    // Find all appointments with status=agendado where end_at <= now
    const now = new Date().toISOString();
    
    const { data: pastAppointments, error: selectError } = await supabase
      .from('atendimentos')
      .select('id, user_id, start_at_utc, end_at, data, hora, status')
      .eq('status', 'agendado')
      .lte('end_at', now);

    if (selectError) {
      console.error('[update-past-appointments] Error selecting:', selectError);
      throw selectError;
    }

    if (!pastAppointments || pastAppointments.length === 0) {
      console.log('[update-past-appointments] No appointments to update');
      return new Response(
        JSON.stringify({ 
          success: true, 
          updated: 0,
          message: 'No appointments to update' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[update-past-appointments] Found ${pastAppointments.length} appointments to update`);

    // Update all in batch
    const { error: updateError } = await supabase
      .from('atendimentos')
      .update({ status: 'realizado' })
      .in('id', pastAppointments.map(a => a.id));

    if (updateError) {
      console.error('[update-past-appointments] Error updating:', updateError);
      throw updateError;
    }

    console.log(`[update-past-appointments] Successfully updated ${pastAppointments.length} appointments`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        updated: pastAppointments.length,
        appointments: pastAppointments.map(a => ({ id: a.id, user_id: a.user_id }))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[update-past-appointments] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
