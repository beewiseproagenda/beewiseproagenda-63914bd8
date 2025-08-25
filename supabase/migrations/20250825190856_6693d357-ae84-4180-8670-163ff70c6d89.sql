-- Criação das tabelas para integração com Mercado Pago
CREATE TABLE IF NOT EXISTS plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,                -- 'mensal' | 'anual'
  mp_preapproval_plan_id text NOT NULL,     -- id do plano no Mercado Pago
  price_cents integer NOT NULL,             -- 1990 / 17880
  interval text NOT NULL CHECK (interval IN ('month','year')),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,                    -- id do usuário autenticado
  plan_code text NOT NULL REFERENCES plans(code),
  mp_preapproval_id text,                   -- id da assinatura no MP
  status text NOT NULL DEFAULT 'pending',   -- 'pending' | 'authorized' | 'paused' | 'cancelled' | 'rejected'
  next_charge_at timestamptz,
  started_at timestamptz DEFAULT now(),
  cancelled_at timestamptz,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, plan_code)
);

CREATE TABLE IF NOT EXISTS mp_events (
  id bigserial PRIMARY KEY,
  type text,
  resource_id text,
  payload jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mp_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for plans (read-only for authenticated users)
CREATE POLICY "Plans are viewable by authenticated users" 
ON plans FOR SELECT 
TO authenticated 
USING (true);

-- RLS Policies for subscriptions (users can only see their own)
CREATE POLICY "Users can view their own subscriptions" 
ON subscriptions FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions" 
ON subscriptions FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions" 
ON subscriptions FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id);

-- RLS Policies for mp_events (admin only)
CREATE POLICY "Only admins can view mp_events" 
ON mp_events FOR SELECT 
TO authenticated 
USING (is_admin());

CREATE POLICY "Only admins can insert mp_events" 
ON mp_events FOR INSERT 
TO authenticated 
WITH CHECK (is_admin());

-- Triggers for updated_at
CREATE TRIGGER update_plans_updated_at
BEFORE UPDATE ON plans
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Pré-popular a tabela plans com os planos do Mercado Pago
INSERT INTO plans (code, mp_preapproval_plan_id, price_cents, interval)
VALUES ('mensal', 'PREAPPROVAL_PLAN_ID_MENSAL', 1990, 'month')
ON CONFLICT (code) DO UPDATE SET 
  mp_preapproval_plan_id = EXCLUDED.mp_preapproval_plan_id,
  price_cents = EXCLUDED.price_cents,
  interval = EXCLUDED.interval,
  updated_at = now();

INSERT INTO plans (code, mp_preapproval_plan_id, price_cents, interval)
VALUES ('anual', 'PREAPPROVAL_PLAN_ID_ANUAL', 17880, 'year')
ON CONFLICT (code) DO UPDATE SET 
  mp_preapproval_plan_id = EXCLUDED.mp_preapproval_plan_id,
  price_cents = EXCLUDED.price_cents,
  interval = EXCLUDED.interval,
  updated_at = now();