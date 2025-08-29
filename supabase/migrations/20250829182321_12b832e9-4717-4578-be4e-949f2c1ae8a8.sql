-- Add unique constraint for user_id in subscriptions table to prevent duplicates
-- This will allow proper upsert functionality

-- First, let's add a unique constraint on user_id since each user should have only one active subscription
ALTER TABLE public.subscriptions 
ADD CONSTRAINT subscriptions_user_id_unique UNIQUE (user_id);

-- Create index for better performance on user_id lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_code ON public.subscriptions(plan_code);