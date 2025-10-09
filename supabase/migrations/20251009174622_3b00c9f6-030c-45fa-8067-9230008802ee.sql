-- Temporariamente desabilitar trigger de validação para permitir migração
DROP TRIGGER IF EXISTS trg_validate_cliente_cpf_cnpj ON clientes;

-- ==========================================
-- LGPD COMPLIANCE: Enhanced Security for PII
-- ==========================================

-- 1. Criar função para hash de dados (para busca sem expor dados)
CREATE OR REPLACE FUNCTION public.hash_pii(data text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF data IS NULL OR data = '' THEN
    RETURN NULL;
  END IF;
  RETURN encode(digest(data, 'sha256'), 'hex');
END;
$$;

-- 2. Adicionar colunas de hash para busca segura (sem quebrar dados existentes)
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS email_hash text;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS telefone_hash text;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS cpf_cnpj_hash text;

-- 3. Criar índices nos hashes para busca eficiente
CREATE INDEX IF NOT EXISTS idx_clientes_email_hash ON clientes(email_hash) WHERE email_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clientes_telefone_hash ON clientes(telefone_hash) WHERE telefone_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clientes_cpf_cnpj_hash ON clientes(cpf_cnpj_hash) WHERE cpf_cnpj_hash IS NOT NULL;

-- 4. Trigger para atualizar hashes automaticamente
CREATE OR REPLACE FUNCTION public.update_cliente_hashes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Atualizar hashes quando dados mudarem
  IF NEW.email IS DISTINCT FROM OLD.email OR TG_OP = 'INSERT' THEN
    NEW.email_hash := hash_pii(NEW.email);
  END IF;
  
  IF NEW.telefone IS DISTINCT FROM OLD.telefone OR TG_OP = 'INSERT' THEN
    NEW.telefone_hash := hash_pii(NEW.telefone);
  END IF;
  
  IF NEW.cpf_cnpj IS DISTINCT FROM OLD.cpf_cnpj OR TG_OP = 'INSERT' THEN
    NEW.cpf_cnpj_hash := hash_pii(NEW.cpf_cnpj);
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_cliente_hashes
  BEFORE INSERT OR UPDATE ON clientes
  FOR EACH ROW
  EXECUTE FUNCTION update_cliente_hashes();

-- 5. Atualizar hashes dos dados existentes
UPDATE clientes 
SET 
  email_hash = hash_pii(email),
  telefone_hash = hash_pii(telefone),
  cpf_cnpj_hash = hash_pii(cpf_cnpj);

-- 6. Política de retenção de dados (LGPD Art. 16)
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS data_retention_until timestamptz;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS consent_given_at timestamptz DEFAULT now();
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS consent_withdrawn_at timestamptz;

-- 7. Índice para busca por hash e consent
CREATE INDEX IF NOT EXISTS idx_clientes_consent_withdrawn ON clientes(consent_withdrawn_at) 
WHERE consent_withdrawn_at IS NOT NULL;

-- 8. Função para anonimizar dados (LGPD Art. 18)
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

-- 9. Reativar trigger de validação de CPF/CNPJ
CREATE TRIGGER trg_validate_cliente_cpf_cnpj
  BEFORE INSERT OR UPDATE ON clientes
  FOR EACH ROW
  EXECUTE FUNCTION validate_cliente_cpf_cnpj();

-- 10. Documentação LGPD
COMMENT ON COLUMN clientes.email IS 'PII - LGPD protected. Hash stored in email_hash for secure search';
COMMENT ON COLUMN clientes.telefone IS 'PII - LGPD protected. Hash stored in telefone_hash for secure search';
COMMENT ON COLUMN clientes.cpf_cnpj IS 'PII - LGPD protected. Validated on insert/update. Hash stored in cpf_cnpj_hash';
COMMENT ON COLUMN clientes.consent_given_at IS 'LGPD Art. 8 - Timestamp when user consent was given';
COMMENT ON COLUMN clientes.consent_withdrawn_at IS 'LGPD Art. 18 - Timestamp when user withdrew consent';
COMMENT ON FUNCTION anonymize_cliente IS 'LGPD Art. 18 - Anonymizes customer data when consent is withdrawn';