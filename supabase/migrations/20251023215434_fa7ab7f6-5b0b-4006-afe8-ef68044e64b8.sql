
-- Fix Security Definer View issue
-- The atendimentos_effective view currently runs with SECURITY DEFINER (default)
-- This means it executes with the permissions of the view owner (postgres) rather than the querying user
-- Setting security_invoker=true makes it respect RLS policies of the querying user

-- Recreate atendimentos_effective with SECURITY INVOKER
DROP VIEW IF EXISTS public.atendimentos_effective;

CREATE VIEW public.atendimentos_effective
WITH (security_invoker=true)
AS
SELECT 
  id,
  user_id,
  data,
  hora,
  cliente_id,
  servico,
  valor,
  forma_pagamento,
  observacoes,
  status,
  created_at,
  updated_at,
  start_at_utc,
  tz,
  rule_id,
  occurrence_date,
  recurring_rule_id,
  end_at,
  competencia_date,
  recebimento_previsto,
  valor_total,
  CASE
    WHEN is_appointment_past(COALESCE(start_at_utc, now()), end_at, COALESCE(tz, 'America/Sao_Paulo'::text)) 
    THEN 'realizado'::text
    ELSE status
  END AS status_efetivo
FROM atendimentos a;

COMMENT ON VIEW public.atendimentos_effective IS 
'Effective status view with SECURITY INVOKER - respects RLS policies of querying user. Shows computed status_efetivo based on appointment timing.';
