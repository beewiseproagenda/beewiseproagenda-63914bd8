import { useState, useEffect } from 'react';
import { Cliente, Atendimento, Despesa, Receita, DadosFinanceiros, ServicoPacote } from '@/types';
import { useLocalStorage } from './useLocalStorage';

export function useBwData() {
  const [clientes, setClientes] = useLocalStorage<Cliente[]>('bw-clientes', []);
  const [atendimentos, setAtendimentos] = useLocalStorage<Atendimento[]>('bw-atendimentos', []);
  const [despesas, setDespesas] = useLocalStorage<Despesa[]>('bw-despesas', []);
  const [receitas, setReceitas] = useLocalStorage<Receita[]>('bw-receitas', []);
  const [servicosPacotes, setServicosPacotes] = useLocalStorage<ServicoPacote[]>('bw-servicos-pacotes', []);

  // Funções para clientes
  const adicionarCliente = (cliente: Omit<Cliente, 'id' | 'criadoEm'>) => {
    const novoCliente: Cliente = {
      ...cliente,
      id: Date.now().toString(),
      criadoEm: new Date(),
    };
    setClientes(prev => [...prev, novoCliente]);
    return novoCliente;
  };

  const atualizarCliente = (id: string, dadosAtualizados: Partial<Cliente>) => {
    setClientes(prev => 
      prev.map(cliente => 
        cliente.id === id ? { ...cliente, ...dadosAtualizados } : cliente
      )
    );
  };

  const removerCliente = (id: string) => {
    setClientes(prev => prev.filter(cliente => cliente.id !== id));
    setAtendimentos(prev => prev.filter(atendimento => atendimento.clienteId !== id));
  };

  // Funções para atendimentos
  const adicionarAtendimento = (atendimento: Omit<Atendimento, 'id' | 'clienteNome'>) => {
    // Buscar nome do cliente automaticamente
    const cliente = clientes.find(c => c.id === atendimento.clienteId);
    const clienteNome = cliente?.nome || 'Cliente não encontrado';
    
    const novoAtendimento: Atendimento = {
      ...atendimento,
      clienteNome,
      id: Date.now().toString(),
    };
    setAtendimentos(prev => [...prev, novoAtendimento]);
    
    // Atualizar último atendimento do cliente
    atualizarCliente(atendimento.clienteId, { ultimoAtendimento: atendimento.data });
    
    return novoAtendimento;
  };

  const atualizarAtendimento = (id: string, dadosAtualizados: Partial<Atendimento>) => {
    setAtendimentos(prev => 
      prev.map(atendimento => 
        atendimento.id === id ? { ...atendimento, ...dadosAtualizados } : atendimento
      )
    );
  };

  const removerAtendimento = (id: string) => {
    setAtendimentos(prev => prev.filter(atendimento => atendimento.id !== id));
  };

  // Funções para despesas
  const adicionarDespesa = (despesa: Omit<Despesa, 'id'>) => {
    const novaDespesa: Despesa = {
      ...despesa,
      id: Date.now().toString(),
    };
    setDespesas(prev => [...prev, novaDespesa]);
    return novaDespesa;
  };

  const atualizarDespesa = (id: string, dadosAtualizados: Partial<Despesa>) => {
    setDespesas(prev => 
      prev.map(despesa => 
        despesa.id === id ? { ...despesa, ...dadosAtualizados } : despesa
      )
    );
  };

  const removerDespesa = (id: string) => {
    setDespesas(prev => prev.filter(despesa => despesa.id !== id));
  };

  // Funções para receitas
  const adicionarReceita = (receita: Omit<Receita, 'id'>) => {
    const novaReceita: Receita = {
      ...receita,
      id: Date.now().toString(),
    };
    setReceitas(prev => [...prev, novaReceita]);
    return novaReceita;
  };

  const atualizarReceita = (id: string, dadosAtualizados: Partial<Receita>) => {
    setReceitas(prev => 
      prev.map(receita => 
        receita.id === id ? { ...receita, ...dadosAtualizados } : receita
      )
    );
  };

  const removerReceita = (id: string) => {
    setReceitas(prev => prev.filter(receita => receita.id !== id));
  };

  // Funções para serviços e pacotes
  const adicionarServicoPacote = (servicoPacote: Omit<ServicoPacote, 'id' | 'criadoEm'>) => {
    const novoServicoPacote: ServicoPacote = {
      ...servicoPacote,
      id: Date.now().toString(),
      criadoEm: new Date(),
    };
    setServicosPacotes(prev => [...prev, novoServicoPacote]);
    return novoServicoPacote;
  };

  const atualizarServicoPacote = (id: string, dadosAtualizados: Partial<ServicoPacote>) => {
    setServicosPacotes(prev => 
      prev.map(item => 
        item.id === id ? { ...item, ...dadosAtualizados } : item
      )
    );
  };

  const removerServicoPacote = (id: string) => {
    setServicosPacotes(prev => prev.filter(item => item.id !== id));
  };

  // Calcular dados financeiros com variações
  const calcularDadosFinanceiros = (): DadosFinanceiros => {
    const agora = new Date();
    const mesAtual = agora.getMonth();
    const anoAtual = agora.getFullYear();
    const ultimoDiaMesAtual = new Date(anoAtual, mesAtual + 1, 0);

    // Mês anterior
    const mesAnterior = mesAtual === 0 ? 11 : mesAtual - 1;
    const anoMesAnterior = mesAtual === 0 ? anoAtual - 1 : anoAtual;

    // Faturamento do mês atual (apenas agendamentos realizados até o último dia do mês atual)
    const faturamentoAtendimentos = atendimentos
      .filter(a => {
        const dataAtendimento = new Date(a.data);
        return dataAtendimento.getMonth() === mesAtual && 
               dataAtendimento.getFullYear() === anoAtual &&
               a.status === 'realizado' &&
               dataAtendimento <= ultimoDiaMesAtual;
      })
      .reduce((total, a) => total + a.valor, 0);

    // Não consideramos mais receitas manuais, apenas agendamentos
    const faturamentoMesAtual = faturamentoAtendimentos;

    // Faturamento do mês anterior (apenas agendamentos realizados)
    const faturamentoAtendimentosAnterior = atendimentos
      .filter(a => {
        const dataAtendimento = new Date(a.data);
        return dataAtendimento.getMonth() === mesAnterior && 
               dataAtendimento.getFullYear() === anoMesAnterior &&
               a.status === 'realizado';
      })
      .reduce((total, a) => total + a.valor, 0);

    const faturamentoMesAnterior = faturamentoAtendimentosAnterior;

    // Despesas do mês atual
    const despesasMesAtual = despesas
      .filter(d => {
        const dataDespesa = new Date(d.data);
        return dataDespesa.getMonth() === mesAtual && 
               dataDespesa.getFullYear() === anoAtual;
      })
      .reduce((total, d) => total + d.valor, 0);

    // Despesas do mês anterior
    const despesasMesAnterior = despesas
      .filter(d => {
        const dataDespesa = new Date(d.data);
        return dataDespesa.getMonth() === mesAnterior && 
               dataDespesa.getFullYear() === anoMesAnterior;
      })
      .reduce((total, d) => total + d.valor, 0);

    // Calcular variações percentuais
    const variacaoFaturamento = faturamentoMesAnterior === 0 ? 0 : 
      ((faturamentoMesAtual - faturamentoMesAnterior) / faturamentoMesAnterior) * 100;
    
    const variacaoDespesas = despesasMesAnterior === 0 ? 0 : 
      ((despesasMesAtual - despesasMesAnterior) / despesasMesAnterior) * 100;

    const lucroAtual = faturamentoMesAtual - despesasMesAtual;
    const lucroAnterior = faturamentoMesAnterior - despesasMesAnterior;
    const variacaoLucro = lucroAnterior === 0 ? 0 : 
      ((lucroAtual - lucroAnterior) / lucroAnterior) * 100;

    // Histórico dos últimos 6 meses + próximos 6 meses (para mostrar realizado vs agendado)
    const historicoMensal = [];
    
    // Últimos 6 meses + mês atual
    for (let i = 5; i >= 0; i--) {
      const data = new Date(anoAtual, mesAtual - i, 1);
      const mes = data.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      
      const faturamentoRealizado = atendimentos
        .filter(a => {
          const dataAtendimento = new Date(a.data);
          return dataAtendimento.getMonth() === data.getMonth() && 
                 dataAtendimento.getFullYear() === data.getFullYear() &&
                 a.status === 'realizado';
        })
        .reduce((total, a) => total + a.valor, 0);

      // Para o mês atual e futuro, incluir agendamentos na projeção
      const faturamentoAgendado = atendimentos
        .filter(a => {
          const dataAtendimento = new Date(a.data);
          return dataAtendimento.getMonth() === data.getMonth() && 
                 dataAtendimento.getFullYear() === data.getFullYear() &&
                 a.status === 'agendado';
        })
        .reduce((total, a) => total + a.valor, 0);

      const despesasMes = despesas
        .filter(d => {
          const dataDespesa = new Date(d.data);
          return dataDespesa.getMonth() === data.getMonth() && 
                 dataDespesa.getFullYear() === data.getFullYear();
        })
        .reduce((total, d) => total + d.valor, 0);

      historicoMensal.push({
        mes,
        faturamento: faturamentoRealizado, // Para compatibilidade com o código existente
        realizado: faturamentoRealizado,
        agendado: faturamentoAgendado,
        despesas: despesasMes,
      });
    }

    // Calcular média dos últimos 3 meses para projeções futuras
    const ultimos3Meses = historicoMensal.slice(-3);
    const mediaReceita = ultimos3Meses.length > 0 
      ? ultimos3Meses.reduce((total, h) => total + h.realizado + h.agendado, 0) / ultimos3Meses.length
      : 0;
    const mediaDespesas = ultimos3Meses.length > 0 
      ? ultimos3Meses.reduce((total, h) => total + h.despesas, 0) / ultimos3Meses.length
      : 0;

    // Próximos 6 meses (dados agendados + projeção baseada na média)
    for (let i = 1; i <= 6; i++) {
      const data = new Date(anoAtual, mesAtual + i, 1);
      const mes = data.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      
      const faturamentoAgendado = atendimentos
        .filter(a => {
          const dataAtendimento = new Date(a.data);
          return dataAtendimento.getMonth() === data.getMonth() && 
                 dataAtendimento.getFullYear() === data.getFullYear() &&
                 a.status === 'agendado';
        })
        .reduce((total, a) => total + a.valor, 0);

      // Se não há agendamentos específicos, usar a média dos últimos 3 meses
      const projecaoReceita = faturamentoAgendado > 0 ? faturamentoAgendado : mediaReceita;

      historicoMensal.push({
        mes,
        faturamento: 0, // Para compatibilidade com o código existente
        realizado: 0,
        agendado: projecaoReceita,
        despesas: mediaDespesas, // Projetar despesas baseada na média
      });
    }

    // Faturamento média mensal
    const faturamentoMediaMensal = historicoMensal.length > 0 
      ? historicoMensal.reduce((total, h) => total + h.faturamento, 0) / historicoMensal.length
      : 0;

    // Projeção próximo mês (baseada nos agendamentos futuros)
    const proximoMes = new Date(anoAtual, mesAtual + 1, 1);
    const projecaoProximoMes = atendimentos
      .filter(a => {
        const dataAtendimento = new Date(a.data);
        return dataAtendimento.getMonth() === proximoMes.getMonth() && 
               dataAtendimento.getFullYear() === proximoMes.getFullYear() &&
               a.status === 'agendado' &&
               dataAtendimento > ultimoDiaMesAtual;
      })
      .reduce((total, a) => total + a.valor, 0);

    return {
      faturamentoMesAtual,
      faturamentoMediaMensal,
      projecaoProximoMes,
      lucroLiquido: lucroAtual,
      totalDespesas: despesasMesAtual,
      historicoMensal,
      variacaoFaturamento,
      variacaoDespesas,
      variacaoLucro,
    };
  };

  return {
    // Dados
    clientes,
    atendimentos,
    despesas,
    receitas,
    servicosPacotes,
    dadosFinanceiros: calcularDadosFinanceiros(),
    
    // Ações para clientes
    adicionarCliente,
    atualizarCliente,
    removerCliente,
    
    // Ações para atendimentos
    adicionarAtendimento,
    atualizarAtendimento,
    removerAtendimento,
    
    // Ações para despesas
    adicionarDespesa,
    atualizarDespesa,
    removerDespesa,
    
    // Ações para receitas
    adicionarReceita,
    atualizarReceita,
    removerReceita,
    
    // Ações para serviços e pacotes
    adicionarServicoPacote,
    atualizarServicoPacote,
    removerServicoPacote,
  };
}
