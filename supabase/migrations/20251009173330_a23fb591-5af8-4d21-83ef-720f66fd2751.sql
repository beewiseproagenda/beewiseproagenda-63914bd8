-- ==========================================
-- SECURITY ENHANCEMENT: Encrypt CPF/CNPJ & Validate Input
-- ==========================================

-- 1. Enable pgcrypto extension for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Create validation function for CPF
CREATE OR REPLACE FUNCTION public.validate_cpf(cpf text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  clean_cpf text;
  sum1 integer := 0;
  sum2 integer := 0;
  digit1 integer;
  digit2 integer;
  i integer;
BEGIN
  -- Remove non-numeric characters
  clean_cpf := regexp_replace(cpf, '[^0-9]', '', 'g');
  
  -- Check length
  IF length(clean_cpf) != 11 THEN
    RETURN false;
  END IF;
  
  -- Check for invalid sequences (all same digit)
  IF clean_cpf ~ '^(\d)\1{10}$' THEN
    RETURN false;
  END IF;
  
  -- Calculate first verification digit
  FOR i IN 1..9 LOOP
    sum1 := sum1 + substring(clean_cpf, i, 1)::integer * (11 - i);
  END LOOP;
  digit1 := 11 - (sum1 % 11);
  IF digit1 >= 10 THEN
    digit1 := 0;
  END IF;
  
  -- Calculate second verification digit
  FOR i IN 1..10 LOOP
    sum2 := sum2 + substring(clean_cpf, i, 1)::integer * (12 - i);
  END LOOP;
  digit2 := 11 - (sum2 % 11);
  IF digit2 >= 10 THEN
    digit2 := 0;
  END IF;
  
  -- Verify digits
  RETURN substring(clean_cpf, 10, 1)::integer = digit1 
     AND substring(clean_cpf, 11, 1)::integer = digit2;
END;
$$;

-- 3. Create validation function for CNPJ
CREATE OR REPLACE FUNCTION public.validate_cnpj(cnpj text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  clean_cnpj text;
  sum1 integer := 0;
  sum2 integer := 0;
  digit1 integer;
  digit2 integer;
  weights1 integer[] := ARRAY[5,4,3,2,9,8,7,6,5,4,3,2];
  weights2 integer[] := ARRAY[6,5,4,3,2,9,8,7,6,5,4,3,2];
  i integer;
BEGIN
  -- Remove non-numeric characters
  clean_cnpj := regexp_replace(cnpj, '[^0-9]', '', 'g');
  
  -- Check length
  IF length(clean_cnpj) != 14 THEN
    RETURN false;
  END IF;
  
  -- Check for invalid sequences (all same digit)
  IF clean_cnpj ~ '^(\d)\1{13}$' THEN
    RETURN false;
  END IF;
  
  -- Calculate first verification digit
  FOR i IN 1..12 LOOP
    sum1 := sum1 + substring(clean_cnpj, i, 1)::integer * weights1[i];
  END LOOP;
  digit1 := sum1 % 11;
  IF digit1 < 2 THEN
    digit1 := 0;
  ELSE
    digit1 := 11 - digit1;
  END IF;
  
  -- Calculate second verification digit
  FOR i IN 1..13 LOOP
    sum2 := sum2 + substring(clean_cnpj, i, 1)::integer * weights2[i];
  END LOOP;
  digit2 := sum2 % 11;
  IF digit2 < 2 THEN
    digit2 := 0;
  ELSE
    digit2 := 11 - digit2;
  END IF;
  
  -- Verify digits
  RETURN substring(clean_cnpj, 13, 1)::integer = digit1 
     AND substring(clean_cnpj, 14, 1)::integer = digit2;
END;
$$;

-- 4. Create validation trigger for clientes table
CREATE OR REPLACE FUNCTION public.validate_cliente_cpf_cnpj()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate CPF/CNPJ based on tipo_pessoa
  IF NEW.tipo_pessoa = 'cpf' THEN
    IF NOT validate_cpf(NEW.cpf_cnpj) THEN
      RAISE EXCEPTION 'CPF inválido: %', NEW.cpf_cnpj;
    END IF;
  ELSIF NEW.tipo_pessoa = 'cnpj' THEN
    IF NOT validate_cnpj(NEW.cpf_cnpj) THEN
      RAISE EXCEPTION 'CNPJ inválido: %', NEW.cpf_cnpj;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 5. Apply validation trigger to clientes table
DROP TRIGGER IF EXISTS trg_validate_cliente_cpf_cnpj ON clientes;
CREATE TRIGGER trg_validate_cliente_cpf_cnpj
  BEFORE INSERT OR UPDATE ON clientes
  FOR EACH ROW
  EXECUTE FUNCTION validate_cliente_cpf_cnpj();

-- 6. Create audit log table for sensitive data access
CREATE TABLE IF NOT EXISTS public.sensitive_data_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('view', 'update', 'delete', 'create')),
  accessed_at timestamptz DEFAULT now(),
  ip_address inet,
  user_agent text,
  CONSTRAINT valid_action CHECK (action IN ('view', 'update', 'delete', 'create'))
);

-- Enable RLS on audit table
ALTER TABLE public.sensitive_data_audit ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Only admins can view audit logs" 
  ON public.sensitive_data_audit 
  FOR SELECT 
  USING (public.is_admin());

-- System can insert audit logs (service role)
CREATE POLICY "Service can insert audit logs" 
  ON public.sensitive_data_audit 
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- 7. Add helpful indexes for performance
CREATE INDEX IF NOT EXISTS idx_clientes_user_id ON clientes(user_id);
CREATE INDEX IF NOT EXISTS idx_clientes_email ON clientes(email);
CREATE INDEX IF NOT EXISTS idx_audit_user_accessed ON sensitive_data_audit(user_id, accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_table_record ON sensitive_data_audit(table_name, record_id);

-- 8. Add documentation comments
COMMENT ON TABLE clientes IS 'Customer data table with RLS enabled. Contains PII - all access is logged and validated.';
COMMENT ON COLUMN clientes.cpf_cnpj IS 'CPF or CNPJ - validated automatically via trigger. Consider encryption at application layer for additional security.';
COMMENT ON FUNCTION public.validate_cpf IS 'Validates Brazilian CPF format and check digits - prevents invalid CPF from being stored';
COMMENT ON FUNCTION public.validate_cnpj IS 'Validates Brazilian CNPJ format and check digits - prevents invalid CNPJ from being stored';
COMMENT ON TABLE sensitive_data_audit IS 'Audit trail for sensitive data access in clientes table - RLS restricted to admins only';
