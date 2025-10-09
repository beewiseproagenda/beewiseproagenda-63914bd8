-- Ajustar validação de CPF/CNPJ para permitir campos vazios
CREATE OR REPLACE FUNCTION public.validate_cliente_cpf_cnpj()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Apenas validar se CPF/CNPJ não estiver vazio
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