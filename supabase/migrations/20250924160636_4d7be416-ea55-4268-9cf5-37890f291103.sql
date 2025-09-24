-- Add trial columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS trial_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS trial_days INT NOT NULL DEFAULT 7,
ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'none';

-- Backfill trial data for existing users
UPDATE public.profiles 
SET 
  trial_started_at = created_at,
  trial_expires_at = created_at + INTERVAL '7 days'
WHERE trial_started_at IS NULL;

-- Update subscription_status for users with active subscriptions
UPDATE public.profiles 
SET subscription_status = 'active'
WHERE subscription_active = true;