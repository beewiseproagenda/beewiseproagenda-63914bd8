-- Criar tabela para logs de webhooks do Mercado Pago
CREATE TABLE public.mercadopago_webhooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id TEXT NOT NULL,
  event_type TEXT NOT NULL,  
  payload JSONB NOT NULL,
  signature_valid BOOLEAN NOT NULL DEFAULT false,
  processed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.mercadopago_webhooks ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS - apenas administradores podem acessar logs de webhook
CREATE POLICY "Only admins can view webhook logs" 
ON public.mercadopago_webhooks 
FOR SELECT 
USING (is_admin());

CREATE POLICY "Only admins can insert webhook logs" 
ON public.mercadopago_webhooks 
FOR INSERT 
WITH CHECK (is_admin());

CREATE POLICY "Only admins can update webhook logs" 
ON public.mercadopago_webhooks 
FOR UPDATE 
USING (is_admin());

CREATE POLICY "Only admins can delete webhook logs" 
ON public.mercadopago_webhooks 
FOR DELETE 
USING (is_admin());

-- Criar índices para melhor performance
CREATE INDEX idx_mercadopago_webhooks_request_id ON public.mercadopago_webhooks(request_id);
CREATE INDEX idx_mercadopago_webhooks_event_type ON public.mercadopago_webhooks(event_type);
CREATE INDEX idx_mercadopago_webhooks_created_at ON public.mercadopago_webhooks(created_at);
CREATE INDEX idx_mercadopago_webhooks_processed ON public.mercadopago_webhooks(processed);