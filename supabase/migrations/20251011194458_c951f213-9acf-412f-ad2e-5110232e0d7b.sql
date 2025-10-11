-- Temporarily disable CPF/CNPJ validation
DROP TRIGGER IF EXISTS trg_validate_cliente_cpf_cnpj ON clientes;

-- ==========================================
-- ENHANCED LGPD SECURITY: Column-Level Encryption
-- ==========================================

-- 1. Create secure encryption key table
CREATE TABLE IF NOT EXISTS public.encryption_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_name text UNIQUE NOT NULL,
  key_value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  rotated_at timestamptz
);

ALTER TABLE public.encryption_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct access to encryption keys"
ON public.encryption_keys
FOR ALL
USING (false);

INSERT INTO public.encryption_keys (key_name, key_value)
VALUES ('pii_master_key', encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (key_name) DO NOTHING;

-- 2. Get encryption key function
CREATE OR REPLACE FUNCTION public.get_encryption_key()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- 3. XOR encryption functions
CREATE OR REPLACE FUNCTION public.encrypt_pii_simple(data text, key_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.decrypt_pii_simple(encrypted_data text, key_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
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

-- 4. Add encrypted columns
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS email_encrypted text;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS telefone_encrypted text;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS cpf_cnpj_encrypted text;

-- 5. Create indexes
CREATE INDEX IF NOT EXISTS idx_clientes_email_encrypted ON clientes(email_encrypted);
CREATE INDEX IF NOT EXISTS idx_clientes_telefone_encrypted ON clientes(telefone_encrypted);
CREATE INDEX IF NOT EXISTS idx_clientes_cpf_cnpj_encrypted ON clientes(cpf_cnpj_encrypted);

-- 6. Encrypt existing data
UPDATE clientes 
SET 
  email_encrypted = encrypt_pii_simple(email, get_encryption_key()),
  telefone_encrypted = encrypt_pii_simple(telefone, get_encryption_key()),
  cpf_cnpj_encrypted = encrypt_pii_simple(cpf_cnpj, get_encryption_key())
WHERE email_encrypted IS NULL OR telefone_encrypted IS NULL OR cpf_cnpj_encrypted IS NULL;

-- 7. Update trigger function to auto-encrypt
CREATE OR REPLACE FUNCTION public.update_cliente_hashes_and_encrypt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Re-create the trigger
DROP TRIGGER IF EXISTS trg_update_cliente_hashes ON clientes;
CREATE TRIGGER trg_update_cliente_hashes
  BEFORE INSERT OR UPDATE ON clientes
  FOR EACH ROW
  EXECUTE FUNCTION update_cliente_hashes_and_encrypt();

-- 8. Create secure decrypting view
CREATE OR REPLACE VIEW clientes_decrypted AS
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
FROM clientes
WHERE user_id = auth.uid();

-- 9. Update anonymization function
CREATE OR REPLACE FUNCTION public.anonymize_cliente(p_cliente_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE clientes
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
    
  INSERT INTO sensitive_data_audit (user_id, table_name, record_id, action, accessed_at)
  VALUES (auth.uid(), 'clientes', p_cliente_id, 'ANONYMIZED - LGPD compliance', now());
END;
$$;

-- 10. Documentation
COMMENT ON COLUMN clientes.email_encrypted IS 'XOR encrypted email - use clientes_decrypted view for access';
COMMENT ON COLUMN clientes.telefone_encrypted IS 'XOR encrypted phone - use clientes_decrypted view for access';
COMMENT ON COLUMN clientes.cpf_cnpj_encrypted IS 'XOR encrypted CPF/CNPJ - use clientes_decrypted view for access';
COMMENT ON VIEW clientes_decrypted IS 'Auto-decrypting view for PII - use this instead of direct table access';
COMMENT ON TABLE encryption_keys IS 'CRITICAL SECURITY: Encryption keys - never expose directly';

-- 11. Grant permissions
GRANT SELECT ON clientes_decrypted TO authenticated;