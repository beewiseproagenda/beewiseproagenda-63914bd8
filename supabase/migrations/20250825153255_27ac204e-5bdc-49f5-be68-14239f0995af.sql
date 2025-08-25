-- First, drop the insecure policy
DROP POLICY IF EXISTS "Admin can manage payments" ON public.mercadopago_payments;

-- Create an enum for application roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table to manage user permissions
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create helper function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin'::app_role)
$$;

-- Create secure policies for mercadopago_payments
CREATE POLICY "Only admins can view payments" ON public.mercadopago_payments
  FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Only admins can insert payments" ON public.mercadopago_payments
  FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can update payments" ON public.mercadopago_payments
  FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Only admins can delete payments" ON public.mercadopago_payments
  FOR DELETE
  USING (public.is_admin());

-- Update subscribers policies to be more restrictive
DROP POLICY IF EXISTS "Admin can manage subscriptions" ON public.subscribers;

CREATE POLICY "Users can view own subscription" ON public.subscribers
  FOR SELECT
  USING (user_id = auth.uid() OR email = auth.email());

CREATE POLICY "Only admins can insert subscriptions" ON public.subscribers
  FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can update subscriptions" ON public.subscribers
  FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Only admins can delete subscriptions" ON public.subscribers
  FOR DELETE
  USING (public.is_admin());

-- Create policies for user_roles (users can view own roles, only admins can manage)
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Only admins can manage roles" ON public.user_roles
  FOR ALL
  USING (public.is_admin());

-- Create trigger for user_roles timestamp updates
CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Grant necessary permissions
GRANT USAGE ON TYPE public.app_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;