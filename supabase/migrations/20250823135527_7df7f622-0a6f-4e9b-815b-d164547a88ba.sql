-- Add column to track PWA install guide preference
ALTER TABLE public.profiles 
ADD COLUMN pwa_install_guide_disabled BOOLEAN NOT NULL DEFAULT false;