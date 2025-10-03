-- ============================================
-- Phase 1: Critical Security Fix
-- Assign Admin User to user_roles table
-- ============================================

-- NOTE: This migration assigns the first registered user (Henry Gomes) as admin.
-- If you need to assign a different user as admin, modify the user_id below.

-- Assign admin role to the first user (Henry Gomes)
-- User ID: f6c7d7c3-3f1f-4f57-8fd5-72709eaeee6e
INSERT INTO public.user_roles (user_id, role)
VALUES ('f6c7d7c3-3f1f-4f57-8fd5-72709eaeee6e'::uuid, 'admin'::app_role)
ON CONFLICT (user_id, role) DO NOTHING;

-- Verify the admin role was assigned
-- You can run this query to check:
-- SELECT ur.*, p.first_name, p.last_name 
-- FROM user_roles ur 
-- JOIN profiles p ON p.user_id = ur.user_id 
-- WHERE ur.role = 'admin';

-- IMPORTANT: If you need to assign admin role to a different user, run:
-- INSERT INTO public.user_roles (user_id, role)
-- VALUES ('your-user-id-here'::uuid, 'admin'::app_role)
-- ON CONFLICT (user_id, role) DO NOTHING;