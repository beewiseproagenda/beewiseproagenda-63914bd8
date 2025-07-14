import { useState, useEffect } from 'react';
import { Cliente, Atendimento, Despesa, Receita, DadosFinanceiros, ServicoPacote } from '@/types';
import { useLocalStorage } from './useLocalStorage';

export function useMobData() {
  // Dados de exemplo para demonstrar a funcionalidade
  const dadosIniciais = {
    clientes: [
      {
        id: '1',
        nome: 'Maria Souza',
        telefone: '(11) 99999-1111',
        email: 'maria@email.com',
        criadoEm: new Date('2024-01-15'),
      },
      {
        id: '2',
        nome: 'João Lima',
        telefone: '(11) 99999-2222',
        email: 'joao@email.com',
        criadoEm: new Date('2024-02-10'),
      },
      {
        id: '3',
        nome: 'Ana Costa',
        telefone: '(11) 99999-3333',
        email: 'ana@email.com',
        criadoEm: new Date('2024-03-05'),
      }
    ] as Cliente[],
    atendimentos: [
      {
        id: '1',
        data: new Date(),
        hora: '22:00',
        clienteId: '1',
        clienteNome: 'Maria Souza',
        servico: 'Unha',
        valor: 50.00,
        formaPagamento: 'pix' as const,
        status: 'agendado' as const,
      },
      {
        id: '2',
        data: new Date(),
        hora: '10:00',
        clienteId: '2',
        clienteNome: 'João Lima',
        servico: 'Corte de cabelo',
        valor: 35.00,
        formaPagamento: 'dinheiro' as const,
        status: 'agendado' as const,
      },
      {
        id: '3',
        data: new Date(Date.now() + 86400000), // amanhã
        hora: '14:00',
        clienteId: '3',
        clienteNome: 'Ana Costa',
        servico: 'Manicure',
        valor: 40.00,
        formaPagamento: 'cartao_credito' as const,
        status: 'agendado' as const,
      }
    ] as Atendimento[]
  };

  const [clientes, setClientes] = useLocalStorage<Cliente[]>('mob-clientes', dadosIniciais.clientes);
  const [atendimentos, setAtendimentos] = useLocalStorage<Atendimento[]>('mob-atendimentos', dadosIniciais.atendimentos);
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

  // Calcular dados financeiros com variações
  const calcularDadosFinanceiros = (): DadosFinanceiros => {
    const agora = new Date();
    const mesAtual = agora.getMonth();
    const anoAtual = agora.getFullYear();

    // Mês anterior
    const mesAnterior = mesAtual === 0 ? 11 : mesAtual - 1;
    const anoMesAnterior = mesAtual === 0 ? anoAtual - 1 : anoAtual;

    // Faturamento do mês atual (atendimentos + receitas manuais)
    const faturamentoAtendimentos = atendimentos
      .filter(a => {
        const dataAtendimento = new Date(a.data);
        return dataAtendimento.getMonth() === mesAtual && 
               dataAtendimento.getFullYear() === anoAtual &&
               a.status === 'realizado';
      })
      .reduce((total, a) => total + a.valor, 0);

    const faturamentoManual = receitas
      .filter(r => {
        const dataReceita = new Date(r.data);
        return dataReceita.getMonth() === mesAtual && 
               dataReceita.getFullYear() === anoAtual;
      })
      .reduce((total, r) => total + r.valor, 0);

    const faturamentoMesAtual = faturamentoAtendimentos + faturamentoManual;

    // Faturamento do mês anterior
    const faturamentoAtendimentosAnterior = atendimentos
      .filter(a => {
        const dataAtendimento = new Date(a.data);
        return dataAtendimento.getMonth() === mesAnterior && 
               dataAtendimento.getFullYear() === anoMesAnterior &&
               a.status === 'realizado';
      })
      .reduce((total, a) => total + a.valor, 0);

    const faturamentoManualAnterior = receitas
      .filter(r => {
        const dataReceita = new Date(r.data);
        return dataReceita.getMonth() === mesAnterior && 
               dataReceita.getFullYear() === anoMesAnterior;
      })
      .reduce((total, r) => total + r.valor, 0);

    const faturamentoMesAnterior = faturamentoAtendimentosAnterior + faturamentoManualAnterior;

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

    // Histórico dos últimos 6 meses
    const historicoMensal = [];
    for (let i = 5; i >= 0; i--) {
      const data = new Date(anoAtual, mesAtual - i, 1);
      const mes = data.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      
      const faturamentoAtendimentosMes = atendimentos
        .filter(a => {
          const dataAtendimento = new Date(a.data);
          return dataAtendimento.getMonth() === data.getMonth() && 
                 dataAtendimento.getFullYear() === data.getFullYear() &&
                 a.status === 'realizado';
        })
        .reduce((total, a) => total + a.valor, 0);

      const faturamentoManualMes = receitas
        .filter(r => {
          const dataReceita = new Date(r.data);
          return dataReceita.getMonth() === data.getMonth() && 
                 dataReceita.getFullYear() === data.getFullYear();
        })
        .reduce((total, r) => total + r.valor, 0);

      const faturamentoMes = faturamentoAtendimentosMes + faturamentoManualMes;

      const despesasMes = despesas
        .filter(d => {
          const dataDespesa = new Date(d.data);
          return dataDespesa.getMonth() === data.getMonth() && 
                 dataDespesa.getFullYear() === data.getFullYear();
        })
        .reduce((total, d) => total + d.valor, 0);

      historicoMensal.push({
        mes,
        faturamento: faturamentoMes,
        despesas: despesasMes,
      });
    }

    // Faturamento média mensal
    const faturamentoMediaMensal = historicoMensal.length > 0 
      ? historicoMensal.reduce((total, h) => total + h.faturamento, 0) / historicoMensal.length
      : 0;

    // Projeção próximo mês (baseada na média das últimas 4 semanas)
    const ultimasQuatroSemanas = new Date();
    ultimasQuatroSemanas.setDate(ultimasQuatroSemanas.getDate() - 28);
    
    const faturamentoUltimas4Semanas = atendimentos
      .filter(a => {
        const dataAtendimento = new Date(a.data);
        return dataAtendimento >= ultimasQuatroSemanas && a.status === 'realizado';
      })
      .reduce((total, a) => total + a.valor, 0);

    const projecaoProximoMes = faturamentoUltimas4Semanas * (30 / 28);

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
