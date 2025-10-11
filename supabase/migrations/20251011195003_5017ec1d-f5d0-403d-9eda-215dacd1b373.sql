-- Fix security linter warnings from encryption migration

-- 1. Drop the SECURITY DEFINER view and recreate as regular view with RLS
DROP VIEW IF EXISTS clientes_decrypted;

CREATE VIEW clientes_decrypted AS
SELECT 
  id,
  user_id,
  nome,
  decrypt_pii_simple(email_encrypted, get_encryption_key()) AS email,
  decrypt_pii_simple(telefone_encrypted, get_encryption_key()) AS telefone,
  tipo_pessoa,
  decrypt_pii_simple(cpf_cnpj_encrypted, get_encryption_key()) AS cpf_cnpj,
  endereco,
  recorrente,
  recorrencia,
  agendamento_fixo,
  pacote_id,
  tipo_cobranca,
  criado_em,
  ultimo_atendimento,
  email_hash,
  telefone_hash,
  cpf_cnpj_hash,
  consent_given_at,
  consent_withdrawn_at,
  data_retention_until
FROM clientes;

-- Apply RLS to the view (inherits from base table)
ALTER VIEW clientes_decrypted SET (security_invoker = on);

-- Grant permissions
GRANT SELECT ON clientes_decrypted TO authenticated;

-- 2. Update get_encryption_key to set search_path (already has it, but verify)
-- This function already has SET search_path = public

-- 3. Update encrypt_pii_simple to include search_path explicitly
CREATE OR REPLACE FUNCTION public.encrypt_pii_simple(data text, key_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE PARALLEL SAFE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  data_bytes bytea;
  key_bytes bytea;
  i int;
  result bytea := ''::bytea;
BEGIN
  IF data IS NULL OR data = '' THEN
    RETURN NULL;
  END IF;
  
  data_bytes := data::bytea;
  key_bytes := decode(key_text, 'hex');
  
  FOR i IN 0..(length(data_bytes) - 1) LOOP
    result := result || set_byte(
      '\x00'::bytea,
      0,
      get_byte(data_bytes, i) # get_byte(key_bytes, i % length(key_bytes))
    );
  END LOOP;
  
  RETURN encode(result, 'base64');
END;
$$;

-- 4. Update decrypt_pii_simple to include search_path
CREATE OR REPLACE FUNCTION public.decrypt_pii_simple(encrypted_data text, key_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE PARALLEL SAFE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  data_bytes bytea;
  key_bytes bytea;
  i int;
  result bytea := ''::bytea;
BEGIN
  IF encrypted_data IS NULL OR encrypted_data = '' THEN
    RETURN NULL;
  END IF;
  
  BEGIN
    data_bytes := decode(encrypted_data, 'base64');
    key_bytes := decode(key_text, 'hex');
    
    FOR i IN 0..(length(data_bytes) - 1) LOOP
      result := result || set_byte(
        '\x00'::bytea,
        0,
        get_byte(data_bytes, i) # get_byte(key_bytes, i % length(key_bytes))
      );
    END LOOP;
    
    RETURN convert_from(result, 'UTF8');
  EXCEPTION
    WHEN OTHERS THEN
      RETURN NULL;
  END;
END;
$$;

-- 5. Update get_encryption_key to be more explicit with search_path
CREATE OR REPLACE FUNCTION public.get_encryption_key()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
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

-- 6. Update the trigger function to include search_path
CREATE OR REPLACE FUNCTION public.update_cliente_hashes_and_encrypt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_key text;
BEGIN
  v_key := get_encryption_key();
  
  IF NEW.email IS DISTINCT FROM OLD.email OR TG_OP = 'INSERT' THEN
    NEW.email_hash := hash_pii(NEW.email);
    NEW.email_encrypted := encrypt_pii_simple(NEW.email, v_key);
  END IF;
  
  IF NEW.telefone IS DISTINCT FROM OLD.telefone OR TG_OP = 'INSERT' THEN
    NEW.telefone_hash := hash_pii(NEW.telefone);
    NEW.telefone_encrypted := encrypt_pii_simple(NEW.telefone, v_key);
  END IF;
  
  IF NEW.cpf_cnpj IS DISTINCT FROM OLD.cpf_cnpj OR TG_OP = 'INSERT' THEN
    NEW.cpf_cnpj_hash := hash_pii(NEW.cpf_cnpj);
    NEW.cpf_cnpj_encrypted := encrypt_pii_simple(NEW.cpf_cnpj, v_key);
  END IF;
  
  -- Validate CPF/CNPJ only if not empty
  IF NEW.cpf_cnpj IS NOT NULL AND NEW.cpf_cnpj != '' THEN
    IF NEW.tipo_pessoa = 'cpf' THEN
      IF NOT validate_cpf(NEW.cpf_cnpj) THEN
        RAISE EXCEPTION 'CPF inválido: %. Verifique o número digitado.', NEW.cpf_cnpj
          USING HINT = 'O CPF deve conter 11 dígitos e ser válido';
      END IF;
    ELSIF NEW.tipo_pessoa = 'cnpj' THEN
      IF NOT validate_cnpj(NEW.cpf_cnpj) THEN
        RAISE EXCEPTION 'CNPJ inválido: %. Verifique o número digitado.', NEW.cpf_cnpj
          USING HINT = 'O CNPJ deve conter 14 dígitos e ser válido';
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;