import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    console.log('[BW][CLEANUP] Starting cleanup for user:', user.id);

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    console.log('[BW][CLEANUP] Today:', todayStr);

    // 1. Remove ALL future expected entries (projeções antigas)
    console.log('[BW][CLEANUP] Step 1: Removing all future expected entries (old projections)');
    
    const { data: futureExpected, error: futureError } = await supabaseClient
      .from('financial_entries')
      .delete()
      .eq('user_id', user.id)
      .eq('status', 'expected')
      .gte('due_date', todayStr)
      .select('id');
    
    const futureRemovedCount = futureExpected?.length || 0;
    console.log('[BW][CLEANUP] Removed future expected entries:', futureRemovedCount);

    // 2. Build valid recurring/fixed notes from current active receitas/despesas
    const { data: receitas } = await supabaseClient
      .from('receitas')
      .select('id, descricao, tipo, recorrente')
      .eq('user_id', user.id);

    const { data: despesas } = await supabaseClient
      .from('despesas')
      .select('id, descricao, tipo, recorrente')
      .eq('user_id', user.id);

    // Build list of valid recurring descriptions
    const validRecurringNotes = new Set<string>();
    
    receitas?.forEach(r => {
      if (r.recorrente) validRecurringNotes.add(`Recorrente: ${r.descricao}`);
      if ((r as any).tipo === 'fixa') validRecurringNotes.add(`Fixa: ${r.descricao}`);
    });

    despesas?.forEach(d => {
      if (d.recorrente) validRecurringNotes.add(`Recorrente: ${d.descricao}`);
      if ((d as any).tipo === 'fixa') validRecurringNotes.add(`Fixa: ${d.descricao}`);
    });

    console.log('[BW][CLEANUP] Valid recurring/fixed notes:', Array.from(validRecurringNotes));

    // 3. Deduplicate by (note, due_date, kind) - keep most recent
    const { data: allEntries } = await supabaseClient
      .from('financial_entries')
      .select('id, note, due_date, kind, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    const seen = new Map<string, string>(); // key -> id to keep
    const duplicates: string[] = [];

    allEntries?.forEach(entry => {
      const key = `${entry.note}|${entry.due_date}|${entry.kind}`;
      if (seen.has(key)) {
        // This is a duplicate, mark for deletion
        duplicates.push(entry.id);
      } else {
        // This is the first (most recent) occurrence, keep it
        seen.set(key, entry.id);
      }
    });

    let duplicateCount = 0;
    if (duplicates.length > 0) {
      const { error: dedupError } = await supabaseClient
        .from('financial_entries')
        .delete()
        .in('id', duplicates);

      if (dedupError) {
        console.error('[BW][CLEANUP] Error deduplicating:', dedupError);
      } else {
        duplicateCount = duplicates.length;
        console.log('[BW][CLEANUP] Removed duplicates:', duplicateCount);
      }
    }

    console.log('[BW][CLEANUP] === CLEANUP SUMMARY ===');
    console.log('[BW][CLEANUP] Future expected removed:', futureRemovedCount);
    console.log('[BW][CLEANUP] Duplicates removed:', duplicateCount);
    console.log('[BW][CLEANUP] Total cleaned:', futureRemovedCount + duplicateCount);

    return new Response(
      JSON.stringify({
        success: true,
        future_removed: futureRemovedCount,
        duplicates_removed: duplicateCount,
        total_removed: futureRemovedCount + duplicateCount,
        message: `Cleanup complete: ${futureRemovedCount} future projections + ${duplicateCount} duplicates removed`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[BW][CLEANUP] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
