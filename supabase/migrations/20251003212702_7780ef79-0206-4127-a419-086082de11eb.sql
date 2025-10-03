-- ============================================
-- Phase 1 & 2: Critical Security Fixes
-- ============================================

-- 1. Fix Plans Table RLS Policy (Phase 1 - Critical)
-- Drop the overly permissive policy that allows unauthenticated access
DROP POLICY IF EXISTS "Plans are viewable by authenticated users" ON public.plans;

-- Create new policy requiring authentication
CREATE POLICY "Authenticated users can view plans"
ON public.plans
FOR SELECT
TO authenticated
USING (true);

-- 2. Add Profile DELETE Policy (Phase 2)
-- Allow users to delete their own profile
CREATE POLICY "Users can delete their own profile"
ON public.profiles
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 3. Fix Database Function Search Paths (Phase 2)
-- Update update_updated_at_column function to prevent search_path attacks
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Update handle_new_user function with proper search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, first_name, last_name, phone)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name', 
    new.raw_user_meta_data->>'phone'
  );
  RETURN new;
END;
$function$;