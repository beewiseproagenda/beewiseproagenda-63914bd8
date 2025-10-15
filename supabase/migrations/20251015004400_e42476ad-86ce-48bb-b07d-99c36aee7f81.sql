-- Fix SECURITY DEFINER functions missing search_path
-- This prevents privilege escalation attacks via search_path manipulation

-- Fix hash_pii function
CREATE OR REPLACE FUNCTION public.hash_pii(data text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF data IS NULL OR data = '' THEN
    RETURN NULL;
  END IF;
  RETURN encode(digest(data, 'sha256'::text), 'hex');
END;
$function$;

-- Fix validate_cpf function
CREATE OR REPLACE FUNCTION public.validate_cpf(cpf text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

-- Fix validate_cnpj function
CREATE OR REPLACE FUNCTION public.validate_cnpj(cnpj text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

-- Fix validate_cliente_cpf_cnpj trigger function
CREATE OR REPLACE FUNCTION public.validate_cliente_cpf_cnpj()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;