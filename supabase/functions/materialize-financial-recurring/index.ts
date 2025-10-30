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

      // Handle recorrente=true with monthly aggregation
      const rec = receita.recorrencia as { tipo: string; dia: number };
      if (!rec) continue;

      const receitaStartDate = new Date(receita.data);
      let currentMonthDate = new Date(Math.max(receitaStartDate.getTime(), startDate.getTime()));
      currentMonthDate.setDate(1); // Start at first day of month

      console.log('[BW][FIN_REC] Processing receita:', receita.id, rec.tipo, 'from', currentMonthDate.toISOString().split('T')[0]);

      // Create ONE entry per month with aggregated value
      while (currentMonthDate <= endDate) {
        const year = currentMonthDate.getFullYear();
        const month = currentMonthDate.getMonth();
        
        // Calculate monthly aggregated amount based on recurrence type
        let monthlyAmount = receita.valor;
        
        if (rec.tipo === 'semanal') {
          // Weekly: 4 occurrences per month
          monthlyAmount = receita.valor * 4;
        } else if (rec.tipo === 'diaria') {
          // Daily: number of days in the month
          const daysInMonth = new Date(year, month + 1, 0).getDate();
          monthlyAmount = receita.valor * daysInMonth;
        }
        // mensal: already correct (1x valor)
        
        // Use the recurrence day or first day of month for aggregates
        const targetDay = rec.tipo === 'mensal' 
          ? Math.min(rec.dia, new Date(year, month + 1, 0).getDate())
          : 1; // CRITICAL: Use first day of month for weekly/daily to always appear in current month
        const occurrenceDate = new Date(year, month, targetDay);
        const dueDateStr = occurrenceDate.toISOString().split('T')[0];
        
        // Skip if before start date
        if (occurrenceDate >= receitaStartDate) {
          // Check if entry already exists
          const { data: existing } = await supabase
            .from('financial_entries')
            .select('id, amount')
            .eq('user_id', user.id)
            .eq('kind', 'revenue')
            .eq('due_date', dueDateStr)
            .eq('note', `Recorrente: ${receita.descricao}`)
            .maybeSingle();

          if (!existing) {
            // Create new aggregated entry
            const { error: insertError } = await supabase
              .from('financial_entries')
              .insert({
                user_id: user.id,
                kind: 'revenue',
                status: 'expected',
                amount: monthlyAmount,
                due_date: dueDateStr,
                note: `Recorrente: ${receita.descricao}`,
              });

            if (insertError) {
              console.error('[BW][FIN_REC] Error creating revenue entry:', insertError);
            } else {
              created++;
              console.log(`[BW][FIN_REC] Created ${rec.tipo} revenue entry for ${dueDateStr}: ${monthlyAmount} (${receita.valor} x ${rec.tipo === 'semanal' ? 4 : rec.tipo === 'diaria' ? new Date(year, month + 1, 0).getDate() : 1})`);
            }
          } else if (existing.amount !== monthlyAmount) {
            // Update if amount changed
            const { error: updateError } = await supabase
              .from('financial_entries')
              .update({ amount: monthlyAmount })
              .eq('id', existing.id);

            if (!updateError) {
              updated++;
              console.log(`[BW][FIN_REC] Updated ${rec.tipo} revenue entry for ${dueDateStr}: ${monthlyAmount}`);
            }
          }
        }
        
        // Move to next month
        currentMonthDate.setMonth(currentMonthDate.getMonth() + 1);
        
        // Safety break
        if (currentMonthDate.getFullYear() > endDate.getFullYear() + 1) break;
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

      // Handle recorrente=true with monthly aggregation
      const rec = despesa.recorrencia as { tipo: string; dia: number };
      if (!rec) continue;

      const despesaStartDate = new Date(despesa.data);
      let currentMonthDate = new Date(Math.max(despesaStartDate.getTime(), startDate.getTime()));
      currentMonthDate.setDate(1); // Start at first day of month

      console.log('[BW][FIN_REC] Processing despesa:', despesa.id, rec.tipo, 'from', currentMonthDate.toISOString().split('T')[0]);

      // Create ONE entry per month with aggregated value
      while (currentMonthDate <= endDate) {
        const year = currentMonthDate.getFullYear();
        const month = currentMonthDate.getMonth();
        
        // Calculate monthly aggregated amount based on recurrence type
        let monthlyAmount = despesa.valor;
        
        if (rec.tipo === 'semanal') {
          // Weekly: 4 occurrences per month
          monthlyAmount = despesa.valor * 4;
        } else if (rec.tipo === 'diaria') {
          // Daily: number of days in the month
          const daysInMonth = new Date(year, month + 1, 0).getDate();
          monthlyAmount = despesa.valor * daysInMonth;
        }
        // mensal: already correct (1x valor)
        
        // Use the recurrence day or first day of month for aggregates
        const targetDay = rec.tipo === 'mensal' 
          ? Math.min(rec.dia, new Date(year, month + 1, 0).getDate())
          : 1; // CRITICAL: Use first day of month for weekly/daily to always appear in current month
        const occurrenceDate = new Date(year, month, targetDay);
        const dueDateStr = occurrenceDate.toISOString().split('T')[0];
        
        // Skip if before start date
        if (occurrenceDate >= despesaStartDate) {
          // Check if entry already exists
          const { data: existing } = await supabase
            .from('financial_entries')
            .select('id, amount')
            .eq('user_id', user.id)
            .eq('kind', 'expense')
            .eq('due_date', dueDateStr)
            .eq('note', `Recorrente: ${despesa.descricao}`)
            .maybeSingle();

          if (!existing) {
            // Create new aggregated entry
            const { error: insertError } = await supabase
              .from('financial_entries')
              .insert({
                user_id: user.id,
                kind: 'expense',
                status: 'expected',
                amount: monthlyAmount,
                due_date: dueDateStr,
                note: `Recorrente: ${despesa.descricao}`,
              });

            if (insertError) {
              console.error('[BW][FIN_REC] Error creating expense entry:', insertError);
            } else {
              created++;
              console.log(`[BW][FIN_REC] Created ${rec.tipo} expense entry for ${dueDateStr}: ${monthlyAmount} (${despesa.valor} x ${rec.tipo === 'semanal' ? 4 : rec.tipo === 'diaria' ? new Date(year, month + 1, 0).getDate() : 1})`);
            }
          } else if (existing.amount !== monthlyAmount) {
            // Update if amount changed
            const { error: updateError } = await supabase
              .from('financial_entries')
              .update({ amount: monthlyAmount })
              .eq('id', existing.id);

            if (!updateError) {
              updated++;
              console.log(`[BW][FIN_REC] Updated ${rec.tipo} expense entry for ${dueDateStr}: ${monthlyAmount}`);
            }
          }
        }
        
        // Move to next month
        currentMonthDate.setMonth(currentMonthDate.getMonth() + 1);
        
        // Safety break
        if (currentMonthDate.getFullYear() > endDate.getFullYear() + 1) break;
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
