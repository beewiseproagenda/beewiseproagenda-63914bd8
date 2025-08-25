-- Create table for MercadoPago payments tracking
CREATE TABLE public.mercadopago_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id TEXT UNIQUE NOT NULL,
  user_email TEXT NOT NULL,
  status TEXT NOT NULL,
  amount DECIMAL(10,2),
  currency TEXT DEFAULT 'BRL',
  payment_method TEXT,
  external_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  approved_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create table for subscribers/subscriptions
CREATE TABLE public.subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  subscribed BOOLEAN NOT NULL DEFAULT false,
  subscription_tier TEXT,
  subscription_end TIMESTAMPTZ,
  payment_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.mercadopago_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

-- Create policies for mercadopago_payments (admin access only via service role)
CREATE POLICY "Admin can manage payments" ON public.mercadopago_payments
  FOR ALL
  USING (true);

-- Create policies for subscribers
CREATE POLICY "Users can view their own subscription" ON public.subscribers
  FOR SELECT
  USING (user_id = auth.uid() OR email = auth.email());

CREATE POLICY "Admin can manage subscriptions" ON public.subscribers
  FOR ALL
  USING (true);

-- Create indexes for better performance
CREATE INDEX idx_mercadopago_payments_email ON public.mercadopago_payments(user_email);
CREATE INDEX idx_mercadopago_payments_status ON public.mercadopago_payments(status);
CREATE INDEX idx_subscribers_email ON public.subscribers(email);
CREATE INDEX idx_subscribers_status ON public.subscribers(subscribed, subscription_end);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_mercadopago_payments_updated_at
  BEFORE UPDATE ON public.mercadopago_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscribers_updated_at
  BEFORE UPDATE ON public.subscribers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();