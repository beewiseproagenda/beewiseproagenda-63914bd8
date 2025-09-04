-- Add preference_id column to mp_subscriptions for checkout preferences
ALTER TABLE public.mp_subscriptions 
ADD COLUMN IF NOT EXISTS mp_preference_id text;

-- Add index for preference_id lookups
CREATE INDEX IF NOT EXISTS mp_subscriptions_preference_id_idx 
ON public.mp_subscriptions(mp_preference_id) 
WHERE mp_preference_id IS NOT NULL;