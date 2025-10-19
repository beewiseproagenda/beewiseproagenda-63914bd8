-- Adicionar campos para recebimento posterior (competência vs recebimento)
-- Correção cirúrgica: planos/convênios com recebimento no mês seguinte

-- 1. Adicionar flag de recebimento posterior no cliente
ALTER TABLE public.clientes 
ADD COLUMN IF NOT EXISTS recebimento_posterior boolean DEFAULT false;

COMMENT ON COLUMN public.clientes.recebimento_posterior IS 
'Indica se o recebimento é no mês seguinte (convênios/planos)';

-- 2. Adicionar campos de competência e recebimento nos atendimentos
ALTER TABLE public.atendimentos 
ADD COLUMN IF NOT EXISTS competencia_date date,
ADD COLUMN IF NOT EXISTS recebimento_previsto date;

COMMENT ON COLUMN public.atendimentos.competencia_date IS 
'Data de competência (quando o serviço foi prestado)';
COMMENT ON COLUMN public.atendimentos.recebimento_previsto IS 
'Data prevista de recebimento (pode ser mês seguinte)';

-- 3. Criar índices para performance nas queries financeiras
CREATE INDEX IF NOT EXISTS idx_atendimentos_competencia 
ON public.atendimentos(competencia_date) WHERE competencia_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_atendimentos_recebimento 
ON public.atendimentos(recebimento_previsto) WHERE recebimento_previsto IS NOT NULL;

-- 4. Preencher dados históricos (migração de dados existentes)
UPDATE public.atendimentos 
SET 
  competencia_date = data,
  recebimento_previsto = data
WHERE competencia_date IS NULL OR recebimento_previsto IS NULL;

-- 5. Criar função helper para calcular data de recebimento
CREATE OR REPLACE FUNCTION public.calcular_recebimento_previsto(
  p_data_competencia date,
  p_recebimento_posterior boolean
)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_mes_seguinte date;
  v_ultimo_dia_mes int;
BEGIN
  IF NOT p_recebimento_posterior THEN
    RETURN p_data_competencia;
  END IF;
  
  -- Adicionar 1 mês
  v_mes_seguinte := p_data_competencia + interval '1 month';
  
  -- Tentar manter o mesmo dia; se não existir, usar último dia do mês
  v_ultimo_dia_mes := EXTRACT(DAY FROM (date_trunc('month', v_mes_seguinte) + interval '1 month - 1 day')::date);
  
  IF EXTRACT(DAY FROM p_data_competencia) > v_ultimo_dia_mes THEN
    RETURN date_trunc('month', v_mes_seguinte)::date + (v_ultimo_dia_mes - 1);
  ELSE
    RETURN (date_trunc('month', v_mes_seguinte) + (EXTRACT(DAY FROM p_data_competencia) - 1) * interval '1 day')::date;
  END IF;
END;
$$;

-- 6. Criar trigger para atualizar automaticamente os campos de competência/recebimento
CREATE OR REPLACE FUNCTION public.atualizar_datas_financeiras()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_recebimento_posterior boolean;
BEGIN
  -- Buscar flag de recebimento posterior do cliente
  SELECT COALESCE(recebimento_posterior, false) INTO v_recebimento_posterior
  FROM public.clientes
  WHERE id = NEW.cliente_id;
  
  -- Definir competência (sempre a data do atendimento)
  NEW.competencia_date := NEW.data;
  
  -- Calcular recebimento previsto
  NEW.recebimento_previsto := public.calcular_recebimento_previsto(
    NEW.data,
    v_recebimento_posterior
  );
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_atendimentos_datas_financeiras ON public.atendimentos;
CREATE TRIGGER trg_atendimentos_datas_financeiras
BEFORE INSERT OR UPDATE OF data, cliente_id ON public.atendimentos
FOR EACH ROW
EXECUTE FUNCTION public.atualizar_datas_financeiras();