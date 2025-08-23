-- Add dark mode preference to profiles table
ALTER TABLE public.profiles 
ADD COLUMN dark_mode_enabled boolean NOT NULL DEFAULT false;