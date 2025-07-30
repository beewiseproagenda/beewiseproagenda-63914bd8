import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { Tables } from '@/integrations/supabase/types';

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
    
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('user_id', user.id)
      .order('nome');

    if (error) throw error;
    setClientes(data || []);
  };

  const fetchAtendimentos = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('atendimentos')
      .select('*')
      .eq('user_id', user.id)
      .order('data', { ascending: false });

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

    if (error) throw error;
    
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

    const { error } = await supabase
      .from('clientes')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
    
    setClientes(prev => prev.filter(c => c.id !== id));
    toast({
      title: "Sucesso",
      description: "Cliente removido com sucesso"
    });
  };

  // Atendimento functions
  const adicionarAtendimento = async (atendimentoData: Omit<Atendimento, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return;

    const { data, error } = await supabase
      .from('atendimentos')
      .insert([{ ...atendimentoData, user_id: user.id }])
      .select()
      .single();

    if (error) throw error;
    
    setAtendimentos(prev => [...prev, data]);
    toast({
      title: "Sucesso",
      description: "Atendimento agendado com sucesso"
    });
    
    return data;
  };

  const atualizarAtendimento = async (id: string, atendimentoData: Partial<Atendimento>) => {
    if (!user) return;

    const { data, error } = await supabase
      .from('atendimentos')
      .update(atendimentoData)
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

  // Financial calculations
  const calcularDadosFinanceiros = () => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Current month data
    const atendimentosRealizados = atendimentos.filter(a => 
      a.status === 'realizado' &&
      new Date(a.data).getMonth() === currentMonth &&
      new Date(a.data).getFullYear() === currentYear
    );
    
    const atendimentosAgendados = atendimentos.filter(a => 
      a.status === 'agendado' &&
      new Date(a.data).getMonth() === currentMonth &&
      new Date(a.data).getFullYear() === currentYear
    );

    const despesasMesAtual = despesas.filter(d => 
      new Date(d.data).getMonth() === currentMonth &&
      new Date(d.data).getFullYear() === currentYear
    );

    const faturamentoMesAtual = atendimentosRealizados.reduce((sum, a) => sum + Number(a.valor), 0);
    const projecaoMesAtual = atendimentosAgendados.reduce((sum, a) => sum + Number(a.valor), 0);
    const totalDespesas = despesasMesAtual.reduce((sum, d) => sum + Number(d.valor), 0);

    // Historical data for 6 months
    const historicoMensal = [];
    for (let i = 3; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - i, 1);
      const month = date.getMonth();
      const year = date.getFullYear();
      
      const atendimentosRealizadosMes = atendimentos.filter(a => 
        a.status === 'realizado' &&
        new Date(a.data).getMonth() === month &&
        new Date(a.data).getFullYear() === year
      );
      
      const atendimentosAgendadosMes = atendimentos.filter(a => 
        a.status === 'agendado' &&
        new Date(a.data).getMonth() === month &&
        new Date(a.data).getFullYear() === year
      );

      const despesasMes = despesas.filter(d => 
        new Date(d.data).getMonth() === month &&
        new Date(d.data).getFullYear() === year
      );

      historicoMensal.push({
        mes: date.toLocaleDateString('pt-BR', { month: 'short' }),
        faturamento: atendimentosRealizadosMes.reduce((sum, a) => sum + Number(a.valor), 0),
        realizado: atendimentosRealizadosMes.reduce((sum, a) => sum + Number(a.valor), 0),
        agendado: atendimentosAgendadosMes.reduce((sum, a) => sum + Number(a.valor), 0),
        despesas: despesasMes.reduce((sum, d) => sum + Number(d.valor), 0)
      });
    }

    // Current month
    historicoMensal.push({
      mes: today.toLocaleDateString('pt-BR', { month: 'short' }),
      faturamento: faturamentoMesAtual + projecaoMesAtual,
      realizado: faturamentoMesAtual,
      agendado: projecaoMesAtual,
      despesas: totalDespesas
    });

    // Next month projection
    const nextMonth = new Date(currentYear, currentMonth + 1, 1);
    const atendimentosProximoMes = atendimentos.filter(a => 
      a.status === 'agendado' &&
      new Date(a.data).getMonth() === nextMonth.getMonth() &&
      new Date(a.data).getFullYear() === nextMonth.getFullYear()
    );

    const projecaoProximoMes = atendimentosProximoMes.reduce((sum, a) => sum + Number(a.valor), 0);

    historicoMensal.push({
      mes: nextMonth.toLocaleDateString('pt-BR', { month: 'short' }),
      faturamento: projecaoProximoMes,
      realizado: 0,
      agendado: projecaoProximoMes,
      despesas: 0
    });

    const faturamentoMediaMensal = historicoMensal.slice(0, 4).reduce((sum, m) => sum + m.realizado, 0) / 4;
    const lucroLiquido = faturamentoMesAtual - totalDespesas;

    return {
      faturamentoMesAtual,
      faturamentoMediaMensal,
      projecaoProximoMes,
      lucroLiquido,
      totalDespesas,
      historicoMensal,
      variacaoFaturamento: 0,
      variacaoDespesas: 0,
      variacaoLucro: 0
    };
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
    
    // Calculations
    calcularDadosFinanceiros
  };
};