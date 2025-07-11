import { useState, useEffect } from 'react';
import { Cliente, Atendimento, Despesa, Receita, DadosFinanceiros, ServicoPacote } from '@/types';
import { useLocalStorage } from './useLocalStorage';

export function useMobData() {
  const [clientes, setClientes] = useLocalStorage<Cliente[]>('mob-clientes', []);
  const [atendimentos, setAtendimentos] = useLocalStorage<Atendimento[]>('mob-atendimentos', []);
  const [despesas, setDespesas] = useLocalStorage<Despesa[]>('mob-despesas', []);
  const [receitas, setReceitas] = useLocalStorage<Receita[]>('mob-receitas', []);
  const [servicosPacotes, setServicosPacotes] = useLocalStorage<ServicoPacote[]>('mob-servicos-pacotes', []);

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
  const adicionarAtendimento = (atendimento: Omit<Atendimento, 'id'>) => {
    const novoAtendimento: Atendimento = {
      ...atendimento,
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

  // Calcular dados financeiros
  const calcularDadosFinanceiros = (): DadosFinanceiros => {
    const agora = new Date();
    const mesAtual = agora.getMonth();
    const anoAtual = agora.getFullYear();

    // Receita do mês atual (atendimentos + receitas manuais)
    const receitaAtendimentos = atendimentos
      .filter(a => {
        const dataAtendimento = new Date(a.data);
        return dataAtendimento.getMonth() === mesAtual && 
               dataAtendimento.getFullYear() === anoAtual &&
               a.status === 'realizado';
      })
      .reduce((total, a) => total + a.valor, 0);

    const receitaManual = receitas
      .filter(r => {
        const dataReceita = new Date(r.data);
        return dataReceita.getMonth() === mesAtual && 
               dataReceita.getFullYear() === anoAtual;
      })
      .reduce((total, r) => total + r.valor, 0);

    const receitaMesAtual = receitaAtendimentos + receitaManual;

    // Despesas do mês atual
    const despesasMesAtual = despesas
      .filter(d => {
        const dataDespesa = new Date(d.data);
        return dataDespesa.getMonth() === mesAtual && 
               dataDespesa.getFullYear() === anoAtual;
      })
      .reduce((total, d) => total + d.valor, 0);

    // Histórico dos últimos 6 meses
    const historicoMensal = [];
    for (let i = 5; i >= 0; i--) {
      const data = new Date(anoAtual, mesAtual - i, 1);
      const mes = data.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      
      const receitaAtendimentosMes = atendimentos
        .filter(a => {
          const dataAtendimento = new Date(a.data);
          return dataAtendimento.getMonth() === data.getMonth() && 
                 dataAtendimento.getFullYear() === data.getFullYear() &&
                 a.status === 'realizado';
        })
        .reduce((total, a) => total + a.valor, 0);

      const receitaManualMes = receitas
        .filter(r => {
          const dataReceita = new Date(r.data);
          return dataReceita.getMonth() === data.getMonth() && 
                 dataReceita.getFullYear() === data.getFullYear();
        })
        .reduce((total, r) => total + r.valor, 0);

      const receitaMes = receitaAtendimentosMes + receitaManualMes;

      const despesasMes = despesas
        .filter(d => {
          const dataDespesa = new Date(d.data);
          return dataDespesa.getMonth() === data.getMonth() && 
                 dataDespesa.getFullYear() === data.getFullYear();
        })
        .reduce((total, d) => total + d.valor, 0);

      historicoMensal.push({
        mes,
        receita: receitaMes,
        despesas: despesasMes,
      });
    }

    // Receita média mensal
    const receitaMediaMensal = historicoMensal.length > 0 
      ? historicoMensal.reduce((total, h) => total + h.receita, 0) / historicoMensal.length
      : 0;

    // Projeção próximo mês (baseada na média das últimas 4 semanas)
    const ultimasQuatroSemanas = new Date();
    ultimasQuatroSemanas.setDate(ultimasQuatroSemanas.getDate() - 28);
    
    const receitaUltimas4Semanas = atendimentos
      .filter(a => {
        const dataAtendimento = new Date(a.data);
        return dataAtendimento >= ultimasQuatroSemanas && a.status === 'realizado';
      })
      .reduce((total, a) => total + a.valor, 0);

    const projecaoProximoMes = receitaUltimas4Semanas * (30 / 28);

    return {
      receitaMesAtual,
      receitaMediaMensal: historicoMensal.length > 0 
        ? historicoMensal.reduce((total, h) => total + h.receita, 0) / historicoMensal.length
        : 0,
      projecaoProximoMes: (receitaAtendimentos + receitaManual) * (30 / 28),
      lucroLiquido: receitaMesAtual - despesasMesAtual,
      totalDespesas: despesasMesAtual,
      historicoMensal,
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
