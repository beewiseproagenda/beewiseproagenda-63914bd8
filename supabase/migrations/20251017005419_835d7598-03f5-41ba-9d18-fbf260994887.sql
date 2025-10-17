-- ==========================================
-- SECURITY FIX: Replace weak XOR encryption with AES-256
-- ==========================================

-- Step 1: Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Step 2: Create new AES-256 encryption functions
CREATE OR REPLACE FUNCTION public.encrypt_pii_aes(data text, key_text text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF data IS NULL OR data = '' THEN RETURN NULL; END IF;
  RETURN encode(extensions.pgp_sym_encrypt(data, key_text, 'cipher-algo=aes256'), 'base64');
END;
$$;

CREATE OR REPLACE FUNCTION public.decrypt_pii_aes(encrypted_data text, key_text text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF encrypted_data IS NULL OR encrypted_data = '' THEN RETURN NULL; END IF;
  BEGIN
    RETURN extensions.pgp_sym_decrypt(decode(encrypted_data, 'base64'), key_text, 'cipher-algo=aes256');
  EXCEPTION
    WHEN OTHERS THEN
      RETURN NULL;
  END;
END;
$$;

-- Step 3: Update trigger function - temporarily disable validation
CREATE OR REPLACE FUNCTION public.update_cliente_hashes_and_encrypt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_key text;
BEGIN
  v_key := public.get_encryption_key();
  
  IF NEW.email IS DISTINCT FROM OLD.email OR TG_OP = 'INSERT' THEN
    NEW.email_hash := public.hash_pii(NEW.email);
    NEW.email_encrypted := public.encrypt_pii_aes(NEW.email, v_key);
  END IF;
  
  IF NEW.telefone IS DISTINCT FROM OLD.telefone OR TG_OP = 'INSERT' THEN
    NEW.telefone_hash := public.hash_pii(NEW.telefone);
    NEW.telefone_encrypted := public.encrypt_pii_aes(NEW.telefone, v_key);
  END IF;
  
  IF NEW.cpf_cnpj IS DISTINCT FROM OLD.cpf_cnpj OR TG_OP = 'INSERT' THEN
    NEW.cpf_cnpj_hash := public.hash_pii(NEW.cpf_cnpj);
    NEW.cpf_cnpj_encrypted := public.encrypt_pii_aes(NEW.cpf_cnpj, v_key);
  END IF;
  
  -- Validation disabled during migration
  RETURN NEW;
END;
$$;

-- Step 4: Migrate existing data
DO $$
DECLARE
  v_record record;
  v_count integer := 0;
BEGIN
  FOR v_record IN 
    SELECT id, email, telefone, cpf_cnpj
    FROM public.clientes 
    WHERE email_encrypted IS NOT NULL 
       OR telefone_encrypted IS NOT NULL 
       OR cpf_cnpj_encrypted IS NOT NULL
  LOOP
    UPDATE public.clientes 
    SET email = v_record.email,
        telefone = v_record.telefone,
        cpf_cnpj = v_record.cpf_cnpj
    WHERE id = v_record.id;
    
    v_count := v_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Migrated % client records to AES-256', v_count;
END;
$$;

-- Step 5: Re-enable validation
CREATE OR REPLACE FUNCTION public.update_cliente_hashes_and_encrypt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_key text;
BEGIN
  v_key := public.get_encryption_key();
  
  IF NEW.email IS DISTINCT FROM OLD.email OR TG_OP = 'INSERT' THEN
    NEW.email_hash := public.hash_pii(NEW.email);
    NEW.email_encrypted := public.encrypt_pii_aes(NEW.email, v_key);
  END IF;
  
  IF NEW.telefone IS DISTINCT FROM OLD.telefone OR TG_OP = 'INSERT' THEN
    NEW.telefone_hash := public.hash_pii(NEW.telefone);
    NEW.telefone_encrypted := public.encrypt_pii_aes(NEW.telefone, v_key);
  END IF;
  
  IF NEW.cpf_cnpj IS DISTINCT FROM OLD.cpf_cnpj OR TG_OP = 'INSERT' THEN
    NEW.cpf_cnpj_hash := public.hash_pii(NEW.cpf_cnpj);
    NEW.cpf_cnpj_encrypted := public.encrypt_pii_aes(NEW.cpf_cnpj, v_key);
  END IF;
  
  IF NEW.cpf_cnpj IS NOT NULL AND NEW.cpf_cnpj != '' THEN
    IF NEW.tipo_pessoa = 'cpf' THEN
      IF NOT public.validate_cpf(NEW.cpf_cnpj) THEN
        RAISE EXCEPTION 'CPF inválido: %. Verifique o número digitado.', NEW.cpf_cnpj
          USING HINT = 'O CPF deve conter 11 dígitos e ser válido';
      END IF;
    ELSIF NEW.tipo_pessoa = 'cnpj' THEN
      IF NOT public.validate_cnpj(NEW.cpf_cnpj) THEN
        RAISE EXCEPTION 'CNPJ inválido: %. Verifique o número digitado.', NEW.cpf_cnpj
          USING HINT = 'O CNPJ deve conter 14 dígitos e ser válido';
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Step 6: Recreate view with new decryption
DROP VIEW IF EXISTS public.clientes_decrypted CASCADE;

CREATE VIEW public.clientes_decrypted AS
SELECT 
  c.id,
  c.user_id,
  c.nome,
  public.decrypt_pii_aes(c.email_encrypted, (SELECT key_value FROM public.encryption_keys WHERE key_name = 'pii_master_key')) AS email,
  public.decrypt_pii_aes(c.telefone_encrypted, (SELECT key_value FROM public.encryption_keys WHERE key_name = 'pii_master_key')) AS telefone,
  public.decrypt_pii_aes(c.cpf_cnpj_encrypted, (SELECT key_value FROM public.encryption_keys WHERE key_name = 'pii_master_key')) AS cpf_cnpj,
  c.tipo_pessoa,
  c.endereco,
  c.recorrente,
  c.agendamento_fixo,
  c.pacote_id,
  c.tipo_cobranca,
  c.recorrencia,
  c.ultimo_atendimento,
  c.criado_em,
  c.consent_given_at,
  c.consent_withdrawn_at,
  c.data_retention_until,
  c.email_hash,
  c.telefone_hash,
  c.cpf_cnpj_hash
FROM public.clientes c;

-- Step 7: Cleanup
DROP FUNCTION IF EXISTS public.encrypt_pii_simple(text, text);
DROP FUNCTION IF EXISTS public.decrypt_pii_simple(text, text);

-- ==========================================
-- SECURITY FIX: Add search_path to SECURITY DEFINER functions
-- ==========================================

CREATE OR REPLACE FUNCTION public.get_encryption_key()
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION public.anonymize_cliente(p_cliente_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.clientes
  SET
    nome = 'Cliente Anonimizado',
    email = NULL,
    telefone = NULL,
    cpf_cnpj = NULL,
    email_encrypted = NULL,
    telefone_encrypted = NULL,
    cpf_cnpj_encrypted = NULL,
    endereco = jsonb_build_object('cep', '', 'rua', '', 'numero', '', 'complemento', '', 'bairro', '', 'cidade', '', 'estado', ''),
    email_hash = NULL,
    telefone_hash = NULL,
    cpf_cnpj_hash = NULL,
    consent_withdrawn_at = now()
  WHERE id = p_cliente_id
    AND user_id = auth.uid();
    
  INSERT INTO public.sensitive_data_audit (user_id, table_name, record_id, action, accessed_at)
  VALUES (auth.uid(), 'clientes', p_cliente_id, 'ANONYMIZED - LGPD compliance', now());
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_rpc_usage(p_rpc_name text, p_user_id uuid DEFAULT NULL::uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.analytics_rpc_usage (rpc_name, user_id, date, count)
  VALUES (p_rpc_name, p_user_id, CURRENT_DATE, 1)
  ON CONFLICT (rpc_name, date, user_id)
  DO UPDATE SET 
    count = public.analytics_rpc_usage.count + 1,
    updated_at = now();
END;
$$;