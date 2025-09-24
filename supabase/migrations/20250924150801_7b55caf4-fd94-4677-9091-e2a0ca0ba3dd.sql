-- Grant annual subscription access to m.oliva77@hotmail.com
INSERT INTO public.subscribers (
  email, 
  subscribed, 
  subscription_tier, 
  subscription_end,
  created_at,
  updated_at
) VALUES (
  'm.oliva77@hotmail.com',
  true,
  'anual',
  '2025-12-31 23:59:59+00'::timestamptz,
  now(),
  now()
) ON CONFLICT (email) DO UPDATE SET
  subscribed = true,
  subscription_tier = 'anual',
  subscription_end = '2025-12-31 23:59:59+00'::timestamptz,
  updated_at = now();