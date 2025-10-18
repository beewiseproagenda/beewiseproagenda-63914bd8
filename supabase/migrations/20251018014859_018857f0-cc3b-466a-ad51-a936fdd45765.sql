-- Fix SECURITY DEFINER view by converting to SECURITY INVOKER
-- This ensures the view uses the querying user's RLS policies instead of bypassing them

DROP VIEW IF EXISTS public.clientes_decrypted;

CREATE OR REPLACE VIEW public.clientes_decrypted
WITH (security_invoker=true)
AS
SELECT
  c.id,
  c.user_id,
  c.nome,
  -- Decrypt PII fields using the encryption key
  public.decrypt_pii_aes(c.email_encrypted, public.get_encryption_key()) AS email,
  public.decrypt_pii_aes(c.telefone_encrypted, public.get_encryption_key()) AS telefone,
  public.decrypt_pii_aes(c.cpf_cnpj_encrypted, public.get_encryption_key()) AS cpf_cnpj,
  c.tipo_pessoa,
  c.endereco,
  c.criado_em,
  c.ultimo_atendimento,
  c.pacote_id,
  c.agendamento_fixo,
  c.recorrente,
  c.recorrencia,
  c.tipo_cobranca,
  c.consent_given_at,
  c.consent_withdrawn_at,
  c.data_retention_until,
  -- Include hash fields for searching
  c.email_hash,
  c.cpf_cnpj_hash,
  c.telefone_hash
FROM public.clientes c;