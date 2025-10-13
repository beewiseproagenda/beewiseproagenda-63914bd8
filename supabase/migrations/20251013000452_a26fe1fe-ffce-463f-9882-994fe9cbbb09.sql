-- Criar tabela para telemetria de uso do RPC (sem PII)
CREATE TABLE IF NOT EXISTS public.analytics_rpc_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rpc_name text NOT NULL,
  user_id uuid NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(rpc_name, date, user_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_analytics_rpc_date ON public.analytics_rpc_usage(date DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_rpc_name ON public.analytics_rpc_usage(rpc_name);

-- RLS: apenas admins podem ver analytics
ALTER TABLE public.analytics_rpc_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Only admins can view analytics" ON public.analytics_rpc_usage;
CREATE POLICY "Only admins can view analytics"
  ON public.analytics_rpc_usage
  FOR SELECT
  USING (is_admin());

-- Função para incrementar contadores (upsert eficiente)
CREATE OR REPLACE FUNCTION public.increment_rpc_usage(
  p_rpc_name text,
  p_user_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.analytics_rpc_usage (rpc_name, user_id, date, count)
  VALUES (p_rpc_name, p_user_id, CURRENT_DATE, 1)
  ON CONFLICT (rpc_name, date, user_id)
  DO UPDATE SET 
    count = analytics_rpc_usage.count + 1,
    updated_at = now();
END;
$$;

COMMENT ON TABLE public.analytics_rpc_usage IS 'Telemetria agregada de uso de RPCs - sem PII';
COMMENT ON FUNCTION public.increment_rpc_usage IS 'Incrementa contador de uso de RPC de forma eficiente';