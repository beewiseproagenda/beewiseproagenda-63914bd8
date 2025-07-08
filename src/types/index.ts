
export interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  criadoEm: Date;
  ultimoAtendimento?: Date;
}

export interface Atendimento {
  id: string;
  data: Date;
  hora: string;
  clienteId: string;
  clienteNome: string;
  servico: string;
  valor: number;
  formaPagamento: FormaPagamento;
  observacoes?: string;
  status: 'agendado' | 'realizado' | 'cancelado';
}

export interface Despesa {
  id: string;
  data: Date;
  valor: number;
  descricao: string;
  categoria: CategoriaDespesa;
  tipo: 'fixa' | 'variavel';
  observacoes?: string;
}

export interface Receita {
  id: string;
  data: Date;
  valor: number;
  descricao: string;
  categoria: CategoriaReceita;
  formaPagamento: FormaPagamento;
  observacoes?: string;
}

export interface DadosFinanceiros {
  receitaMesAtual: number;
  receitaMediaMensal: number;
  projecaoProximoMes: number;
  lucroLiquido: number;
  totalDespesas: number;
  historicoMensal: Array<{
    mes: string;
    receita: number;
    despesas: number;
  }>;
}

export type FormaPagamento = 'dinheiro' | 'pix' | 'cartao_debito' | 'cartao_credito' | 'transferencia' | 'outro';

export type CategoriaDespesa = 'aluguel' | 'internet' | 'marketing' | 'equipamentos' | 'transporte' | 'alimentacao' | 'sistema' | 'aplicativos' | 'servico_contratado' | 'outros';

export type CategoriaReceita = 'servico_prestado' | 'atendimento' | 'consultoria' | 'curso' | 'produto' | 'outros';
