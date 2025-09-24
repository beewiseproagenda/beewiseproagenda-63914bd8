-- Add user as annual subscriber
INSERT INTO public.subscribers (
  email,
  subscribed,
  subscription_tier,
  subscription_end,
  created_at,
  updated_at
) VALUES (
  'tnatalylourenco@gmail.com',
  true,
  'anual',
  '2025-12-31 23:59:59+00',  -- Valid until end of 2025
  now(),
  now()
) ON CONFLICT (email) DO UPDATE SET
  subscribed = true,
  subscription_tier = 'anual',
  subscription_end = '2025-12-31 23:59:59+00',
  updated_at = now();