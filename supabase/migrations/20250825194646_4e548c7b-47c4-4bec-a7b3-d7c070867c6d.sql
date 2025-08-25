-- Update plans with correct prices and codes
UPDATE public.plans 
SET 
  code = 'mensal',
  price_cents = 1990,  -- R$ 19,90 em centavos
  interval = 'month',
  updated_at = now()
WHERE mp_preapproval_plan_id = '3b02b267a1bd44a68d749495857aafcb';

UPDATE public.plans 
SET 
  code = 'anual',
  price_cents = 17880,  -- R$ 178,80 em centavos
  interval = 'year',
  updated_at = now()
WHERE mp_preapproval_plan_id = 'f3f127b3ec40448cab2b861af5f7a3d1';