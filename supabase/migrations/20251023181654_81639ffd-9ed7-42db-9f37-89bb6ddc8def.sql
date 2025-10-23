-- Desabilitar temporariamente o trigger para permitir o UPDATE em massa
ALTER TABLE public.atendimentos DISABLE TRIGGER trg_auto_realizado;

-- Atualizar todos os agendamentos passados existentes para status 'realizado'
-- Considera o fuso salvo no registro; senão, America/Sao_Paulo
UPDATE public.atendimentos a
SET status = 'realizado',
    updated_at = now()
WHERE
  CASE
    WHEN a.end_at IS NOT NULL THEN (a.end_at AT TIME ZONE COALESCE(a.tz,'America/Sao_Paulo'))
    ELSE ((a.start_at_utc + INTERVAL '60 minutes') AT TIME ZONE COALESCE(a.tz,'America/Sao_Paulo'))
  END <= (now() AT TIME ZONE COALESCE(a.tz,'America/Sao_Paulo'))
  AND status <> 'realizado';

-- Reabilitar o trigger
ALTER TABLE public.atendimentos ENABLE TRIGGER trg_auto_realizado;