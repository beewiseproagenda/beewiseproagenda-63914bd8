-- Grant annual access for mariaems2502@gmail.com
-- Update the existing subscriber record with the correct user_id
UPDATE public.subscribers 
SET user_id = 'd4ff1741-ada6-4862-af10-ef9f00049186',
    subscription_end = NOW() + INTERVAL '1 year',
    updated_at = NOW()
WHERE email = 'mariaems2502@gmail.com';

-- Update the user profile to reflect active subscription
UPDATE public.profiles 
SET subscription_active = true,
    subscription_status = 'active',
    subscription_updated_at = NOW()
WHERE user_id = 'd4ff1741-ada6-4862-af10-ef9f00049186';

-- Create a subscription record in the new subscriptions table for consistency
INSERT INTO public.subscriptions (user_id, status, plan_code, started_at, next_charge_at)
VALUES (
    'd4ff1741-ada6-4862-af10-ef9f00049186',
    'active',
    'anual',
    NOW(),
    NOW() + INTERVAL '1 year'
)
ON CONFLICT (user_id) DO UPDATE SET
    status = 'active',
    plan_code = 'anual',
    started_at = NOW(),
    next_charge_at = NOW() + INTERVAL '1 year',
    updated_at = NOW();