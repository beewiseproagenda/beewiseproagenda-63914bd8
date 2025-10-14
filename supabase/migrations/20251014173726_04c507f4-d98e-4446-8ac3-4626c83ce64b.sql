-- Fix digest function calls in hash_pii function
CREATE OR REPLACE FUNCTION public.hash_pii(data text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF data IS NULL OR data = '' THEN
    RETURN NULL;
  END IF;
  -- Fix: Cast 'sha256' explicitly as text to avoid type ambiguity
  RETURN encode(digest(data, 'sha256'::text), 'hex');
END;
$$;