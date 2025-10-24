-- Adicionar suporte para recorrência mensal na tabela recurring_rules

-- Adicionar colunas para recorrência mensal
ALTER TABLE public.recurring_rules
  ADD COLUMN IF NOT EXISTS day_of_month integer CHECK (day_of_month >= 1 AND day_of_month <= 31),
  ADD COLUMN IF NOT EXISTS interval_months integer DEFAULT 1 CHECK (interval_months >= 1),
  ADD COLUMN IF NOT EXISTS recurrence_type text DEFAULT 'weekly' CHECK (recurrence_type IN ('weekly', 'monthly'));

-- Atualizar comentários para documentação
COMMENT ON COLUMN public.recurring_rules.weekdays IS 'Array de dias da semana (0=domingo, 6=sábado) para recorrência semanal';
COMMENT ON COLUMN public.recurring_rules.interval_weeks IS 'Intervalo em semanas para recorrência semanal';
COMMENT ON COLUMN public.recurring_rules.day_of_month IS 'Dia do mês (1-31) para recorrência mensal';
COMMENT ON COLUMN public.recurring_rules.interval_months IS 'Intervalo em meses para recorrência mensal';
COMMENT ON COLUMN public.recurring_rules.recurrence_type IS 'Tipo de recorrência: weekly ou monthly';

-- Permitir weekdays ser nullable para recorrência mensal
ALTER TABLE public.recurring_rules ALTER COLUMN weekdays DROP NOT NULL;