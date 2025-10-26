
export interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  tipoPessoa: 'cpf' | 'cnpj';
  cpfCnpj: string;
  endereco: {
    cep: string;
    rua: string;
    numero: string;
    complemento: string;
    bairro: string;
    cidade: string;
    estado: string;
  };
  criadoEm: Date;
  ultimoAtendimento?: Date;
  recorrente?: boolean;
  recorrencia?: 'diaria' | 'semanal' | 'mensal';
  agendamentoFixo?: {
    dia: string;
    hora: string;
  };
  pacoteId?: string;
  tipoCobranca?: 'pacote' | 'variavel';
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
  recurring_rule_id?: string | null;
  rule_id?: string | null;
  occurrence_date?: string | null;
  start_at_utc?: string;
  end_at?: string;
  tz?: string;
}

export interface Despesa {
  id: string;
  data: Date;
  valor: number;
  descricao: string;
  categoria: CategoriaDespesa;
  tipo: 'fixa' | 'variavel';
  observacoes?: string;
  recorrente?: boolean;
  recorrencia?: {
    tipo: 'diaria' | 'semanal' | 'mensal';
    dia: number;
  };
}

export interface Receita {
  id: string;
  data: Date;
  valor: number;
  descricao: string;
  categoria: CategoriaReceita;
  formaPagamento: FormaPagamento;
  tipo: 'fixa' | 'variavel';
  observacoes?: string;
  recorrente?: boolean;
  recorrencia?: {
    tipo: 'diaria' | 'semanal' | 'mensal';
    dia: number;
  };
}

export interface ServicoPacote {
  id: string;
  nome: string;
  tipo: 'servico' | 'pacote';
  valor: number;
  descricao?: string;
  criadoEm: Date;
}

export interface DadosFinanceiros {
  faturamentoMesAtual: number;
  faturamentoMediaMensal: number;
  projecaoProximoMes: number;
  lucroLiquido: number;
  totalDespesas: number;
  historicoMensal: Array<{
    mes: string;
    faturamento: number;
    realizado: number;
    agendado: number;
    despesas: number;
  }>;
  projecaoMensal: Array<{
    mes: string;
    receitas: number;
    despesas: number;
    agendados: number;
    lucro: number;
  }>;
  variacaoFaturamento: number;
  variacaoDespesas: number;
  variacaoLucro: number;
}

export type FormaPagamento = 'dinheiro' | 'pix' | 'cartao_debito' | 'cartao_credito' | 'transferencia' | 'outro';

export type CategoriaDespesa = 'aluguel' | 'internet' | 'marketing' | 'equipamentos' | 'transporte' | 'alimentacao' | 'sistema' | 'aplicativos' | 'servico_contratado' | 'outros';

export type CategoriaReceita = 'servico_prestado' | 'atendimento' | 'consultoria' | 'curso' | 'produto' | 'outros';
