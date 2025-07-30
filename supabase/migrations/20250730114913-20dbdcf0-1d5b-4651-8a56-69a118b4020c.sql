-- Create tables for clientes, atendimentos, despesas, receitas and servicos_pacotes

-- Clientes table
CREATE TABLE public.clientes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    nome TEXT NOT NULL,
    telefone TEXT NOT NULL,
    email TEXT NOT NULL,
    tipo_pessoa TEXT NOT NULL CHECK (tipo_pessoa IN ('cpf', 'cnpj')),
    cpf_cnpj TEXT NOT NULL,
    endereco JSONB NOT NULL DEFAULT '{}',
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    ultimo_atendimento TIMESTAMP WITH TIME ZONE,
    recorrente BOOLEAN DEFAULT false,
    recorrencia TEXT CHECK (recorrencia IN ('diaria', 'semanal', 'mensal')),
    agendamento_fixo JSONB,
    pacote_id UUID,
    tipo_cobranca TEXT CHECK (tipo_cobranca IN ('pacote', 'variavel'))
);

-- Enable RLS for clientes
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- RLS policies for clientes
CREATE POLICY "Users can view their own clientes" ON public.clientes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own clientes" ON public.clientes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clientes" ON public.clientes
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clientes" ON public.clientes
    FOR DELETE USING (auth.uid() = user_id);

-- Servicos_pacotes table
CREATE TABLE public.servicos_pacotes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    nome TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('servico', 'pacote')),
    valor DECIMAL(10,2) NOT NULL,
    descricao TEXT,
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for servicos_pacotes
ALTER TABLE public.servicos_pacotes ENABLE ROW LEVEL SECURITY;

-- RLS policies for servicos_pacotes
CREATE POLICY "Users can view their own servicos_pacotes" ON public.servicos_pacotes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own servicos_pacotes" ON public.servicos_pacotes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own servicos_pacotes" ON public.servicos_pacotes
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own servicos_pacotes" ON public.servicos_pacotes
    FOR DELETE USING (auth.uid() = user_id);

-- Atendimentos table
CREATE TABLE public.atendimentos (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    data DATE NOT NULL,
    hora TIME NOT NULL,
    cliente_id UUID NOT NULL REFERENCES public.clientes(id),
    servico TEXT NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    forma_pagamento TEXT NOT NULL CHECK (forma_pagamento IN ('dinheiro', 'pix', 'cartao_debito', 'cartao_credito', 'transferencia', 'outro')),
    observacoes TEXT,
    status TEXT NOT NULL CHECK (status IN ('agendado', 'realizado', 'cancelado')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for atendimentos
ALTER TABLE public.atendimentos ENABLE ROW LEVEL SECURITY;

-- RLS policies for atendimentos
CREATE POLICY "Users can view their own atendimentos" ON public.atendimentos
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own atendimentos" ON public.atendimentos
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own atendimentos" ON public.atendimentos
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own atendimentos" ON public.atendimentos
    FOR DELETE USING (auth.uid() = user_id);

-- Despesas table
CREATE TABLE public.despesas (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    data DATE NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    descricao TEXT NOT NULL,
    categoria TEXT NOT NULL CHECK (categoria IN ('aluguel', 'internet', 'marketing', 'equipamentos', 'transporte', 'alimentacao', 'sistema', 'aplicativos', 'servico_contratado', 'outros')),
    tipo TEXT NOT NULL CHECK (tipo IN ('fixa', 'variavel')),
    observacoes TEXT,
    recorrente BOOLEAN DEFAULT false,
    recorrencia JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for despesas
ALTER TABLE public.despesas ENABLE ROW LEVEL SECURITY;

-- RLS policies for despesas
CREATE POLICY "Users can view their own despesas" ON public.despesas
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own despesas" ON public.despesas
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own despesas" ON public.despesas
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own despesas" ON public.despesas
    FOR DELETE USING (auth.uid() = user_id);

-- Receitas table
CREATE TABLE public.receitas (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    data DATE NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    descricao TEXT NOT NULL,
    categoria TEXT NOT NULL CHECK (categoria IN ('servico_prestado', 'atendimento', 'consultoria', 'curso', 'produto', 'outros')),
    forma_pagamento TEXT NOT NULL CHECK (forma_pagamento IN ('dinheiro', 'pix', 'cartao_debito', 'cartao_credito', 'transferencia', 'outro')),
    observacoes TEXT,
    recorrente BOOLEAN DEFAULT false,
    recorrencia JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for receitas
ALTER TABLE public.receitas ENABLE ROW LEVEL SECURITY;

-- RLS policies for receitas
CREATE POLICY "Users can view their own receitas" ON public.receitas
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own receitas" ON public.receitas
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own receitas" ON public.receitas
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own receitas" ON public.receitas
    FOR DELETE USING (auth.uid() = user_id);

-- Add indexes for better performance
CREATE INDEX idx_clientes_user_id ON public.clientes(user_id);
CREATE INDEX idx_atendimentos_user_id ON public.atendimentos(user_id);
CREATE INDEX idx_atendimentos_data ON public.atendimentos(data);
CREATE INDEX idx_atendimentos_cliente_id ON public.atendimentos(cliente_id);
CREATE INDEX idx_servicos_pacotes_user_id ON public.servicos_pacotes(user_id);
CREATE INDEX idx_despesas_user_id ON public.despesas(user_id);
CREATE INDEX idx_despesas_data ON public.despesas(data);
CREATE INDEX idx_receitas_user_id ON public.receitas(user_id);
CREATE INDEX idx_receitas_data ON public.receitas(data);

-- Create trigger for updating updated_at on atendimentos
CREATE TRIGGER update_atendimentos_updated_at
    BEFORE UPDATE ON public.atendimentos
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();