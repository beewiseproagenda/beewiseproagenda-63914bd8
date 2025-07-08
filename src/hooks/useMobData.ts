
import { useState, useEffect } from 'react';
import { Cliente, Atendimento, Despesa, DadosFinanceiros } from '@/types';
import { useLocalStorage } from './useLocalStorage';

export function useMobData() {
  const [clientes, setClientes] = useLocalStorage<Cliente[]>('mob-clientes', []);
  const [atendimentos, setAtendimentos] = useLocalStorage<Atendimento[]>('mob-atendimentos', []);
  const [despesas, setDespesas] = useLocalStorage<Despesa[]>('mob-despesas', []);

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

  // Calcular dados financeiros
  const calcularDadosFinanceiros = (): DadosFinanceiros => {
    const agora = new Date();
    const mesAtual = agora.getMonth();
    const anoAtual = agora.getFullYear();

    // Receita do mês atual
    const receitaMesAtual = atendimentos
      .filter(a => {
        const dataAtendimento = new Date(a.data);
        return dataAtendimento.getMonth() === mesAtual && 
               dataAtendimento.getFullYear() === anoAtual &&
               a.status === 'realizado';
      })
      .reduce((total, a) => total + a.valor, 0);

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
      
      const receitaMes = atendimentos
        .filter(a => {
          const dataAtendimento = new Date(a.data);
          return dataAtendimento.getMonth() === data.getMonth() && 
                 dataAtendimento.getFullYear() === data.getFullYear() &&
                 a.status === 'realizado';
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
      receitaMediaMensal,
      projecaoProximoMes,
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
  };
}
