import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { Tables } from '@/integrations/supabase/types';
import { browserTz, toUTCFromLocal, DEFAULT_TZ, fmt, utcToViewer } from '@/utils/datetime';
import { sanitizeAppointmentCreate, sanitizeAppointmentUpdate } from '@/utils/sanitizeAppointment';

export type Cliente = Tables<'clientes'>;
export type Atendimento = Tables<'atendimentos'>;
export type ServicoPacote = Tables<'servicos_pacotes'>;
export type Despesa = Tables<'despesas'>;
export type Receita = Tables<'receitas'>;
export type FinancialEntry = Tables<'financial_entries'>;
export type RecurringRule = Tables<'recurring_rules'>;

export const useSupabaseData = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [servicosPacotes, setServicosPacotes] = useState<ServicoPacote[]>([]);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [receitas, setReceitas] = useState<Receita[]>([]);
  const [financialEntries, setFinancialEntries] = useState<FinancialEntry[]>([]);
  const [recurringRules, setRecurringRules] = useState<RecurringRule[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all data when user changes
  useEffect(() => {
    if (user) {
      fetchAllData();
    } else {
      // Clear data when user logs out
      setClientes([]);
      setAtendimentos([]);
      setServicosPacotes([]);
      setDespesas([]);
      setReceitas([]);
      setFinancialEntries([]);
      setRecurringRules([]);
      setLoading(false);
    }
  }, [user]);

  const fetchAllData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      await Promise.all([
        fetchClientes(),
        fetchAtendimentos(),
        fetchServicosPacotes(),
        fetchDespesas(),
        fetchReceitas(),
        fetchFinancialEntries(),
        fetchRecurringRules()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchClientes = async () => {
    if (!user) return;
    
    const { data, error } = await supabase.rpc('get_clientes_secure', {
      p_search: null,
      p_limit: 1000,
      p_offset: 0
    });

    if (error) throw error;
    setClientes(data || []);
  };

  const fetchAtendimentos = async () => {
    if (!user) return;

    try {
      // Try using the timezone-aware edge function
      const response = await supabase.functions.invoke('list-appointments', {
        headers: {
          'x-viewer-tz': browserTz()
        }
      });

      if (response.data?.appointments) {
        setAtendimentos(response.data.appointments);
        return;
      }
    } catch (error) {
      console.warn('Edge function not available, falling back to direct query:', error);
    }

    // Fallback to direct database query
    const { data, error } = await supabase
      .from('atendimentos')
      .select('*')
      .eq('user_id', user.id)
      .order('start_at_utc', { ascending: false });

    if (error) throw error;
    setAtendimentos(data || []);
  };

  const fetchServicosPacotes = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('servicos_pacotes')
      .select('*')
      .eq('user_id', user.id)
      .order('nome');

    if (error) throw error;
    setServicosPacotes(data || []);
  };

  const fetchDespesas = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('despesas')
      .select('*')
      .eq('user_id', user.id)
      .order('data', { ascending: false });

    if (error) throw error;
    setDespesas(data || []);
  };

  const fetchReceitas = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('receitas')
      .select('*')
      .eq('user_id', user.id)
      .order('data', { ascending: false });

    if (error) throw error;
    setReceitas(data || []);
  };

  const fetchFinancialEntries = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('financial_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('due_date', { ascending: false });

    if (error) throw error;
    setFinancialEntries(data || []);
  };

  const fetchRecurringRules = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('recurring_rules')
      .select('*')
      .eq('user_id', user.id)
      .eq('active', true)
      .order('start_date', { ascending: false });

    if (error) throw error;
    setRecurringRules(data || []);
  };

  // Cliente functions
  const adicionarCliente = async (clienteData: Omit<Cliente, 'id' | 'user_id' | 'criado_em'>) => {
    if (!user) return;

    const { data, error } = await supabase
      .from('clientes')
      .insert([{ ...clienteData, user_id: user.id }])
      .select()
      .single();

    if (error) {
      console.error('Supabase error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }
    
    setClientes(prev => [...prev, data]);
    toast({
      title: "Sucesso",
      description: "Cliente adicionado com sucesso"
    });
    
    return data;
  };

  const atualizarCliente = async (id: string, clienteData: Partial<Cliente>) => {
    if (!user) return;

    const { data, error } = await supabase
      .from('clientes')
      .update(clienteData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    
    setClientes(prev => prev.map(c => c.id === id ? data : c));
    toast({
      title: "Sucesso",
      description: "Cliente atualizado com sucesso"
    });
  };

  const removerCliente = async (id: string) => {
    if (!user) return;

    try {
      console.log('[BW][FIN_SYNC] ===== CLIENTE REMOVAL START =====');
      console.log('[BW][FIN_SYNC] Removing cliente:', id);
      
      // First, deactivate/remove any recurring rules for this client
      const { error: recurringError } = await supabase
        .from('recurring_rules')
        .delete()
        .eq('client_id', id)
        .eq('user_id', user.id);
      
      if (recurringError) {
        console.error('[BW][FIN_SYNC] Error removing recurring rules:', recurringError);
      } else {
        console.log('[BW][FIN_SYNC] Recurring rules removed for client');
      }
      
      // Second, remove all atendimentos associated with the client
      const { error: atendimentosError } = await supabase
        .from('atendimentos')
        .delete()
        .eq('cliente_id', id)
        .eq('user_id', user.id);

      if (atendimentosError) throw atendimentosError;

      // Finally, remove the cliente
      const { error: clienteError } = await supabase
        .from('clientes')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (clienteError) throw clienteError;
      
      // Update local state immediately
      setClientes(prev => prev.filter(c => c.id !== id));
      setAtendimentos(prev => prev.filter(a => a.cliente_id !== id));
      
      // CRITICAL: Run cleanup to remove any orphaned entries
      console.log('[BW][FIN_SYNC] Running cleanup to remove orphans...');
      await cleanupOrphanEntries();
      
      // Reload all data to update cards and charts
      console.log('[BW][FIN_SYNC] Reloading data...');
      await Promise.all([
        fetchClientes(),
        fetchAtendimentos(),
        fetchFinancialEntries(),
        fetchRecurringRules()
      ]);
      
      console.log('[BW][FIN_SYNC] ===== CLIENTE REMOVAL COMPLETE =====');
      
      toast({
        title: "Sucesso",
        description: "Cliente removido com sucesso"
      });
    } catch (error) {
      console.error('Erro ao remover cliente:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover cliente. Tente novamente."
      });
      throw error;
    }
  };

  // Atendimento functions - now using timezone-aware edge functions
  const adicionarAtendimento = async (atendimentoData: any) => {
    if (!user) return;

    // Extrair servicos do atendimentoData
    const { servicos, ...atendimentoBase } = atendimentoData;

    // Sanitize payload: remove rule_id, keep only recurring_rule_id
    const sanitizedData = sanitizeAppointmentCreate(atendimentoBase as any);

    try {
      const response = await supabase.functions.invoke('create-appointment', {
        body: sanitizedData,
        headers: {
          'x-viewer-tz': browserTz()
        }
      });

      if (response.error) throw response.error;

      const newAtendimento = response.data.appointment;
      
      // Salvar serviços relacionados se existirem
      if (servicos && servicos.length > 0 && newAtendimento.id) {
        await saveAppointmentServices(newAtendimento.id, servicos);
      }
      
      setAtendimentos(prev => [...prev, newAtendimento]);
      
      // Refetch para atualizar cards e gráficos
      await fetchFinancialEntries();
      
      toast({
        title: "Sucesso",
        description: "Atendimento agendado com sucesso"
      });
      
      return newAtendimento;
    } catch (error) {
      console.error('Erro ao adicionar atendimento:', error);
      // Fallback to direct database insert
      const { data, error: dbError } = await supabase
        .from('atendimentos')
        .insert([{ ...sanitizedData, user_id: user.id } as any])
        .select()
        .single();

      if (dbError) throw dbError;
      
      // Salvar serviços relacionados se existirem
      if (servicos && servicos.length > 0 && data.id) {
        await saveAppointmentServices(data.id, servicos);
      }
      
      setAtendimentos(prev => [...prev, data]);
      
      // Refetch para atualizar cards e gráficos
      await fetchFinancialEntries();
      
      toast({
        title: "Sucesso",
        description: "Atendimento agendado com sucesso"
      });
      
      return data;
    }
  };

  // Função auxiliar para salvar serviços do agendamento
  const saveAppointmentServices = async (agendamentoId: string, servicos: any[]) => {
    // Primeiro, deletar serviços existentes (para updates)
    await supabase
      .from('agendamento_servicos')
      .delete()
      .eq('agendamento_id', agendamentoId);

    // Inserir novos serviços
    const servicosToInsert = servicos.map(s => ({
      agendamento_id: agendamentoId,
      servico_id: s.servico_id,
      descricao: s.descricao || null,
      valor: s.valor,
      quantidade: s.quantidade
    }));

    const { error } = await supabase
      .from('agendamento_servicos')
      .insert(servicosToInsert);

    if (error) {
      console.error('Erro ao salvar serviços:', error);
      throw error;
    }
  };

  const atualizarAtendimento = async (id: string, atendimentoData: any) => {
    if (!user) return;

    console.log('[BW][FIN_SYNC] Updating atendimento:', { id, atendimentoData });

    // Extrair servicos do atendimentoData
    const { servicos, ...atendimentoBase } = atendimentoData;

    // Sanitize payload: remove rule_id, keep only recurring_rule_id
    const sanitizedData = sanitizeAppointmentUpdate(atendimentoBase as any);

    const { data, error } = await supabase
      .from('atendimentos')
      .update(sanitizedData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    
    // Atualizar serviços relacionados se existirem
    if (servicos && servicos.length > 0) {
      await saveAppointmentServices(id, servicos);
    }
    
    setAtendimentos(prev => prev.map(a => a.id === id ? data : a));
    
    // SYNC: Invalidate and reload ALL
    await fetchAtendimentos();
    await fetchFinancialEntries();
    
    console.log('[BW][FIN_SYNC] Atendimento updated, data reloaded');
    
    toast({
      title: "Sucesso",
      description: "Atendimento atualizado com sucesso"
    });
  };

  const removerAtendimento = async (id: string) => {
    if (!user) return;

    console.log('[BW][FIN_SYNC] Removing atendimento:', id);

    const { error } = await supabase
      .from('atendimentos')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
    
    setAtendimentos(prev => prev.filter(a => a.id !== id));
    
    // CRITICAL: Run cleanup to remove any orphaned financial entries
    console.log('[BW][FIN_SYNC] Running cleanup to remove orphans...');
    await cleanupOrphanEntries();
    
    // SYNC: Invalidate and reload ALL
    await fetchAtendimentos();
    await fetchFinancialEntries();
    
    console.log('[BW][FIN_SYNC] Atendimento removed, data reloaded');
    
    toast({
      title: "Sucesso",
      description: "Atendimento removido com sucesso"
    });
  };

  // ServicoPacote functions
  const adicionarServicoPacote = async (servicoData: Omit<ServicoPacote, 'id' | 'user_id' | 'criado_em'>) => {
    if (!user) return;

    const { data, error } = await supabase
      .from('servicos_pacotes')
      .insert([{ ...servicoData, user_id: user.id }])
      .select()
      .single();

    if (error) throw error;
    
    setServicosPacotes(prev => [...prev, data]);
    toast({
      title: "Sucesso",
      description: "Serviço/Pacote adicionado com sucesso"
    });
    
    return data;
  };

  const atualizarServicoPacote = async (id: string, servicoData: Partial<ServicoPacote>) => {
    if (!user) return;

    const { data, error } = await supabase
      .from('servicos_pacotes')
      .update(servicoData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    
    setServicosPacotes(prev => prev.map(s => s.id === id ? data : s));
    toast({
      title: "Sucesso",
      description: "Serviço/Pacote atualizado com sucesso"
    });
  };

  const removerServicoPacote = async (id: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('servicos_pacotes')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
    
    setServicosPacotes(prev => prev.filter(s => s.id !== id));
    toast({
      title: "Sucesso",
      description: "Serviço/Pacote removido com sucesso"
    });
  };

  // Despesa functions
  const adicionarDespesa = async (despesaData: Omit<Despesa, 'id' | 'user_id' | 'created_at'>) => {
    if (!user) return;

    console.log('[BW][FIN_GRANULAR] Adding despesa:', despesaData);

    const { data, error } = await supabase
      .from('despesas')
      .insert([{ ...despesaData, user_id: user.id }])
      .select()
      .single();

    if (error) throw error;
    
    setDespesas(prev => [...prev, data]);
    
    // If recurring OR tipo=fixa, materialize future entries (previsto/Azul)
    const tipoValue = (despesaData as any).tipo;
    if (despesaData.recorrente || tipoValue === 'fixa') {
      console.log('[BW][FIN_GRANULAR] Materializing recurring/fixed despesa', { 
        recorrente: despesaData.recorrente, 
        tipo: tipoValue
      });
      await materializeFinancialRecurring();
    } else {
      // Lançamento único: criar entrada no MÊS DA DATA (competência exata)
      // Note format: FINANCE_ID:<uuid>|<descricao>
      console.log('[BW][FIN_GRANULAR] Creating single confirmed expense entry with ID:', data.id);
      const { error: entryError } = await supabase
        .from('financial_entries')
        .insert({
          user_id: user.id,
          kind: 'expense',
          status: 'confirmed',
          amount: despesaData.valor,
          due_date: despesaData.data,
          note: `FINANCE_ID:${data.id}|${despesaData.descricao}`,
        });
      
      if (entryError) {
        console.error('[BW][FIN_GRANULAR] Error creating confirmed expense entry:', entryError);
      }
    }
    
    // SYNC: Invalidate and reload ALL
    await fetchDespesas();
    await fetchFinancialEntries();
    
    console.log('[BW][FIN_GRANULAR] Despesa added, data reloaded');
    
    toast({
      title: "Sucesso",
      description: "Despesa adicionada com sucesso"
    });
    
    return data;
  };

  const atualizarDespesa = async (id: string, despesaData: Partial<Despesa>) => {
    if (!user) return;

    console.log('[BW][FIN_GRANULAR] Updating despesa by ID:', id, despesaData);

    // Get original despesa to check if date/month changed
    const { data: originalDespesa } = await supabase
      .from('despesas')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!originalDespesa) {
      console.error('[BW][FIN_GRANULAR] Original despesa not found');
      return;
    }

    const { data, error } = await supabase
      .from('despesas')
      .update(despesaData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    
    setDespesas(prev => prev.map(d => d.id === id ? data : d));
    
    // Check if it's recurring or fixed
    const tipoValue = (data as any).tipo;
    const isRecurringOrFixed = data.recorrente || tipoValue === 'fixa';
    
    if (isRecurringOrFixed) {
      // For recurring/fixed: DELETE ALL related entries (canonical ID + legacy format) then rematerialize
      console.log('[BW][FIN_GRANULAR] Recurring/fixed despesa - deleting all entries before rematerialization');
      
      const descricao = despesaData.descricao || originalDespesa.descricao;
      
      // Delete entries with canonical ID
      await supabase
        .from('financial_entries')
        .delete()
        .eq('user_id', user.id)
        .eq('kind', 'expense')
        .ilike('note', `FINANCE_ID:${id}|%`);
      
      // Delete entries with legacy format (Recorrente: or Fixa:)
      await supabase
        .from('financial_entries')
        .delete()
        .eq('user_id', user.id)
        .eq('kind', 'expense')
        .or(`note.ilike.Recorrente: ${descricao}%,note.ilike.Fixa: ${descricao}%`);
      
      console.log('[BW][FIN_GRANULAR] Deleted all related entries, calling materializeFinancialRecurring');
      await materializeFinancialRecurring();
    } else {
      // For single/non-recurring: UPDATE the specific entry (no rematerialization needed)
      console.log('[BW][FIN_GRANULAR] Single despesa - updating entry directly');
      
      // Check if date changed
      if (despesaData.data && originalDespesa.data !== despesaData.data) {
        const oldMonth = new Date(originalDespesa.data).getMonth();
        const oldYear = new Date(originalDespesa.data).getFullYear();
        const newMonth = new Date(despesaData.data).getMonth();
        const newYear = new Date(despesaData.data).getFullYear();
        
        if (oldMonth !== newMonth || oldYear !== newYear) {
          // Month changed: DELETE old entry, CREATE new entry
          console.log('[BW][FIN_GRANULAR] Date changed - moving from month', `${oldYear}-${oldMonth+1}`, 'to', `${newYear}-${newMonth+1}`);
          
          await supabase
            .from('financial_entries')
            .delete()
            .eq('user_id', user.id)
            .eq('kind', 'expense')
            .ilike('note', `FINANCE_ID:${id}|%`);
          
          const newAmount = despesaData.valor !== undefined ? despesaData.valor : originalDespesa.valor;
          const newDescricao = despesaData.descricao || originalDespesa.descricao;
          
          await supabase
            .from('financial_entries')
            .insert({
              user_id: user.id,
              kind: 'expense',
              status: 'confirmed',
              amount: newAmount,
              due_date: despesaData.data,
              note: `FINANCE_ID:${id}|${newDescricao}`,
            });
          
          console.log('[BW][FIN_GRANULAR] Moved entry to new monthKey');
        } else {
          // Same month, only update if value changed
          if (despesaData.valor !== undefined && despesaData.valor !== originalDespesa.valor) {
            console.log('[BW][FIN_GRANULAR] Same month, updating amount from', originalDespesa.valor, 'to', despesaData.valor);
            
            await supabase
              .from('financial_entries')
              .update({ amount: despesaData.valor })
              .eq('user_id', user.id)
              .eq('kind', 'expense')
              .ilike('note', `FINANCE_ID:${id}|%`);
          }
        }
      } else if (despesaData.valor !== undefined && despesaData.valor !== originalDespesa.valor) {
        // Only value changed, same date
        console.log('[BW][FIN_GRANULAR] Updating only amount');
        
        await supabase
          .from('financial_entries')
          .update({ amount: despesaData.valor })
          .eq('user_id', user.id)
          .eq('kind', 'expense')
          .ilike('note', `FINANCE_ID:${id}|%`);
      }
      
      // Also update description if changed
      if (despesaData.descricao && despesaData.descricao !== originalDespesa.descricao) {
        console.log('[BW][FIN_GRANULAR] Updating description in note');
        
        await supabase
          .from('financial_entries')
          .update({ note: `FINANCE_ID:${id}|${despesaData.descricao}` })
          .eq('user_id', user.id)
          .eq('kind', 'expense')
          .ilike('note', `FINANCE_ID:${id}|%`);
      }
    }
    
    // SYNC: Reload data
    await fetchDespesas();
    await fetchFinancialEntries();
    
    console.log('[BW][FIN_GRANULAR] Despesa updated, data reloaded');
    
    toast({
      title: "Sucesso",
      description: "Despesa atualizada com sucesso"
    });
  };

  const removerDespesa = async (id: string) => {
    if (!user) return;

    console.log('[BW][FIN_GRANULAR] ===== DESPESA REMOVAL START (BY ID) =====');
    console.log('[BW][FIN_GRANULAR] Removing despesa ID:', id);

    // GRANULAR REMOVAL by canonical ID
    // Delete financial_entries using FINANCE_ID:<uuid> pattern
    const { error: deleteEntriesError } = await supabase
      .from('financial_entries')
      .delete()
      .eq('user_id', user.id)
      .eq('kind', 'expense')
      .ilike('note', `FINANCE_ID:${id}|%`);

    if (deleteEntriesError) {
      console.error('[BW][FIN_GRANULAR] Error deleting financial entries by ID:', deleteEntriesError);
    } else {
      console.log('[BW][FIN_GRANULAR] Deleted financial entries for despesa ID:', id);
    }

    // Now delete the despesa
    const { error } = await supabase
      .from('despesas')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
    
    console.log('[BW][FIN_GRANULAR] Despesa deleted from database');
    
    // Update local state immediately
    setDespesas(prev => prev.filter(d => d.id !== id));
    
    // Reload financial data to update cards and charts (no cleanup - granular deletion handles it)
    console.log('[BW][FIN_GRANULAR] Reloading financial data...');
    await Promise.all([
      fetchDespesas(),
      fetchFinancialEntries()
    ]);
    
    console.log('[BW][FIN_GRANULAR] ===== DESPESA REMOVAL COMPLETE =====');
    
    toast({
      title: "Sucesso",
      description: "Despesa removida com sucesso"
    });
  };

  // Receita functions
  const adicionarReceita = async (receitaData: Omit<Receita, 'id' | 'user_id' | 'created_at'>) => {
    if (!user) return;

    console.log('[BW][FIN_GRANULAR] Adding receita:', receitaData);

    const { data, error } = await supabase
      .from('receitas')
      .insert([{ ...receitaData, user_id: user.id }])
      .select()
      .single();

    if (error) throw error;
    
    setReceitas(prev => [...prev, data]);
    
    // If recurring OR tipo=fixa, materialize future entries (previsto/Azul)
    const tipoValue = (receitaData as any).tipo;
    if (receitaData.recorrente || tipoValue === 'fixa') {
      console.log('[BW][FIN_GRANULAR] Materializing recurring/fixed receita', { 
        recorrente: receitaData.recorrente, 
        tipo: tipoValue
      });
      await materializeFinancialRecurring();
    } else {
      // Lançamento único: criar entrada no MÊS DA DATA (competência exata)
      // Note format: FINANCE_ID:<uuid>|<descricao>
      console.log('[BW][FIN_GRANULAR] Creating single confirmed revenue entry with ID:', data.id);
      const { error: entryError } = await supabase
        .from('financial_entries')
        .insert({
          user_id: user.id,
          kind: 'revenue',
          status: 'confirmed',
          amount: receitaData.valor,
          due_date: receitaData.data,
          note: `FINANCE_ID:${data.id}|${receitaData.descricao}`,
        });
      
      if (entryError) {
        console.error('[BW][FIN_GRANULAR] Error creating confirmed revenue entry:', entryError);
      }
    }
    
    // SYNC: Invalidate and reload ALL
    await fetchReceitas();
    await fetchFinancialEntries();
    
    console.log('[BW][FIN_GRANULAR] Receita added, data reloaded');
    
    toast({
      title: "Sucesso",
      description: "Receita adicionada com sucesso"
    });
    
    return data;
  };

  const atualizarReceita = async (id: string, receitaData: Partial<Receita>) => {
    if (!user) return;

    console.log('[BW][FIN_GRANULAR] Updating receita by ID:', id, receitaData);

    // Get original receita to check if date/month changed
    const { data: originalReceita } = await supabase
      .from('receitas')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!originalReceita) {
      console.error('[BW][FIN_GRANULAR] Original receita not found');
      return;
    }

    const { data, error } = await supabase
      .from('receitas')
      .update(receitaData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    
    setReceitas(prev => prev.map(r => r.id === id ? data : r));
    
    // Check if it's recurring or fixed
    const tipoValue = (data as any).tipo;
    const isRecurringOrFixed = data.recorrente || tipoValue === 'fixa';
    
    if (isRecurringOrFixed) {
      // For recurring/fixed: DELETE ALL related entries (canonical ID + legacy format) then rematerialize
      console.log('[BW][FIN_GRANULAR] Recurring/fixed receita - deleting all entries before rematerialization');
      
      const descricao = receitaData.descricao || originalReceita.descricao;
      
      // Delete entries with canonical ID
      await supabase
        .from('financial_entries')
        .delete()
        .eq('user_id', user.id)
        .eq('kind', 'revenue')
        .ilike('note', `FINANCE_ID:${id}|%`);
      
      // Delete entries with legacy format (Recorrente: or Fixa:)
      await supabase
        .from('financial_entries')
        .delete()
        .eq('user_id', user.id)
        .eq('kind', 'revenue')
        .or(`note.ilike.Recorrente: ${descricao}%,note.ilike.Fixa: ${descricao}%`);
      
      console.log('[BW][FIN_GRANULAR] Deleted all related entries, calling materializeFinancialRecurring');
      await materializeFinancialRecurring();
    } else {
      // For single/non-recurring: UPDATE the specific entry (no rematerialization needed)
      console.log('[BW][FIN_GRANULAR] Single receita - updating entry directly');
      
      // Check if date changed
      if (receitaData.data && originalReceita.data !== receitaData.data) {
        const oldMonth = new Date(originalReceita.data).getMonth();
        const oldYear = new Date(originalReceita.data).getFullYear();
        const newMonth = new Date(receitaData.data).getMonth();
        const newYear = new Date(receitaData.data).getFullYear();
        
        if (oldMonth !== newMonth || oldYear !== newYear) {
          // Month changed: DELETE old entry, CREATE new entry
          console.log('[BW][FIN_GRANULAR] Date changed - moving from month', `${oldYear}-${oldMonth+1}`, 'to', `${newYear}-${newMonth+1}`);
          
          await supabase
            .from('financial_entries')
            .delete()
            .eq('user_id', user.id)
            .eq('kind', 'revenue')
            .ilike('note', `FINANCE_ID:${id}|%`);
          
          const newAmount = receitaData.valor !== undefined ? receitaData.valor : originalReceita.valor;
          const newDescricao = receitaData.descricao || originalReceita.descricao;
          
          await supabase
            .from('financial_entries')
            .insert({
              user_id: user.id,
              kind: 'revenue',
              status: 'confirmed',
              amount: newAmount,
              due_date: receitaData.data,
              note: `FINANCE_ID:${id}|${newDescricao}`,
            });
          
          console.log('[BW][FIN_GRANULAR] Moved entry to new monthKey');
        } else {
          // Same month, only update if value changed
          if (receitaData.valor !== undefined && receitaData.valor !== originalReceita.valor) {
            console.log('[BW][FIN_GRANULAR] Same month, updating amount from', originalReceita.valor, 'to', receitaData.valor);
            
            await supabase
              .from('financial_entries')
              .update({ amount: receitaData.valor })
              .eq('user_id', user.id)
              .eq('kind', 'revenue')
              .ilike('note', `FINANCE_ID:${id}|%`);
          }
        }
      } else if (receitaData.valor !== undefined && receitaData.valor !== originalReceita.valor) {
        // Only value changed, same date
        console.log('[BW][FIN_GRANULAR] Updating only amount');
        
        await supabase
          .from('financial_entries')
          .update({ amount: receitaData.valor })
          .eq('user_id', user.id)
          .eq('kind', 'revenue')
          .ilike('note', `FINANCE_ID:${id}|%`);
      }
      
      // Also update description if changed
      if (receitaData.descricao && receitaData.descricao !== originalReceita.descricao) {
        console.log('[BW][FIN_GRANULAR] Updating description in note');
        
        await supabase
          .from('financial_entries')
          .update({ note: `FINANCE_ID:${id}|${receitaData.descricao}` })
          .eq('user_id', user.id)
          .eq('kind', 'revenue')
          .ilike('note', `FINANCE_ID:${id}|%`);
      }
    }
    
    // SYNC: Reload data
    await fetchReceitas();
    await fetchFinancialEntries();
    
    console.log('[BW][FIN_GRANULAR] Receita updated, data reloaded');
    
    toast({
      title: "Sucesso",
      description: "Receita atualizada com sucesso"
    });
  };

  const removerReceita = async (id: string) => {
    if (!user) return;

    console.log('[BW][FIN_GRANULAR] ===== RECEITA REMOVAL START (BY ID) =====');
    console.log('[BW][FIN_GRANULAR] Removing receita ID:', id);

    // GRANULAR REMOVAL by canonical ID
    // Delete financial_entries using FINANCE_ID:<uuid> pattern
    const { error: deleteEntriesError } = await supabase
      .from('financial_entries')
      .delete()
      .eq('user_id', user.id)
      .eq('kind', 'revenue')
      .ilike('note', `FINANCE_ID:${id}|%`);

    if (deleteEntriesError) {
      console.error('[BW][FIN_GRANULAR] Error deleting financial entries by ID:', deleteEntriesError);
    } else {
      console.log('[BW][FIN_GRANULAR] Deleted financial entries for receita ID:', id);
    }

    // Now delete the receita
    const { error } = await supabase
      .from('receitas')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('[BW][FIN_GRANULAR] Error deleting receita:', error);
      throw error;
    }
    
    console.log('[BW][FIN_GRANULAR] Receita deleted from database');
    
    // Update local state immediately
    setReceitas(prev => prev.filter(r => r.id !== id));
    
    // Reload financial data to update cards and charts (no cleanup - granular deletion handles it)
    console.log('[BW][FIN_GRANULAR] Reloading financial data...');
    await Promise.all([
      fetchReceitas(),
      fetchFinancialEntries()
    ]);
    
    console.log('[BW][FIN_GRANULAR] ===== RECEITA REMOVAL COMPLETE =====');
    
    toast({
      title: "Sucesso",
      description: "Receita removida com sucesso"
    });
  };

  // Helper function to calculate recurring entries for future months
  const calcularRecorrenciaFutura = (despesa: Despesa, targetMonth: number, targetYear: number) => {
    if (!despesa.recorrente || !despesa.recorrencia) return 0;

    const despesaDate = new Date(despesa.data);
    const targetDate = new Date(targetYear, targetMonth, 1);
    
    // Se a despesa é posterior ao mês alvo, não deve ser incluída
    if (despesaDate > targetDate) return 0;

    const recorrencia = despesa.recorrencia as { tipo: string; dia?: number };
    
    if (recorrencia.tipo === 'mensal') {
      // Para despesas mensais, incluir se a data original é anterior ou igual ao mês alvo
      return Number(despesa.valor);
    }
    
    return 0;
  };

  // Helper function to calculate recurring client revenues for future months
  const calcularReceitaClienteRecorrente = (cliente: Cliente, targetMonth: number, targetYear: number) => {
    if (!cliente.recorrente) return 0;

    // Buscar o pacote/serviço do cliente
    const pacoteServico = servicosPacotes.find(sp => sp.id === cliente.pacote_id);
    if (!pacoteServico) return 0;

    const valor = Number(pacoteServico.valor);
    
    // Se o cliente tem recorrência definida, calcular baseado na frequência
    if (cliente.recorrencia) {
      switch (cliente.recorrencia) {
        case 'semanal':
          // 4 atendimentos por mês aproximadamente
          return valor * 4;
        case 'quinzenal':
          // 2 atendimentos por mês
          return valor * 2;
        case 'mensal':
          // 1 atendimento por mês
          return valor;
        default:
          return valor;
      }
    }
    
    return valor;
  };

  // Financial calculations - EXCLUSIVE SOURCE: financial_entries + atendimentos
  const calcularDadosFinanceiros = () => {
    const APP_TZ = 'America/Sao_Paulo';
    const today = new Date();
    // CRITICAL: Set today to start of day (00:00:00) for accurate date comparisons
    today.setHours(0, 0, 0, 0);
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    console.log('[BW][FIN_SYNC] ========== INÍCIO CÁLCULO FINANCEIRO ==========');
    console.log('[BW][FIN_SYNC] TZ:', APP_TZ, 'Hoje:', today.toISOString());
    console.log('[BW][FIN_SYNC] Financial entries total:', financialEntries.length);
    console.log('[BW][FIN_SYNC] Atendimentos total:', atendimentos.length);
    console.log('[BW][FIN_SYNC] Recurring rules total:', recurringRules.length);
    
    // Helper to parse DATE as local (prevent -1 day bug)
    const parseLocalDate = (dateStr: string): Date => {
      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(year, month - 1, day);
    };
    
    // Helper to expand recurring rule occurrences (for Azul series only)
    const expandRecurringOccurrences = (rule: RecurringRule, maxMonths: number = 12): Array<{ date: Date; amount: number }> => {
      const occurrences: Array<{ date: Date; amount: number }> = [];
      const startDate = parseLocalDate(rule.start_date);
      const endDate = rule.end_date ? parseLocalDate(rule.end_date) : new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
      const maxDate = new Date(today.getFullYear(), today.getMonth() + maxMonths, today.getDate());
      const limitDate = endDate < maxDate ? endDate : maxDate;
      
      if (rule.recurrence_type === 'weekly' && rule.weekdays) {
        // Weekly recurrences
        let currentDate = new Date(startDate);
        let occurrenceCount = 0;
        const maxOccurrences = rule.occurrences_limit || 100;
        
        while (currentDate <= limitDate && occurrenceCount < maxOccurrences) {
          const dayOfWeek = currentDate.getDay();
          if (rule.weekdays.includes(dayOfWeek)) {
            if (currentDate >= today) {
              occurrences.push({ date: new Date(currentDate), amount: Number(rule.amount || 0) });
              occurrenceCount++;
            }
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }
      } else if (rule.recurrence_type === 'monthly' && rule.day_of_month) {
        // Monthly recurrences
        let currentDate = new Date(startDate);
        let occurrenceCount = 0;
        const maxOccurrences = rule.occurrences_limit || 36;
        
        while (currentDate <= limitDate && occurrenceCount < maxOccurrences) {
          const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), rule.day_of_month);
          if (targetDate >= startDate && targetDate >= today && targetDate <= limitDate) {
            occurrences.push({ date: new Date(targetDate), amount: Number(rule.amount || 0) });
            occurrenceCount++;
          }
          currentDate.setMonth(currentDate.getMonth() + (rule.interval_months || 1));
        }
      }
      
      console.log(`[BW][FIN_SYNC] Expanded rule ${rule.id.slice(0, 8)}... (${rule.title}): ${occurrences.length} future occurrences`);
      return occurrences;
    };
    
    // ============================================
    // CURRENT MONTH DATA - USE atendimentos (realizado) + financial_entries
    // ============================================
    const firstDayCurrentMonth = new Date(currentYear, currentMonth, 1);
    const lastDayCurrentMonth = new Date(currentYear, currentMonth + 1, 0);
    const firstDayStr = firstDayCurrentMonth.toISOString().split('T')[0];
    const lastDayStr = lastDayCurrentMonth.toISOString().split('T')[0];
    
    // RECEITAS do mês atual: Atendimentos REALIZADOS + financial_entries
    const atendimentosRealizadosMesAtual = atendimentos.filter(a => {
      const dataAtendimento = parseLocalDate(a.data);
      return a.status === 'realizado' &&
             dataAtendimento.getMonth() === currentMonth &&
             dataAtendimento.getFullYear() === currentYear;
    });
    const receitaAgendaMesAtual = atendimentosRealizadosMesAtual.reduce((sum, a) => sum + Number(a.valor_total || a.valor), 0);
    
    // RECEITAS do mês atual (expected + confirmed from financial_entries que não são de atendimentos)
    // CRITICAL: Filter out orphaned entries
    const finEntriesReceitasMesAtual = financialEntries.filter(fe => {
      const isInMonth = fe.kind === 'revenue' &&
             (fe.status === 'expected' || fe.status === 'confirmed') &&
             fe.due_date >= firstDayStr &&
             fe.due_date <= lastDayStr &&
             parseLocalDate(fe.due_date) <= today;
      
      if (!isInMonth) return false;
      
      // Check if this is an orphaned entry
      if (fe.note && (fe.note.startsWith('Recorrente:') || fe.note.startsWith('Fixa:'))) {
        const descricao = fe.note.replace(/^(Recorrente|Fixa): /, '');
        const hasParent = receitas.some(r => r.descricao === descricao);
        if (!hasParent) {
          console.log('[BW][FIN_SYNC] ORPHAN REVENUE ENTRY DETECTED:', fe.id, fe.note, 'Amount:', fe.amount);
          return false; // Skip orphaned entries
        }
      }
      
      return true;
    });
    const receitaFinanceirasMesAtual = finEntriesReceitasMesAtual.reduce((sum, fe) => sum + Number(fe.amount), 0);
    
    const faturamentoMesAtual = receitaAgendaMesAtual + receitaFinanceirasMesAtual;
    
    console.log('[BW][FIN_SYNC] === RECEITAS MÊS ATUAL ===');
    console.log('[BW][FIN_SYNC] Receita agenda:', receitaAgendaMesAtual);
    console.log('[BW][FIN_SYNC] Receita financeiras entries:', receitaFinanceirasMesAtual);
    console.log('[BW][FIN_SYNC] Total receitas entries found:', finEntriesReceitasMesAtual.length);
    finEntriesReceitasMesAtual.forEach(fe => {
      console.log('[BW][FIN_SYNC] - Receita:', fe.note, 'Amount:', fe.amount, 'Status:', fe.status, 'Due:', fe.due_date);
    });
    
    // DESPESAS do mês atual (expected + confirmed from financial_entries)
    // CRITICAL: Filter out orphaned entries (those without valid parent in despesas table)
    const finEntriesDespesasMesAtual = financialEntries.filter(fe => {
      const isInMonth = fe.kind === 'expense' &&
             (fe.status === 'expected' || fe.status === 'confirmed') &&
             fe.due_date >= firstDayStr &&
             fe.due_date <= lastDayStr &&
             parseLocalDate(fe.due_date) <= today;
      
      if (!isInMonth) return false;
      
      // Check if this is an orphaned entry (has note pattern but parent despesa doesn't exist)
      if (fe.note && (fe.note.startsWith('Recorrente:') || fe.note.startsWith('Fixa:'))) {
        const descricao = fe.note.replace(/^(Recorrente|Fixa): /, '');
        const hasParent = despesas.some(d => d.descricao === descricao);
        if (!hasParent) {
          console.log('[BW][FIN_SYNC] ORPHAN EXPENSE ENTRY DETECTED:', fe.id, fe.note, 'Amount:', fe.amount);
          return false; // Skip orphaned entries
        }
      }
      
      return true;
    });

    const totalDespesas = finEntriesDespesasMesAtual.reduce((sum, fe) => sum + Number(fe.amount), 0);
    
    console.log('[BW][FIN_SYNC] === DESPESAS MÊS ATUAL ===');
    console.log('[BW][FIN_SYNC] Total despesas entries found:', finEntriesDespesasMesAtual.length);
    console.log('[BW][FIN_SYNC] Total despesas amount:', totalDespesas);
    finEntriesDespesasMesAtual.forEach(fe => {
      console.log('[BW][FIN_SYNC] - Despesa:', fe.note, 'Amount:', fe.amount, 'Status:', fe.status, 'Due:', fe.due_date);
    });
    
    console.log('[BW][FIN_SYNC] Mês corrente:', { 
      periodo: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`,
      receitaAgenda: receitaAgendaMesAtual.toFixed(2),
      atendimentosRealizadosCount: atendimentosRealizadosMesAtual.length,
      receitaFinanceiras: receitaFinanceirasMesAtual.toFixed(2),
      finEntriesCount: finEntriesReceitasMesAtual.length,
      faturamentoTotal: faturamentoMesAtual.toFixed(2), 
      despesasCount: finEntriesDespesasMesAtual.length,
      despesas: totalDespesas.toFixed(2),
      lucro: (faturamentoMesAtual - totalDespesas).toFixed(2)
    });

    // ============================================
    // GRÁFICO 1 - HISTÓRICO (Últimos 4 meses) - USE financial_entries + atendimentos
    // ============================================
    const historicoMensal = [];
    
    console.log('[BW][FIN_SYNC] ========== Gráfico 1 - Histórico ==========');
    
    // Get exactly 4 months: 3 past months + current month
    for (let i = 3; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - i, 1);
      const month = date.getMonth();
      const year = date.getFullYear();
      const isCurrentMonth = month === currentMonth && year === currentYear;
      
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const firstDayMonthStr = firstDay.toISOString().split('T')[0];
      const lastDayMonthStr = lastDay.toISOString().split('T')[0];
      
      // VERDE (Receita Realizada) = Atendimentos REALIZADOS + financial_entries
      const atendimentosRealizadosMes = atendimentos.filter(a => {
        const dataAtendimento = parseLocalDate(a.data);
        return a.status === 'realizado' &&
               dataAtendimento.getMonth() === month &&
               dataAtendimento.getFullYear() === year;
      });
      const receitaAgendaMes = atendimentosRealizadosMes.reduce((sum, a) => sum + Number(a.valor_total || a.valor), 0);
      
      // RECEITAS do mês (from financial_entries: expected + confirmed, SEM atendimentos pois já considerados acima via Verde)
      // CRITICAL: Filter out orphaned entries
      const finEntriesReceitasMes = financialEntries.filter(fe => {
        const dueDate = parseLocalDate(fe.due_date);
        const isInMonth = fe.kind === 'revenue' &&
               (fe.status === 'expected' || fe.status === 'confirmed') &&
               fe.due_date >= firstDayMonthStr &&
               fe.due_date <= lastDayMonthStr &&
               (!isCurrentMonth || dueDate <= today);
        
        if (!isInMonth) return false;
        
        // Check if this is an orphaned entry
        if (fe.note && (fe.note.startsWith('Recorrente:') || fe.note.startsWith('Fixa:'))) {
          const descricao = fe.note.replace(/^(Recorrente|Fixa): /, '');
          const hasParent = receitas.some(r => r.descricao === descricao);
          if (!hasParent) return false;
        }
        
        return true;
      });
      const receitaFinanceirasMes = finEntriesReceitasMes.reduce((sum, fe) => sum + Number(fe.amount), 0);
      
      const realizadoMes = receitaAgendaMes + receitaFinanceirasMes;
      
    // AZUL (Agendado/Previsto) = SOMENTE Atendimentos AGENDADOS + FUTURE OCCURRENCES from recurring rules
      // Usar Set para deduplicação: evitar contar mesma ocorrência duas vezes
      const occurrencesSet = new Set<string>();
      let agendadoMes = 0;
      
      // 1. Atendimentos agendados já materializados
      const atendimentosAgendadosMes = atendimentos.filter(a => {
        const dataAtendimento = parseLocalDate(a.data);
        return a.status === 'agendado' &&
               dataAtendimento.getMonth() === month &&
               dataAtendimento.getFullYear() === year &&
               (!isCurrentMonth || dataAtendimento <= today);
      });
      
      atendimentosAgendadosMes.forEach(a => {
        const occurrenceKey = a.recurring_rule_id 
          ? `${a.recurring_rule_id}#${a.data}` 
          : `appointment#${a.id}`;
        if (!occurrencesSet.has(occurrenceKey)) {
          occurrencesSet.add(occurrenceKey);
          agendadoMes += Number(a.valor_total || a.valor);
        }
      });

      // 2. Expansão de ocorrências futuras de recurring rules (apenas se não já materializada)
      recurringRules.forEach(rule => {
        const occurrences = expandRecurringOccurrences(rule, 12);
        occurrences.forEach(occ => {
          if (occ.date.getMonth() === month && occ.date.getFullYear() === year) {
            const occurrenceKey = `${rule.id}#${occ.date.toISOString().split('T')[0]}`;
            if (!occurrencesSet.has(occurrenceKey)) {
              occurrencesSet.add(occurrenceKey);
              agendadoMes += occ.amount;
            }
          }
        });
      });

      // DESPESAS do mês (expected + confirmed from financial_entries)
      // CRITICAL: Filter out orphaned entries
      const finEntriesDespesasMes = financialEntries.filter(fe => {
        const dueDate = parseLocalDate(fe.due_date);
        const isInMonth = fe.kind === 'expense' &&
               (fe.status === 'expected' || fe.status === 'confirmed') &&
               fe.due_date >= firstDayMonthStr &&
               fe.due_date <= lastDayMonthStr &&
               (!isCurrentMonth || dueDate <= today);
        
        if (!isInMonth) return false;
        
        // Check if this is an orphaned entry
        if (fe.note && (fe.note.startsWith('Recorrente:') || fe.note.startsWith('Fixa:'))) {
          const descricao = fe.note.replace(/^(Recorrente|Fixa): /, '');
          const hasParent = despesas.some(d => d.descricao === descricao);
          if (!hasParent) {
            return false; // Skip orphaned entries
          }
        }
        
        return true;
      });
      const despesasTotalMes = finEntriesDespesasMes.reduce((sum, fe) => sum + Number(fe.amount), 0);

      const mesLabel = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
      
      historicoMensal.push({
        mes: mesLabel,
        faturamento: realizadoMes,
        realizado: realizadoMes,
        agendado: agendadoMes, // Blue dashed line in chart
        despesas: despesasTotalMes
      });
      
      console.log(`[BW][FIN_SYNC] Gráfico 1 - ${mesLabel}:`, {
        receitaAgenda: receitaAgendaMes.toFixed(2),
        atendimentosRealizadosCount: atendimentosRealizadosMes.length,
        receitaFinanceiras: receitaFinanceirasMes.toFixed(2),
        realizadoTotal: realizadoMes.toFixed(2),
        agendados: agendadoMes.toFixed(2),
        agendadosCount: atendimentosAgendadosMes.length,
        despesas: despesasTotalMes.toFixed(2),
        finEntriesReceitasCount: finEntriesReceitasMes.length,
        finEntriesDespesasCount: finEntriesDespesasMes.length
      });
    }

    // ============================================
    // GRÁFICO 2 - PROJEÇÕES (Próximos 4 meses)
    // MÊS CORRENTE: usar MESMA lógica do Gráfico 1 (valores idênticos)
    // MESES FUTUROS: usar financial_entries com status='expected'
    // ============================================
    const projecaoMensal = [];
    
    console.log('[BW][FIN_SYNC] ========== Gráfico 2 - Projeções ==========');
    
    // Próximos 4 meses (incluindo mês corrente)
    for (let i = 0; i <= 3; i++) {
      const futureDate = new Date(currentYear, currentMonth + i, 1);
      const futureMonth = futureDate.getMonth();
      const futureYear = futureDate.getFullYear();
      const mesLabel = futureDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
      const isCurrentMonth = i === 0;
      
      let receitasProj = 0;
      let despesasProj = 0;
      let agendadosProj = 0;
      
      if (isCurrentMonth) {
        // ============================================
        // MÊS CORRENTE: usar EXATAMENTE a mesma lógica do Gráfico 1
        // ============================================
        // Usar os mesmos valores já calculados (faturamentoMesAtual, totalDespesas)
        receitasProj = faturamentoMesAtual; // Verde
        despesasProj = totalDespesas;
        
        // Agendados do mês corrente - SOMENTE atendimentos agendados + recurring rules
        // Usar Set para deduplicação
        const occurrencesSetCurrent = new Set<string>();
        agendadosProj = 0;
        
        // 1. Atendimentos agendados já materializados
        const atendimentosAgendadosMesAtual = atendimentos.filter(a => {
          const dataAtendimento = parseLocalDate(a.data);
          return a.status === 'agendado' &&
                 dataAtendimento.getMonth() === currentMonth &&
                 dataAtendimento.getFullYear() === currentYear &&
                 dataAtendimento <= today;
        });
        
        atendimentosAgendadosMesAtual.forEach(a => {
          const occurrenceKey = a.recurring_rule_id 
            ? `${a.recurring_rule_id}#${a.data}` 
            : `appointment#${a.id}`;
          if (!occurrencesSetCurrent.has(occurrenceKey)) {
            occurrencesSetCurrent.add(occurrenceKey);
            agendadosProj += Number(a.valor_total || a.valor);
          }
        });
        
        // 2. Expansão de ocorrências futuras de recurring rules
        recurringRules.forEach(rule => {
          const occurrences = expandRecurringOccurrences(rule, 12);
          occurrences.forEach(occ => {
            if (occ.date.getMonth() === currentMonth && occ.date.getFullYear() === currentYear) {
              const occurrenceKey = `${rule.id}#${occ.date.toISOString().split('T')[0]}`;
              if (!occurrencesSetCurrent.has(occurrenceKey)) {
                occurrencesSetCurrent.add(occurrenceKey);
                agendadosProj += occ.amount;
              }
            }
          });
        });
        
        console.log(`[BW][FIN_SYNC] Gráfico 2 - ${mesLabel} (CORRENTE = G1):`, {
          receitas: receitasProj.toFixed(2),
          despesas: despesasProj.toFixed(2),
          agendados: agendadosProj.toFixed(2),
          agendadosCount: atendimentosAgendadosMesAtual.length,
          note: 'Deve ser IGUAL ao Gráfico 1 para mês corrente'
        });
      } else {
        // ============================================
        // MESES FUTUROS: usar financial_entries expected E confirmed (lançamentos futuros não recorrentes)
        // ============================================
        const firstDay = new Date(futureYear, futureMonth, 1);
        const lastDay = new Date(futureYear, futureMonth + 1, 0);
        const firstDayMonthStr = firstDay.toISOString().split('T')[0];
        const lastDayMonthStr = lastDay.toISOString().split('T')[0];
        
        // Receitas futuras (financial_entries: expected=recorrentes + confirmed=não recorrentes futuros)
        const finEntriesReceitas = financialEntries.filter(fe => {
          const isInMonth = fe.kind === 'revenue' &&
            (fe.status === 'expected' || fe.status === 'confirmed') &&
            fe.due_date >= firstDayMonthStr &&
            fe.due_date <= lastDayMonthStr;
          
          if (!isInMonth) return false;
          
          // Check if this is an orphaned entry
          if (fe.note && (fe.note.startsWith('Recorrente:') || fe.note.startsWith('Fixa:'))) {
            const descricao = fe.note.replace(/^(Recorrente|Fixa): /, '');
            const hasParent = receitas.some(r => r.descricao === descricao);
            if (!hasParent) return false;
          }
          
          return true;
        });
        receitasProj = finEntriesReceitas.reduce((sum, fe) => sum + Number(fe.amount), 0);
        
        // Despesas futuras (financial_entries: expected=recorrentes + confirmed=não recorrentes futuros)
        const finEntriesDespesas = financialEntries.filter(fe => {
          const isInMonth = fe.kind === 'expense' &&
            (fe.status === 'expected' || fe.status === 'confirmed') &&
            fe.due_date >= firstDayMonthStr &&
            fe.due_date <= lastDayMonthStr;
          
          if (!isInMonth) return false;
          
          // Check if this is an orphaned entry
          if (fe.note && (fe.note.startsWith('Recorrente:') || fe.note.startsWith('Fixa:'))) {
            const descricao = fe.note.replace(/^(Recorrente|Fixa): /, '');
            const hasParent = despesas.some(d => d.descricao === descricao);
            if (!hasParent) return false;
          }
          
          return true;
        });
        despesasProj = finEntriesDespesas.reduce((sum, fe) => sum + Number(fe.amount), 0);
        
        // Agendados futuros - SOMENTE atendimentos agendados + recurring rules
        // Usar Set para deduplicação
        const occurrencesSetFuture = new Set<string>();
        agendadosProj = 0;
        
        // 1. Atendimentos agendados já materializados
        const atendimentosFuturos = atendimentos.filter(a => {
          const dataAtendimento = parseLocalDate(a.data);
          return a.status === 'agendado' &&
                 dataAtendimento >= firstDay &&
                 dataAtendimento <= lastDay;
        });
        
        atendimentosFuturos.forEach(a => {
          const occurrenceKey = a.recurring_rule_id 
            ? `${a.recurring_rule_id}#${a.data}` 
            : `appointment#${a.id}`;
          if (!occurrencesSetFuture.has(occurrenceKey)) {
            occurrencesSetFuture.add(occurrenceKey);
            agendadosProj += Number(a.valor_total || a.valor);
          }
        });
        
        // 2. Expansão de ocorrências futuras de recurring rules
        recurringRules.forEach(rule => {
          const occurrences = expandRecurringOccurrences(rule, 12);
          occurrences.forEach(occ => {
            if (occ.date >= firstDay && occ.date <= lastDay) {
              const occurrenceKey = `${rule.id}#${occ.date.toISOString().split('T')[0]}`;
              if (!occurrencesSetFuture.has(occurrenceKey)) {
                occurrencesSetFuture.add(occurrenceKey);
                agendadosProj += occ.amount;
              }
            }
          });
        });
        
        console.log(`[BW][FIN_SYNC] Gráfico 2 - ${mesLabel} (expected):`, {
          receitas: receitasProj.toFixed(2),
          despesas: despesasProj.toFixed(2),
          agendados: agendadosProj.toFixed(2),
          finEntriesReceitasCount: finEntriesReceitas.length,
          finEntriesDespesasCount: finEntriesDespesas.length,
          agendadosCount: atendimentosFuturos.length
        });
      }
      
      projecaoMensal.push({
        mes: mesLabel,
        receitas: receitasProj,
        despesas: despesasProj,
        agendados: agendadosProj,
        lucro: receitasProj - despesasProj
      });
    }

    console.log('[BW][FIN_SYNC] ========== FIM CÁLCULO FINANCEIRO ==========');

    const faturamentoMediaMensal = historicoMensal.slice(0, 4).reduce((sum, m) => sum + m.realizado, 0) / 4;
    const lucroLiquido = faturamentoMesAtual - totalDespesas;
    const projecaoProximoMes = projecaoMensal[1]?.receitas || 0; // Próximo mês (não corrente)

    return {
      faturamentoMesAtual,
      faturamentoMediaMensal,
      projecaoProximoMes,
      lucroLiquido,
      totalDespesas,
      historicoMensal, // Gráfico 1 - Últimos 4 meses
      projecaoMensal, // Gráfico 2 - Próximos 4 meses (incluindo corrente)
      variacaoFaturamento: 0,
      variacaoDespesas: 0,
      variacaoLucro: 0
    };
  };

  const materializeRecurringAppointments = async () => {
    try {
      const { error } = await supabase.functions.invoke('materialize-recurring', {
        body: {}
      });
      if (error) {
        console.error('Erro ao materializar compromissos recorrentes:', error);
      } else {
        // Refetch appointments and financial entries after materialization
        await Promise.all([
          fetchAtendimentos(),
          fetchFinancialEntries()
        ]);
      }
    } catch (err) {
      console.error('Erro ao chamar materialize-recurring:', err);
    }
  };

  const materializeFinancialRecurring = async () => {
    try {
      console.log('[BW][FIN_REC] Materializing financial recurring entries');
      const { error } = await supabase.functions.invoke('materialize-financial-recurring', {
        body: {}
      });
      if (error) {
        console.error('Erro ao materializar recorrências financeiras:', error);
      } else {
        console.log('[BW][FIN_REC] Financial recurring materialization complete');
        // Refetch financial entries after materialization
        await fetchFinancialEntries();
      }
    } catch (err) {
      console.error('Erro ao chamar materialize-financial-recurring:', err);
    }
  };

  const cleanupOrphanEntries = async () => {
    try {
      console.log('[BW][SYNC] Starting cleanup of orphan financial entries');
      const { data, error } = await supabase.functions.invoke('cleanup-orphan-entries', {
        body: {}
      });
      if (error) {
        console.error('[BW][SYNC] Error cleaning up orphan entries:', error);
      } else {
        console.log('[BW][SYNC] Cleanup complete:', data);
        // Refetch financial entries after cleanup
        await fetchFinancialEntries();
      }
    } catch (err) {
      console.error('[BW][SYNC] Error calling cleanup-orphan-entries:', err);
    }
  };

  // Run cleanup on mount (idempotent) - only once when data is loaded
  useEffect(() => {
    if (user && financialEntries.length > 0) {
      const hasRunCleanup = sessionStorage.getItem('bw_cleanup_done');
      if (!hasRunCleanup) {
        console.log('[BW][SYNC] Running initial cleanup check');
        cleanupOrphanEntries();
        sessionStorage.setItem('bw_cleanup_done', 'true');
      }
    }
  }, [user?.id]);

  return {
    // Data
    clientes,
    atendimentos,
    servicosPacotes,
    despesas,
    receitas,
    financialEntries,
    recurringRules,
    loading,
    
    // Cliente functions
    adicionarCliente,
    atualizarCliente,
    removerCliente,
    
    // Atendimento functions
    adicionarAtendimento,
    atualizarAtendimento,
    removerAtendimento,
    
    // ServicoPacote functions
    adicionarServicoPacote,
    atualizarServicoPacote,
    removerServicoPacote,
    
    // Despesa functions
    adicionarDespesa,
    atualizarDespesa,
    removerDespesa,
    
    // Receita functions
    adicionarReceita,
    atualizarReceita,
    removerReceita,
    
    // Calculations
    calcularDadosFinanceiros,
    
    // Recurring appointments
    materializeRecurringAppointments,
    materializeFinancialRecurring,
    cleanupOrphanEntries
  };
};