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

export const useSupabaseData = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [servicosPacotes, setServicosPacotes] = useState<ServicoPacote[]>([]);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [receitas, setReceitas] = useState<Receita[]>([]);
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
        fetchReceitas()
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
  const adicionarAtendimento = async (atendimentoData: Omit<Atendimento, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return;

    // Sanitize payload: remove rule_id, keep only recurring_rule_id
    const sanitizedData = sanitizeAppointmentCreate(atendimentoData as any);

    try {
      const response = await supabase.functions.invoke('create-appointment', {
        body: sanitizedData,
        headers: {
          'x-viewer-tz': browserTz()
        }
      });

      if (response.error) throw response.error;

      const newAtendimento = response.data.appointment;
      setAtendimentos(prev => [...prev, newAtendimento]);
      
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
      
      setAtendimentos(prev => [...prev, data]);
      toast({
        title: "Sucesso",
        description: "Atendimento agendado com sucesso"
      });
      
      return data;
    }
  };

  const atualizarAtendimento = async (id: string, atendimentoData: Partial<Atendimento>) => {
    if (!user) return;

    // Sanitize payload: remove rule_id, keep only recurring_rule_id
    const sanitizedData = sanitizeAppointmentUpdate(atendimentoData as any);

    const { data, error } = await supabase
      .from('atendimentos')
      .update(sanitizedData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    
    setAtendimentos(prev => prev.map(a => a.id === id ? data : a));
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

    const { data, error } = await supabase
      .from('despesas')
      .insert([{ ...despesaData, user_id: user.id }])
      .select()
      .single();

    if (error) throw error;
    
    setDespesas(prev => [...prev, data]);
    toast({
      title: "Sucesso",
      description: "Despesa adicionada com sucesso"
    });
    
    return data;
  };

  const atualizarDespesa = async (id: string, despesaData: Partial<Despesa>) => {
    if (!user) return;

    const { data, error } = await supabase
      .from('despesas')
      .update(despesaData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    
    setDespesas(prev => prev.map(d => d.id === id ? data : d));
    toast({
      title: "Sucesso",
      description: "Despesa atualizada com sucesso"
    });
  };

  const removerDespesa = async (id: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('despesas')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
    
    setDespesas(prev => prev.filter(d => d.id !== id));
    toast({
      title: "Sucesso",
      description: "Despesa removida com sucesso"
    });
  };

  // Receita functions
  const adicionarReceita = async (receitaData: Omit<Receita, 'id' | 'user_id' | 'created_at'>) => {
    if (!user) return;

    const { data, error } = await supabase
      .from('receitas')
      .insert([{ ...receitaData, user_id: user.id }])
      .select()
      .single();

    if (error) throw error;
    
    setReceitas(prev => [...prev, data]);
    toast({
      title: "Sucesso",
      description: "Receita adicionada com sucesso"
    });
    
    return data;
  };

  const atualizarReceita = async (id: string, receitaData: Partial<Receita>) => {
    if (!user) return;

    const { data, error } = await supabase
      .from('receitas')
      .update(receitaData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    
    setReceitas(prev => prev.map(r => r.id === id ? data : r));
    toast({
      title: "Sucesso",
      description: "Receita atualizada com sucesso"
    });
  };

  const removerReceita = async (id: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('receitas')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
    
    setReceitas(prev => prev.filter(r => r.id !== id));
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

  // Financial calculations
  const calcularDadosFinanceiros = () => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Current month data (only up to today)
    const atendimentosRealizados = atendimentos.filter(a => 
      a.status === 'realizado' &&
      new Date(a.data).getMonth() === currentMonth &&
      new Date(a.data).getFullYear() === currentYear &&
      new Date(a.data) <= today
    );
    
    const atendimentosAgendados = atendimentos.filter(a => 
      a.status === 'agendado' &&
      new Date(a.data).getMonth() === currentMonth &&
      new Date(a.data).getFullYear() === currentYear &&
      new Date(a.data) <= today
    );

    const despesasMesAtual = despesas.filter(d => 
      new Date(d.data).getMonth() === currentMonth &&
      new Date(d.data).getFullYear() === currentYear &&
      new Date(d.data) <= today
    );

    const faturamentoMesAtual = atendimentosRealizados.reduce((sum, a) => sum + Number(a.valor), 0);
    const projecaoMesAtual = atendimentosAgendados.reduce((sum, a) => sum + Number(a.valor), 0);
    const totalDespesas = despesasMesAtual.reduce((sum, d) => sum + Number(d.valor), 0);

    // Add recurring expenses to current month (only for current month and before)
    const despesasRecorrentesMesAtual = despesas
      .filter(d => d.recorrente && new Date(d.data) <= today)
      .reduce((sum, d) => sum + calcularRecorrenciaFutura(d, currentMonth, currentYear), 0);

    const totalDespesasComRecorrencia = totalDespesas + despesasRecorrentesMesAtual;

    // Historical data - ONLY past months and current month (no future data)
    const historicoMensal = [];
    
    // Get exactly 4 months: 3 past months + current month (prevent duplicates)
    for (let i = 3; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - i, 1);
      const month = date.getMonth();
      const year = date.getFullYear();
      const isCurrentMonth = month === currentMonth && year === currentYear;
      
      const atendimentosRealizadosMes = atendimentos.filter(a => 
        a.status === 'realizado' &&
        new Date(a.data).getMonth() === month &&
        new Date(a.data).getFullYear() === year &&
        (!isCurrentMonth || new Date(a.data) <= today)
      );
      
      // For past months, include all agendamentos. For current month, only up to today
      const atendimentosAgendadosMes = atendimentos.filter(a => 
        a.status === 'agendado' &&
        new Date(a.data).getMonth() === month &&
        new Date(a.data).getFullYear() === year &&
        (!isCurrentMonth || new Date(a.data) <= today)
      );

      const despesasMes = despesas.filter(d => 
        new Date(d.data).getMonth() === month &&
        new Date(d.data).getFullYear() === year &&
        (!isCurrentMonth || new Date(d.data) <= today)
      );

      // Add recurring expenses for this month (only if original date is before or in this month)
      const despesasRecorrentesMes = despesas
        .filter(d => d.recorrente && new Date(d.data) <= new Date(year, month + 1, 0))
        .reduce((sum, d) => sum + calcularRecorrenciaFutura(d, month, year), 0);

      const realizadoMes = atendimentosRealizadosMes.reduce((sum, a) => sum + Number(a.valor), 0);
      const agendadoMes = atendimentosAgendadosMes.reduce((sum, a) => sum + Number(a.valor), 0);
      const despesasTotalMes = despesasMes.reduce((sum, d) => sum + Number(d.valor), 0) + despesasRecorrentesMes;

      historicoMensal.push({
        mes: date.toLocaleDateString('pt-BR', { month: 'short' }),
        faturamento: realizadoMes,
        realizado: realizadoMes,
        agendado: agendadoMes,
        despesas: despesasTotalMes
      });
    }
    
    // Debug: log dos meses renderizados para validação
    console.log('Meses renderizados no gráfico:', historicoMensal.map(h => h.mes));

    // Calculate future projections (separate from historical data)
    const projecoesFuturas = [];
    
    // Next 6 months projections
    for (let i = 1; i <= 6; i++) {
      const futureDate = new Date(currentYear, currentMonth + i, 1);
      const futureMonth = futureDate.getMonth();
      const futureYear = futureDate.getFullYear();
      
      // Future appointments
      const atendimentosFuturos = atendimentos.filter(a => 
        a.status === 'agendado' &&
        new Date(a.data).getMonth() === futureMonth &&
        new Date(a.data).getFullYear() === futureYear
      );

      // Future expenses (including recurring)
      const despesasFuturas = despesas.filter(d => 
        new Date(d.data).getMonth() === futureMonth &&
        new Date(d.data).getFullYear() === futureYear &&
        new Date(d.data) > today
      );

      const despesasRecorrentesFuturas = despesas
        .filter(d => d.recorrente)
        .reduce((sum, d) => sum + calcularRecorrenciaFutura(d, futureMonth, futureYear), 0);

      // Add recurring clients revenue to projections
      const receitaClientesRecorrentes = clientes
        .filter(c => c.recorrente)
        .reduce((sum, c) => sum + calcularReceitaClienteRecorrente(c, futureMonth, futureYear), 0);

      const projecaoReceita = atendimentosFuturos.reduce((sum, a) => sum + Number(a.valor), 0) + receitaClientesRecorrentes;
      const projecaoDespesas = despesasFuturas.reduce((sum, d) => sum + Number(d.valor), 0) + despesasRecorrentesFuturas;

      projecoesFuturas.push({
        mes: futureDate.toLocaleDateString('pt-BR', { month: 'short' }),
        faturamento: projecaoReceita,
        realizado: 0,
        agendado: projecaoReceita,
        despesas: projecaoDespesas
      });
    }

    const faturamentoMediaMensal = historicoMensal.slice(0, 4).reduce((sum, m) => sum + m.realizado, 0) / 4;
    const lucroLiquido = faturamentoMesAtual - totalDespesasComRecorrencia;

    return {
      faturamentoMesAtual,
      faturamentoMediaMensal,
      projecaoProximoMes: projecoesFuturas[0]?.agendado || 0,
      lucroLiquido,
      totalDespesas: totalDespesasComRecorrencia,
      historicoMensal, // Only past and current month data
      projecoesFuturas, // Future projections
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
        // Refetch appointments after materialization
        await fetchAtendimentos();
      }
    } catch (err) {
      console.error('Erro ao chamar materialize-recurring:', err);
    }
  };

  return {
    // Data
    clientes,
    atendimentos,
    servicosPacotes,
    despesas,
    receitas,
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
    materializeRecurringAppointments
  };
};