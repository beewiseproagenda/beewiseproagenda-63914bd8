-- Insert annual subscribers for the specified users
-- First, delete any existing subscriptions to avoid conflicts
DELETE FROM public.subscriptions WHERE user_id IN (
  SELECT id FROM auth.users WHERE email IN (
    'mariaems2502@gmail.com',
    'felipegamerptbr@gmail.com', 
    'femarsiglia@hotmail.com',
    'gabrielbragavenci2000@gmail.com'
  )
);

DELETE FROM public.subscribers WHERE email IN (
  'mariaems2502@gmail.com',
  'felipegamerptbr@gmail.com', 
  'femarsiglia@hotmail.com',
  'gabrielbragavenci2000@gmail.com'
);

-- Insert into subscriptions table
INSERT INTO public.subscriptions (user_id, plan_code, status, started_at, next_charge_at)
SELECT 
  u.id,
  'anual' as plan_code,
  'active' as status,
  now() as started_at,
  (now() + interval '1 year') as next_charge_at
FROM auth.users u
WHERE u.email IN (
  'mariaems2502@gmail.com',
  'felipegamerptbr@gmail.com', 
  'femarsiglia@hotmail.com',
  'gabrielbragavenci2000@gmail.com'
)
ON CONFLICT (user_id) DO UPDATE SET
  plan_code = 'anual',
  status = 'active',
  started_at = now(),
  next_charge_at = (now() + interval '1 year'),
  updated_at = now();

-- Insert into subscribers table (legacy compatibility)
INSERT INTO public.subscribers (user_id, email, subscribed, subscription_tier, subscription_end)
SELECT 
  u.id,
  u.email,
  true as subscribed,
  'anual' as subscription_tier,
  (now() + interval '1 year') as subscription_end
FROM auth.users u
WHERE u.email IN (
  'mariaems2502@gmail.com',
  'felipegamerptbr@gmail.com', 
  'femarsiglia@hotmail.com',
  'gabrielbragavenci2000@gmail.com'
)
ON CONFLICT (email) DO UPDATE SET
  subscribed = true,
  subscription_tier = 'anual',
  subscription_end = (now() + interval '1 year'),
  user_id = EXCLUDED.user_id,
  updated_at = now();