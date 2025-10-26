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

    // 1. Remove future expected entries that don't have a valid recurrence anymore
    // (Receitas/Despesas that were deleted or changed from tipo=fixa/recorrente to tipo=variavel)
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

    console.log('[BW][CLEANUP] Valid recurring notes:', Array.from(validRecurringNotes));

    // Get all future expected entries
    const { data: futureEntries } = await supabaseClient
      .from('financial_entries')
      .select('id, note, due_date, kind, amount')
      .eq('user_id', user.id)
      .eq('status', 'expected')
      .gte('due_date', todayStr);

    let orphanCount = 0;
    const entriesToDelete: string[] = [];

    futureEntries?.forEach(entry => {
      const note = entry.note || '';
      const isRecurringNote = note.startsWith('Recorrente: ') || note.startsWith('Fixa: ');
      
      if (isRecurringNote && !validRecurringNotes.has(note)) {
        // This is an orphan entry (source was deleted or changed)
        entriesToDelete.push(entry.id);
        orphanCount++;
        console.log('[BW][CLEANUP] Found orphan entry:', {
          id: entry.id,
          note,
          due_date: entry.due_date,
          amount: entry.amount
        });
      }
    });

    // Delete orphan entries
    if (entriesToDelete.length > 0) {
      const { error: deleteError } = await supabaseClient
        .from('financial_entries')
        .delete()
        .in('id', entriesToDelete);

      if (deleteError) {
        console.error('[BW][CLEANUP] Error deleting orphans:', deleteError);
      } else {
        console.log('[BW][CLEANUP] Deleted orphan entries:', entriesToDelete.length);
      }
    }

    // 2. Deduplicate by (note, due_date) - keep most recent
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

    return new Response(
      JSON.stringify({
        success: true,
        orphans_removed: orphanCount,
        duplicates_removed: duplicateCount,
        message: `Cleanup complete: ${orphanCount} orphans + ${duplicateCount} duplicates removed`
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
