-- Fix security vulnerability in mp_subscriptions table
-- Remove overly permissive policy that exposes payment data to all users
DROP POLICY IF EXISTS "service role can manage all subs" ON public.mp_subscriptions;

-- Create proper RLS policies that restrict access appropriately
-- Users can only view their own subscription data
CREATE POLICY "Users can view own subscriptions" 
ON public.mp_subscriptions 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can only insert their own subscription data
CREATE POLICY "Users can insert own subscriptions" 
ON public.mp_subscriptions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Only service role can update subscription data (webhooks, etc.)
-- This policy will be bypassed when using service role key anyway
CREATE POLICY "Service role can update subscriptions" 
ON public.mp_subscriptions 
FOR UPDATE 
USING (false)  -- No user can update via RLS, only service role bypasses this
WITH CHECK (false);

-- Only service role can delete subscription data  
CREATE POLICY "Service role can delete subscriptions" 
ON public.mp_subscriptions 
FOR DELETE 
USING (false);  -- No user can delete via RLS, only service role bypasses this