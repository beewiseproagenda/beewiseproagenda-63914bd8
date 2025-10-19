-- Criar tabela de serviços por agendamento (N:N)
CREATE TABLE IF NOT EXISTS public.agendamento_servicos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agendamento_id UUID NOT NULL REFERENCES public.atendimentos(id) ON DELETE CASCADE,
  servico_id UUID NOT NULL REFERENCES public.servicos_pacotes(id) ON DELETE CASCADE,
  descricao TEXT,
  valor NUMERIC(10,2) NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Adicionar coluna valor_total em atendimentos
ALTER TABLE public.atendimentos ADD COLUMN IF NOT EXISTS valor_total NUMERIC(10,2);

-- Migrar dados existentes: valor_total = valor atual
UPDATE public.atendimentos SET valor_total = valor WHERE valor_total IS NULL;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_agendamento_servicos_agendamento ON public.agendamento_servicos(agendamento_id);
CREATE INDEX IF NOT EXISTS idx_agendamento_servicos_servico ON public.agendamento_servicos(servico_id);

-- Função para recalcular valor_total
CREATE OR REPLACE FUNCTION public.recalcular_valor_total_agendamento()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total NUMERIC(10,2);
  v_agendamento_id UUID;
BEGIN
  -- Determinar o agendamento_id baseado na operação
  IF TG_OP = 'DELETE' THEN
    v_agendamento_id := OLD.agendamento_id;
  ELSE
    v_agendamento_id := NEW.agendamento_id;
  END IF;

  -- Calcular o total
  SELECT COALESCE(SUM(valor * quantidade), 0)
  INTO v_total
  FROM public.agendamento_servicos
  WHERE agendamento_id = v_agendamento_id;

  -- Atualizar o valor_total do agendamento
  UPDATE public.atendimentos
  SET valor_total = v_total,
      updated_at = now()
  WHERE id = v_agendamento_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Trigger para recalcular automaticamente
DROP TRIGGER IF EXISTS trg_recalcular_valor_total ON public.agendamento_servicos;
CREATE TRIGGER trg_recalcular_valor_total
AFTER INSERT OR UPDATE OR DELETE ON public.agendamento_servicos
FOR EACH ROW
EXECUTE FUNCTION public.recalcular_valor_total_agendamento();

-- Trigger para updated_at
DROP TRIGGER IF EXISTS trg_agendamento_servicos_updated_at ON public.agendamento_servicos;
CREATE TRIGGER trg_agendamento_servicos_updated_at
BEFORE UPDATE ON public.agendamento_servicos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies
ALTER TABLE public.agendamento_servicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own agendamento_servicos"
ON public.agendamento_servicos FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.atendimentos
    WHERE atendimentos.id = agendamento_servicos.agendamento_id
    AND atendimentos.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert own agendamento_servicos"
ON public.agendamento_servicos FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.atendimentos
    WHERE atendimentos.id = agendamento_servicos.agendamento_id
    AND atendimentos.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own agendamento_servicos"
ON public.agendamento_servicos FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.atendimentos
    WHERE atendimentos.id = agendamento_servicos.agendamento_id
    AND atendimentos.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own agendamento_servicos"
ON public.agendamento_servicos FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.atendimentos
    WHERE atendimentos.id = agendamento_servicos.agendamento_id
    AND atendimentos.user_id = auth.uid()
  )
);