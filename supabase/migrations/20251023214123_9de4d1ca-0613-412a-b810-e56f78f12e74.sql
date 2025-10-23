-- Security Fix: Add database constraints to agendamento_servicos
ALTER TABLE agendamento_servicos 
  ADD CONSTRAINT check_quantidade_positive CHECK (quantidade > 0),
  ADD CONSTRAINT check_valor_non_negative CHECK (valor >= 0),
  ADD CONSTRAINT check_quantidade_reasonable CHECK (quantidade <= 1000),
  ADD CONSTRAINT check_valor_reasonable CHECK (valor <= 999999.99);

-- Security Fix: Add search_path to SECURITY DEFINER functions
-- Fix has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Fix is_admin function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.has_role(auth.uid(), 'admin'::app_role)
$$;

-- Fix get_encryption_key function
CREATE OR REPLACE FUNCTION public.get_encryption_key()
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_key text;
BEGIN
  SELECT key_value INTO v_key
  FROM public.encryption_keys
  WHERE key_name = 'pii_master_key';
  RETURN v_key;
END;
$$;

-- Add comment for documentation (clientes_decrypted inherits RLS from base table)
COMMENT ON VIEW clientes_decrypted IS 'SECURITY DEFINER view - inherits RLS from clientes table, access should be logged in sensitive_data_audit';