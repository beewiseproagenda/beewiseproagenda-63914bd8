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
      // Handle tipo=fixa (monthly fixed revenue) - DEPRECATED, use recorrente flag instead
      if (receita.tipo === 'fixa' && !receita.recorrente) {
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

      // Handle recorrente=true with new structure
      if (!receita.recorrente || !receita.recorrencia) continue;
      
      const rec = receita.recorrencia;
      const receitaStartDate = rec.startDate ? new Date(rec.startDate) : new Date(receita.data);
      const receitaEndDate = rec.endDate ? new Date(rec.endDate) : endDate;
      
      console.log('[BW][FIN_REC] Processing receita:', receita.id, rec.tipo, 'from', receitaStartDate.toISOString().split('T')[0], 'to', receitaEndDate.toISOString().split('T')[0]);

      // Iterate through each month in the window
      let currentMonthDate = new Date(Math.max(receitaStartDate.getTime(), startDate.getTime()));
      currentMonthDate.setDate(1); // Start at first day of month
      
      while (currentMonthDate <= Math.min(receitaEndDate, endDate)) {
        const year = currentMonthDate.getFullYear();
        const month = currentMonthDate.getMonth();
        const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
        
        let monthlyAmount = 0;
        let targetDay = 1;
        
        if (rec.tipo === 'mensal') {
          // Monthly: 1x valor base (check interval)
          const dayOfMonth = rec.dayOfMonth || 1;
          const intervalMonths = rec.intervalMonths || 1;
          
          // Calculate months difference from start
          const monthsDiff = (year - receitaStartDate.getFullYear()) * 12 + (month - receitaStartDate.getMonth());
          
          if (monthsDiff >= 0 && monthsDiff % intervalMonths === 0) {
            monthlyAmount = receita.valor;
            targetDay = Math.min(dayOfMonth, new Date(year, month + 1, 0).getDate());
          }
        } else if (rec.tipo === 'semanal') {
          // Weekly: (valor × dias_semana_marcados) × (4 / intervalo_semanas)
          const weekdays = rec.weekdays || [];
          const intervalWeeks = rec.intervalWeeks || 1;
          
          if (weekdays.length > 0) {
            const valorSemanal = receita.valor * weekdays.length;
            const fatorSemanas = 4 / intervalWeeks;
            monthlyAmount = valorSemanal * fatorSemanas;
            targetDay = 1; // Use first day of month for weekly aggregates
          }
        } else if (rec.tipo === 'diaria') {
          // Daily: valor × dias ativos no mês
          const firstDay = new Date(year, month, 1);
          const lastDay = new Date(year, month + 1, 0);
          
          // Calculate active days in this month
          let activeDays = 0;
          if (receitaStartDate <= lastDay && receitaEndDate >= firstDay) {
            const effectiveStart = receitaStartDate > firstDay ? receitaStartDate : firstDay;
            const effectiveEnd = receitaEndDate < lastDay ? receitaEndDate : lastDay;
            activeDays = Math.ceil((effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          }
          
          monthlyAmount = receita.valor * activeDays;
          targetDay = 1; // Use first day of month for daily aggregates
        }
        
        // Create or update entry if amount > 0
        if (monthlyAmount > 0) {
          const occurrenceDate = new Date(year, month, targetDay);
          const dueDateStr = occurrenceDate.toISOString().split('T')[0];
          
          // Check if entry already exists
          const { data: existing } = await supabase
            .from('financial_entries')
            .select('id, amount')
            .eq('user_id', user.id)
            .eq('kind', 'revenue')
            .eq('due_date', dueDateStr)
            .ilike('note', `%${receita.descricao}%`)
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
                note: `Recorrente (${rec.tipo}): ${receita.descricao}`,
              });

            if (insertError) {
              console.error('[BW][FIN_REC] Error creating revenue entry:', insertError);
            } else {
              created++;
              console.log(`[BW][FIN_REC] Created ${rec.tipo} revenue entry for ${monthKey}: ${monthlyAmount.toFixed(2)}`);
            }
          } else if (Math.abs(existing.amount - monthlyAmount) > 0.01) {
            // Update if amount changed
            const { error: updateError } = await supabase
              .from('financial_entries')
              .update({ amount: monthlyAmount })
              .eq('id', existing.id);

            if (!updateError) {
              updated++;
              console.log(`[BW][FIN_REC] Updated ${rec.tipo} revenue entry for ${monthKey}: ${monthlyAmount.toFixed(2)}`);
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
      // Handle tipo=fixa (monthly fixed expense) - DEPRECATED, use recorrente flag instead
      if (despesa.tipo === 'fixa' && !despesa.recorrente) {
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

      // Handle recorrente=true with new structure
      if (!despesa.recorrente || !despesa.recorrencia) continue;
      
      const rec = despesa.recorrencia;
      const despesaStartDate = rec.startDate ? new Date(rec.startDate) : new Date(despesa.data);
      const despesaEndDate = rec.endDate ? new Date(rec.endDate) : endDate;
      
      console.log('[BW][FIN_REC] Processing despesa:', despesa.id, rec.tipo, 'from', despesaStartDate.toISOString().split('T')[0], 'to', despesaEndDate.toISOString().split('T')[0]);

      // Iterate through each month in the window
      let currentMonthDate = new Date(Math.max(despesaStartDate.getTime(), startDate.getTime()));
      currentMonthDate.setDate(1); // Start at first day of month
      
      while (currentMonthDate <= Math.min(despesaEndDate, endDate)) {
        const year = currentMonthDate.getFullYear();
        const month = currentMonthDate.getMonth();
        const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
        
        let monthlyAmount = 0;
        let targetDay = 1;
        
        if (rec.tipo === 'mensal') {
          // Monthly: 1x valor base (check interval)
          const dayOfMonth = rec.dayOfMonth || 1;
          const intervalMonths = rec.intervalMonths || 1;
          
          // Calculate months difference from start
          const monthsDiff = (year - despesaStartDate.getFullYear()) * 12 + (month - despesaStartDate.getMonth());
          
          if (monthsDiff >= 0 && monthsDiff % intervalMonths === 0) {
            monthlyAmount = despesa.valor;
            targetDay = Math.min(dayOfMonth, new Date(year, month + 1, 0).getDate());
          }
        } else if (rec.tipo === 'semanal') {
          // Weekly: (valor × dias_semana_marcados) × (4 / intervalo_semanas)
          const weekdays = rec.weekdays || [];
          const intervalWeeks = rec.intervalWeeks || 1;
          
          if (weekdays.length > 0) {
            const valorSemanal = despesa.valor * weekdays.length;
            const fatorSemanas = 4 / intervalWeeks;
            monthlyAmount = valorSemanal * fatorSemanas;
            targetDay = 1; // Use first day of month for weekly aggregates
          }
        } else if (rec.tipo === 'diaria') {
          // Daily: valor × dias ativos no mês
          const firstDay = new Date(year, month, 1);
          const lastDay = new Date(year, month + 1, 0);
          
          // Calculate active days in this month
          let activeDays = 0;
          if (despesaStartDate <= lastDay && despesaEndDate >= firstDay) {
            const effectiveStart = despesaStartDate > firstDay ? despesaStartDate : firstDay;
            const effectiveEnd = despesaEndDate < lastDay ? despesaEndDate : lastDay;
            activeDays = Math.ceil((effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          }
          
          monthlyAmount = despesa.valor * activeDays;
          targetDay = 1; // Use first day of month for daily aggregates
        }
        
        // Create or update entry if amount > 0
        if (monthlyAmount > 0) {
          const occurrenceDate = new Date(year, month, targetDay);
          const dueDateStr = occurrenceDate.toISOString().split('T')[0];
          
          // Check if entry already exists
          const { data: existing } = await supabase
            .from('financial_entries')
            .select('id, amount')
            .eq('user_id', user.id)
            .eq('kind', 'expense')
            .eq('due_date', dueDateStr)
            .ilike('note', `%${despesa.descricao}%`)
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
                note: `Recorrente (${rec.tipo}): ${despesa.descricao}`,
              });

            if (insertError) {
              console.error('[BW][FIN_REC] Error creating expense entry:', insertError);
            } else {
              created++;
              console.log(`[BW][FIN_REC] Created ${rec.tipo} expense entry for ${monthKey}: ${monthlyAmount.toFixed(2)}`);
            }
          } else if (Math.abs(existing.amount - monthlyAmount) > 0.01) {
            // Update if amount changed
            const { error: updateError } = await supabase
              .from('financial_entries')
              .update({ amount: monthlyAmount })
              .eq('id', existing.id);

            if (!updateError) {
              updated++;
              console.log(`[BW][FIN_REC] Updated ${rec.tipo} expense entry for ${monthKey}: ${monthlyAmount.toFixed(2)}`);
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
