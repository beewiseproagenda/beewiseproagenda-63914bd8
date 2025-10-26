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

export const useSupabaseData = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [servicosPacotes, setServicosPacotes] = useState<ServicoPacote[]>([]);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [receitas, setReceitas] = useState<Receita[]>([]);
  const [financialEntries, setFinancialEntries] = useState<FinancialEntry[]>([]);
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
        fetchFinancialEntries()
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
      // Primeiro, remover todos os atendimentos associados ao cliente
      const { error: atendimentosError } = await supabase
        .from('atendimentos')
        .delete()
        .eq('cliente_id', id)
        .eq('user_id', user.id);

      if (atendimentosError) throw atendimentosError;

      // Depois, remover o cliente
      const { error: clienteError } = await supabase
        .from('clientes')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (clienteError) throw clienteError;
      
      // Atualizar o estado local
      setClientes(prev => prev.filter(c => c.id !== id));
      setAtendimentos(prev => prev.filter(a => a.cliente_id !== id));
      
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
    
    // Refetch para atualizar cards e gráficos
    await fetchFinancialEntries();
    
    toast({
      title: "Sucesso",
      description: "Atendimento atualizado com sucesso"
    });
  };

  const removerAtendimento = async (id: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('atendimentos')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
    
    setAtendimentos(prev => prev.filter(a => a.id !== id));
    
    // Refetch para atualizar cards e gráficos imediatamente
    await fetchFinancialEntries();
    
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

    console.log('[BW][FIN] Adicionando despesa:', despesaData);

    const { data, error } = await supabase
      .from('despesas')
      .insert([{ ...despesaData, user_id: user.id }])
      .select()
      .single();

    if (error) throw error;
    
    setDespesas(prev => [...prev, data]);
    
    // If recurring, materialize future entries
    if (despesaData.recorrente) {
      console.log('[BW][FIN] Materializando despesa recorrente');
      await materializeFinancialRecurring();
    }
    
    // Refetch para atualizar cards e gráficos
    await fetchDespesas();
    await fetchFinancialEntries();
    
    toast({
      title: "Sucesso",
      description: "Despesa adicionada com sucesso"
    });
    
    return data;
  };

  const atualizarDespesa = async (id: string, despesaData: Partial<Despesa>) => {
    if (!user) return;

    console.log('[BW][FIN] Atualizando despesa:', { id, despesaData });

    const { data, error } = await supabase
      .from('despesas')
      .update(despesaData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    
    setDespesas(prev => prev.map(d => d.id === id ? data : d));
    
    // If recurring, rematerialize future entries
    if (data.recorrente) {
      console.log('[BW][FIN] Rematerializando despesa recorrente');
      await materializeFinancialRecurring();
    }
    
    // Refetch para atualizar cards e gráficos
    await fetchDespesas();
    await fetchFinancialEntries();
    
    toast({
      title: "Sucesso",
      description: "Despesa atualizada com sucesso"
    });
  };

  const removerDespesa = async (id: string) => {
    if (!user) return;

    console.log('[BW][FIN] Removendo despesa:', id);

    const { error } = await supabase
      .from('despesas')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
    
    setDespesas(prev => prev.filter(d => d.id !== id));
    
    // Rematerializar para limpar parcelas órfãs
    await materializeFinancialRecurring();
    await fetchDespesas();
    await fetchFinancialEntries();
    
    toast({
      title: "Sucesso",
      description: "Despesa removida com sucesso"
    });
  };

  // Receita functions
  const adicionarReceita = async (receitaData: Omit<Receita, 'id' | 'user_id' | 'created_at'>) => {
    if (!user) return;

    console.log('[BW][RECEITA_FIXA] Adicionando receita:', receitaData);

    const { data, error } = await supabase
      .from('receitas')
      .insert([{ ...receitaData, user_id: user.id }])
      .select()
      .single();

    if (error) throw error;
    
    setReceitas(prev => [...prev, data]);
    
    // If recurring OR tipo=fixa, materialize future entries
    const tipoValue = (receitaData as any).tipo;
    if (receitaData.recorrente || tipoValue === 'fixa') {
      console.log('[BW][RECEITA_FIXA] Materializando receita', { 
        recorrente: receitaData.recorrente, 
        tipo: tipoValue
      });
      await materializeFinancialRecurring();
    }
    
    // Refetch para atualizar cards e gráficos
    await fetchReceitas();
    await fetchFinancialEntries();
    
    toast({
      title: "Sucesso",
      description: "Receita adicionada com sucesso"
    });
    
    return data;
  };

  const atualizarReceita = async (id: string, receitaData: Partial<Receita>) => {
    if (!user) return;

    console.log('[BW][RECEITA_FIXA] Atualizando receita:', { id, receitaData });

    const { data, error } = await supabase
      .from('receitas')
      .update(receitaData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    
    setReceitas(prev => prev.map(r => r.id === id ? data : r));
    
    // If recurring OR tipo=fixa, rematerialize future entries
    const tipoValue = (data as any).tipo;
    if (data.recorrente || tipoValue === 'fixa') {
      console.log('[BW][RECEITA_FIXA] Rematerializando receita', { 
        recorrente: data.recorrente, 
        tipo: tipoValue
      });
      await materializeFinancialRecurring();
    }
    
    // Refetch para atualizar cards e gráficos
    await fetchReceitas();
    await fetchFinancialEntries();
    
    toast({
      title: "Sucesso",
      description: "Receita atualizada com sucesso"
    });
  };

  const removerReceita = async (id: string) => {
    if (!user) return;

    console.log('[BW][RECEITA_FIXA] Removendo receita:', id);

    // First, get the receita to know its description for cleaning up financial_entries
    const { data: receita } = await supabase
      .from('receitas')
      .select('descricao, tipo, recorrente')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (receita) {
      // Remove all financial_entries related to this receita
      const notePatterns = [
        `Recorrente: ${receita.descricao}`,
        `Fixa: ${receita.descricao}`
      ];

      console.log('[BW][RECEITA_FIXA] Removendo financial_entries com notes:', notePatterns);

      for (const notePattern of notePatterns) {
        const { error: deleteEntriesError } = await supabase
          .from('financial_entries')
          .delete()
          .eq('user_id', user.id)
          .eq('kind', 'revenue')
          .eq('note', notePattern);

        if (deleteEntriesError) {
          console.error('[BW][RECEITA_FIXA] Error deleting financial entries:', deleteEntriesError);
        }
      }
    }

    // Now delete the receita
    const { error } = await supabase
      .from('receitas')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
    
    setReceitas(prev => prev.filter(r => r.id !== id));
    
    // Refetch to update cards and charts
    await fetchReceitas();
    await fetchFinancialEntries();
    
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
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    console.log('[BW][SYNC] ========== Início dos cálculos (fonte canônica) ==========');
    console.log('[BW][SYNC] TZ:', APP_TZ, 'Hoje:', today.toISOString());
    console.log('[BW][SYNC] Financial entries total:', financialEntries.length);
    console.log('[BW][SYNC] Atendimentos total:', atendimentos.length);
    
    // Helper to parse DATE as local (prevent -1 day bug)
    const parseLocalDate = (dateStr: string): Date => {
      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(year, month - 1, day);
    };
    
    // ============================================
    // CURRENT MONTH DATA - USE financial_entries (expected + confirmed)
    // ============================================
    const firstDayCurrentMonth = new Date(currentYear, currentMonth, 1);
    const lastDayCurrentMonth = new Date(currentYear, currentMonth + 1, 0);
    const firstDayStr = firstDayCurrentMonth.toISOString().split('T')[0];
    const lastDayStr = lastDayCurrentMonth.toISOString().split('T')[0];
    
    // RECEITAS do mês atual (expected + confirmed from financial_entries)
    const finEntriesReceitasMesAtual = financialEntries.filter(fe => {
      return fe.kind === 'revenue' &&
             (fe.status === 'expected' || fe.status === 'confirmed') &&
             fe.due_date >= firstDayStr &&
             fe.due_date <= lastDayStr &&
             parseLocalDate(fe.due_date) <= today;
    });
    
    // DESPESAS do mês atual (expected + confirmed from financial_entries)
    const finEntriesDespesasMesAtual = financialEntries.filter(fe => {
      return fe.kind === 'expense' &&
             (fe.status === 'expected' || fe.status === 'confirmed') &&
             fe.due_date >= firstDayStr &&
             fe.due_date <= lastDayStr &&
             parseLocalDate(fe.due_date) <= today;
    });

    const faturamentoMesAtual = finEntriesReceitasMesAtual.reduce((sum, fe) => sum + Number(fe.amount), 0);
    const totalDespesas = finEntriesDespesasMesAtual.reduce((sum, fe) => sum + Number(fe.amount), 0);
    
    console.log('[BW][SYNC] Mês corrente:', { 
      periodo: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`,
      receitasCount: finEntriesReceitasMesAtual.length, 
      faturamento: faturamentoMesAtual.toFixed(2), 
      despesasCount: finEntriesDespesasMesAtual.length,
      despesas: totalDespesas.toFixed(2),
      lucro: (faturamentoMesAtual - totalDespesas).toFixed(2)
    });

    // ============================================
    // GRÁFICO 1 - HISTÓRICO (Últimos 4 meses) - USE financial_entries + atendimentos
    // ============================================
    const historicoMensal = [];
    
    console.log('[BW][SYNC] ========== Gráfico 1 - Histórico ==========');
    
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
      
      // RECEITAS do mês (expected + confirmed from financial_entries)
      const finEntriesReceitasMes = financialEntries.filter(fe => {
        const dueDate = parseLocalDate(fe.due_date);
        return fe.kind === 'revenue' &&
               (fe.status === 'expected' || fe.status === 'confirmed') &&
               fe.due_date >= firstDayMonthStr &&
               fe.due_date <= lastDayMonthStr &&
               (!isCurrentMonth || dueDate <= today);
      });
      
      // AGENDADOS do mês (scheduled appointments by data local)
      const atendimentosAgendadosMes = atendimentos.filter(a => {
        const dataAtendimento = parseLocalDate(a.data);
        return a.status === 'agendado' &&
               dataAtendimento.getMonth() === month &&
               dataAtendimento.getFullYear() === year &&
               (!isCurrentMonth || dataAtendimento <= today);
      });

      // DESPESAS do mês (expected + confirmed from financial_entries)
      const finEntriesDespesasMes = financialEntries.filter(fe => {
        const dueDate = parseLocalDate(fe.due_date);
        return fe.kind === 'expense' &&
               (fe.status === 'expected' || fe.status === 'confirmed') &&
               fe.due_date >= firstDayMonthStr &&
               fe.due_date <= lastDayMonthStr &&
               (!isCurrentMonth || dueDate <= today);
      });

      const realizadoMes = finEntriesReceitasMes.reduce((sum, fe) => sum + Number(fe.amount), 0);
      const agendadoMes = atendimentosAgendadosMes.reduce((sum, a) => sum + Number(a.valor_total || a.valor), 0);
      const despesasTotalMes = finEntriesDespesasMes.reduce((sum, fe) => sum + Number(fe.amount), 0);

      const mesLabel = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
      
      historicoMensal.push({
        mes: mesLabel,
        faturamento: realizadoMes,
        realizado: realizadoMes,
        agendado: agendadoMes, // Blue dashed line in chart
        despesas: despesasTotalMes
      });
      
      console.log(`[BW][SYNC] Gráfico 1 - ${mesLabel}:`, {
        receitas: realizadoMes.toFixed(2),
        agendados: agendadoMes.toFixed(2),
        despesas: despesasTotalMes.toFixed(2),
        receitasCount: finEntriesReceitasMes.length,
        agendadosCount: atendimentosAgendadosMes.length,
        despesasCount: finEntriesDespesasMes.length
      });
    }

    // ============================================
    // GRÁFICO 2 - PROJEÇÕES (Próximos 4 meses)
    // MÊS CORRENTE: usar MESMA lógica do Gráfico 1 (valores idênticos)
    // MESES FUTUROS: usar financial_entries com status='expected'
    // ============================================
    const projecaoMensal = [];
    
    console.log('[BW][SYNC] ========== Gráfico 2 - Projeções ==========');
    
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
        receitasProj = faturamentoMesAtual;
        despesasProj = totalDespesas;
        
        // Agendados do mês corrente (mesma lógica do histórico)
        const atendimentosAgendadosMesAtual = atendimentos.filter(a => {
          const dataAtendimento = parseLocalDate(a.data);
          return a.status === 'agendado' &&
                 dataAtendimento.getMonth() === currentMonth &&
                 dataAtendimento.getFullYear() === currentYear &&
                 dataAtendimento <= today;
        });
        agendadosProj = atendimentosAgendadosMesAtual.reduce((sum, a) => sum + Number(a.valor_total || a.valor), 0);
        
        console.log(`[BW][SYNC] Gráfico 2 - ${mesLabel} (MESMA LÓGICA G1):`, {
          receitas: receitasProj.toFixed(2),
          despesas: despesasProj.toFixed(2),
          agendados: agendadosProj.toFixed(2),
          match: 'Deve ser IGUAL ao Gráfico 1'
        });
      } else {
        // ============================================
        // MESES FUTUROS: usar financial_entries expected apenas
        // ============================================
        const firstDay = new Date(futureYear, futureMonth, 1);
        const lastDay = new Date(futureYear, futureMonth + 1, 0);
        const firstDayMonthStr = firstDay.toISOString().split('T')[0];
        const lastDayMonthStr = lastDay.toISOString().split('T')[0];
        
        // Receitas futuras (financial_entries expected)
        const finEntriesReceitas = financialEntries.filter(fe => 
          fe.kind === 'revenue' &&
          fe.status === 'expected' &&
          fe.due_date >= firstDayMonthStr &&
          fe.due_date <= lastDayMonthStr
        );
        receitasProj = finEntriesReceitas.reduce((sum, fe) => sum + Number(fe.amount), 0);
        
        // Despesas futuras (financial_entries expected)
        const finEntriesDespesas = financialEntries.filter(fe => 
          fe.kind === 'expense' &&
          fe.status === 'expected' &&
          fe.due_date >= firstDayMonthStr &&
          fe.due_date <= lastDayMonthStr
        );
        despesasProj = finEntriesDespesas.reduce((sum, fe) => sum + Number(fe.amount), 0);
        
        // Agendados futuros (por data local)
        const atendimentosFuturos = atendimentos.filter(a => {
          const dataAtendimento = parseLocalDate(a.data);
          return a.status === 'agendado' &&
                 dataAtendimento >= firstDay &&
                 dataAtendimento <= lastDay;
        });
        agendadosProj = atendimentosFuturos.reduce((sum, a) => sum + Number(a.valor_total || a.valor), 0);
        
        console.log(`[BW][SYNC] Gráfico 2 - ${mesLabel} (expected):`, {
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

    console.log('[BW][SYNC] ========== Fim dos cálculos ==========');

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