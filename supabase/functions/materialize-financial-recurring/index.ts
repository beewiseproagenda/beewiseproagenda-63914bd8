import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RecurringEntry {
  id: string;
  user_id: string;
  data: string; // DATE
  valor: number;
  descricao: string;
  categoria?: string;
  tipo?: string; // for despesas
  forma_pagamento?: string; // for receitas
  recorrente: boolean;
  recorrencia: {
    tipo: 'diaria' | 'semanal' | 'mensal';
    dia: number;
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    console.log('[BW][FIN_REC] Materializing financial recurrences for user:', user.id);

    // Constants
    const WINDOW_DAYS = 180;
    const today = new Date();
    const startDate = new Date(today);
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + WINDOW_DAYS);

    let created = 0;
    let updated = 0;

    // ============================================
    // RECEITAS RECORRENTES ou TIPO=FIXA
    // ============================================
    const { data: receitasRecorrentes, error: receitasError } = await supabase
      .from('receitas')
      .select('*')
      .eq('user_id', user.id)
      .or('recorrente.eq.true,tipo.eq.fixa');

    if (receitasError) {
      console.error('[BW][FIN_REC] Error fetching receitas:', receitasError);
      throw receitasError;
    }

    console.log('[BW][RECEITA_FIXA] Found', receitasRecorrentes?.length || 0, 'recurring or fixed receitas');

    for (const receita of (receitasRecorrentes || [])) {
      // Handle tipo=fixa (monthly fixed revenue)
      if (receita.tipo === 'fixa') {
        const receitaStartDate = new Date(receita.data);
        const startDay = receitaStartDate.getDate();
        const currentDate = new Date(Math.max(receitaStartDate.getTime(), startDate.getTime()));

        console.log('[BW][RECEITA_FIXA] Processing fixed receita:', receita.id, 'day', startDay, 'from', currentDate.toISOString().split('T')[0]);

        while (currentDate <= endDate) {
          const targetDay = Math.min(startDay, new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate());
          const occurrenceDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), targetDay);
          
          if (occurrenceDate >= receitaStartDate && occurrenceDate <= endDate) {
            const dueDateStr = occurrenceDate.toISOString().split('T')[0];
            
            // Check if entry already exists
            const { data: existing } = await supabase
              .from('financial_entries')
              .select('id')
              .eq('user_id', user.id)
              .eq('kind', 'revenue')
              .eq('due_date', dueDateStr)
              .eq('note', `Fixa: ${receita.descricao}`)
              .maybeSingle();

            if (!existing) {
              // Create new entry
              const { error: insertError } = await supabase
                .from('financial_entries')
                .insert({
                  user_id: user.id,
                  kind: 'revenue',
                  status: 'expected',
                  amount: receita.valor,
                  due_date: dueDateStr,
                  note: `Fixa: ${receita.descricao}`,
                });

              if (insertError) {
                console.error('[BW][RECEITA_FIXA] Error creating fixed revenue entry:', insertError);
              } else {
                created++;
                console.log('[BW][RECEITA_FIXA] Created fixed revenue entry for', dueDateStr);
              }
            }
          }
          
          // Move to next month
          currentDate.setMonth(currentDate.getMonth() + 1);
          
          // Safety break for infinite loops
          if (currentDate.getFullYear() > endDate.getFullYear() + 1) break;
        }
        
        continue; // Skip recurrence logic for tipo=fixa
      }

      // Handle recorrente=true (existing logic)
      const rec = receita.recorrencia as { tipo: string; dia: number };
      if (!rec) continue;

      const receitaStartDate = new Date(receita.data);
      const currentDate = new Date(Math.max(receitaStartDate.getTime(), startDate.getTime()));

      console.log('[BW][FIN_REC] Processing receita:', receita.id, rec.tipo, 'from', currentDate.toISOString().split('T')[0]);

      while (currentDate <= endDate) {
        let shouldCreate = false;
        let occurrenceDate: Date | null = null;

        if (rec.tipo === 'mensal') {
          // Monthly recurrence on specific day
          const targetDay = Math.min(rec.dia, new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate());
          occurrenceDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), targetDay);
          
          if (occurrenceDate >= receitaStartDate && occurrenceDate <= endDate && occurrenceDate >= currentDate) {
            shouldCreate = true;
          }
          
          // Move to next month
          currentDate.setMonth(currentDate.getMonth() + 1);
        } else if (rec.tipo === 'semanal') {
          // Weekly recurrence
          occurrenceDate = new Date(currentDate);
          shouldCreate = true;
          
          // Move to next week
          currentDate.setDate(currentDate.getDate() + 7);
        } else if (rec.tipo === 'diaria') {
          // Daily recurrence
          occurrenceDate = new Date(currentDate);
          shouldCreate = true;
          
          // Move to next day
          currentDate.setDate(currentDate.getDate() + 1);
        }

        if (shouldCreate && occurrenceDate) {
          const dueDateStr = occurrenceDate.toISOString().split('T')[0];
          
          // Check if entry already exists
          const { data: existing } = await supabase
            .from('financial_entries')
            .select('id')
            .eq('user_id', user.id)
            .eq('kind', 'revenue')
            .eq('due_date', dueDateStr)
            .eq('note', `Recorrente: ${receita.descricao}`)
            .maybeSingle();

          if (!existing) {
            // Create new entry
            const { error: insertError } = await supabase
              .from('financial_entries')
              .insert({
                user_id: user.id,
                kind: 'revenue',
                status: 'expected',
                amount: receita.valor,
                due_date: dueDateStr,
                note: `Recorrente: ${receita.descricao}`,
              });

            if (insertError) {
              console.error('[BW][FIN_REC] Error creating revenue entry:', insertError);
            } else {
              created++;
              console.log('[BW][FIN_REC] Created revenue entry for', dueDateStr);
            }
          }
        }

        // Safety break for infinite loops
        if (rec.tipo === 'mensal' && currentDate.getFullYear() > endDate.getFullYear() + 1) break;
        if (rec.tipo !== 'mensal' && currentDate > endDate) break;
      }
    }

    // ============================================
    // DESPESAS RECORRENTES ou TIPO=FIXA
    // ============================================
    const { data: despesasRecorrentes, error: despesasError } = await supabase
      .from('despesas')
      .select('*')
      .eq('user_id', user.id)
      .or('recorrente.eq.true,tipo.eq.fixa');

    if (despesasError) {
      console.error('[BW][FIN_REC] Error fetching despesas:', despesasError);
      throw despesasError;
    }

    console.log('[BW][RECEITA_FIXA] Found', despesasRecorrentes?.length || 0, 'recurring or fixed despesas');

    for (const despesa of (despesasRecorrentes || [])) {
      // Handle tipo=fixa (monthly fixed expense)
      if (despesa.tipo === 'fixa') {
        const despesaStartDate = new Date(despesa.data);
        const startDay = despesaStartDate.getDate();
        const currentDate = new Date(Math.max(despesaStartDate.getTime(), startDate.getTime()));

        console.log('[BW][RECEITA_FIXA] Processing fixed despesa:', despesa.id, 'day', startDay, 'from', currentDate.toISOString().split('T')[0]);

        while (currentDate <= endDate) {
          const targetDay = Math.min(startDay, new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate());
          const occurrenceDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), targetDay);
          
          if (occurrenceDate >= despesaStartDate && occurrenceDate <= endDate) {
            const dueDateStr = occurrenceDate.toISOString().split('T')[0];
            
            // Check if entry already exists
            const { data: existing } = await supabase
              .from('financial_entries')
              .select('id')
              .eq('user_id', user.id)
              .eq('kind', 'expense')
              .eq('due_date', dueDateStr)
              .eq('note', `Fixa: ${despesa.descricao}`)
              .maybeSingle();

            if (!existing) {
              // Create new entry
              const { error: insertError } = await supabase
                .from('financial_entries')
                .insert({
                  user_id: user.id,
                  kind: 'expense',
                  status: 'expected',
                  amount: despesa.valor,
                  due_date: dueDateStr,
                  note: `Fixa: ${despesa.descricao}`,
                });

              if (insertError) {
                console.error('[BW][RECEITA_FIXA] Error creating fixed expense entry:', insertError);
              } else {
                created++;
                console.log('[BW][RECEITA_FIXA] Created fixed expense entry for', dueDateStr);
              }
            }
          }
          
          // Move to next month
          currentDate.setMonth(currentDate.getMonth() + 1);
          
          // Safety break for infinite loops
          if (currentDate.getFullYear() > endDate.getFullYear() + 1) break;
        }
        
        continue; // Skip recurrence logic for tipo=fixa
      }

      // Handle recorrente=true (existing logic)
      const rec = despesa.recorrencia as { tipo: string; dia: number };
      if (!rec) continue;

      const despesaStartDate = new Date(despesa.data);
      const currentDate = new Date(Math.max(despesaStartDate.getTime(), startDate.getTime()));

      console.log('[BW][FIN_REC] Processing despesa:', despesa.id, rec.tipo, 'from', currentDate.toISOString().split('T')[0]);

      while (currentDate <= endDate) {
        let shouldCreate = false;
        let occurrenceDate: Date | null = null;

        if (rec.tipo === 'mensal') {
          // Monthly recurrence on specific day
          const targetDay = Math.min(rec.dia, new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate());
          occurrenceDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), targetDay);
          
          if (occurrenceDate >= despesaStartDate && occurrenceDate <= endDate && occurrenceDate >= currentDate) {
            shouldCreate = true;
          }
          
          // Move to next month
          currentDate.setMonth(currentDate.getMonth() + 1);
        } else if (rec.tipo === 'semanal') {
          // Weekly recurrence
          occurrenceDate = new Date(currentDate);
          shouldCreate = true;
          
          // Move to next week
          currentDate.setDate(currentDate.getDate() + 7);
        } else if (rec.tipo === 'diaria') {
          // Daily recurrence
          occurrenceDate = new Date(currentDate);
          shouldCreate = true;
          
          // Move to next day
          currentDate.setDate(currentDate.getDate() + 1);
        }

        if (shouldCreate && occurrenceDate) {
          const dueDateStr = occurrenceDate.toISOString().split('T')[0];
          
          // Check if entry already exists
          const { data: existing } = await supabase
            .from('financial_entries')
            .select('id')
            .eq('user_id', user.id)
            .eq('kind', 'expense')
            .eq('due_date', dueDateStr)
            .eq('note', `Recorrente: ${despesa.descricao}`)
            .maybeSingle();

          if (!existing) {
            // Create new entry
            const { error: insertError } = await supabase
              .from('financial_entries')
              .insert({
                user_id: user.id,
                kind: 'expense',
                status: 'expected',
                amount: despesa.valor,
                due_date: dueDateStr,
                note: `Recorrente: ${despesa.descricao}`,
              });

            if (insertError) {
              console.error('[BW][FIN_REC] Error creating expense entry:', insertError);
            } else {
              created++;
              console.log('[BW][FIN_REC] Created expense entry for', dueDateStr);
            }
          }
        }

        // Safety break for infinite loops
        if (rec.tipo === 'mensal' && currentDate.getFullYear() > endDate.getFullYear() + 1) break;
        if (rec.tipo !== 'mensal' && currentDate > endDate) break;
      }
    }

    console.log('[BW][FIN_REC] Materialization complete. Created:', created, 'Updated:', updated);

    return new Response(
      JSON.stringify({
        success: true,
        created,
        updated,
        window_days: WINDOW_DAYS,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[BW][FIN_REC] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
