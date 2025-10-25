-- ============================================================================
-- REMOÇÃO COMPLETA DO MERCADO PAGO - BANCO DE DADOS
-- ============================================================================

-- 1. Remover tabelas relacionadas ao Mercado Pago
DROP TABLE IF EXISTS public.mercadopago_payments CASCADE;
DROP TABLE IF EXISTS public.mercadopago_webhooks CASCADE;
DROP TABLE IF EXISTS public.mp_events CASCADE;
DROP TABLE IF EXISTS public.mp_subscriptions CASCADE;
DROP TABLE IF EXISTS public.subscribers CASCADE;

-- 2. Remover colunas relacionadas ao MP da tabela subscriptions
ALTER TABLE IF EXISTS public.subscriptions 
  DROP COLUMN IF EXISTS mp_preapproval_id CASCADE;

-- 3. Remover colunas relacionadas ao MP da tabela plans
ALTER TABLE IF EXISTS public.plans 
  DROP COLUMN IF EXISTS mp_preapproval_plan_id CASCADE;

-- 4. Atualizar tabela profiles para remover dependência de assinatura externa
-- (mantém subscription_active e subscription_status para controle manual)
COMMENT ON COLUMN public.profiles.subscription_active IS 'Controle manual de assinatura ativa';
COMMENT ON COLUMN public.profiles.subscription_status IS 'Status manual: none, trial, active, cancelled, expired';

-- 5. Limpar quaisquer dados órfãos (se as tabelas ainda existirem por algum motivo)
-- Garantir idempotência
DO $$ 
BEGIN
  -- Nada a fazer, tabelas já foram dropadas
  RAISE NOTICE '[BW][MP_REMOVAL] Tabelas do Mercado Pago removidas com sucesso';
END $$;