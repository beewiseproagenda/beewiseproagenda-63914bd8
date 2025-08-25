-- Insert or update subscription plans with MercadoPago IDs
INSERT INTO public.plans (code, mp_preapproval_plan_id, price_cents, interval, is_active) 
VALUES 
  ('monthly', '3b02b267a1bd44a68d749495857aafcb', 2999, 'monthly', true),
  ('annual', 'f3f127b3ec40448cab2b861af5f7a3d1', 29990, 'annual', true)
ON CONFLICT (code) 
DO UPDATE SET 
  mp_preapproval_plan_id = EXCLUDED.mp_preapproval_plan_id,
  price_cents = EXCLUDED.price_cents,
  interval = EXCLUDED.interval,
  is_active = EXCLUDED.is_active,
  updated_at = now();