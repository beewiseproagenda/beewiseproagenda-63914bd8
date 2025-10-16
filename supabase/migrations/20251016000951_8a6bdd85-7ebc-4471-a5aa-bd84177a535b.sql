-- ==========================================
-- FIX: Create safe hash utility functions
-- ==========================================

-- 1. Create safe utility function for SHA256 hashing  
CREATE OR REPLACE FUNCTION public.util_hash_sha256(input text)
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public, extensions
AS $$
  SELECT encode(digest(convert_to(COALESCE(input, ''), 'UTF8'), 'sha256'), 'hex');
$$;

-- 2. Fix hash_pii to use correct digest signature
CREATE OR REPLACE FUNCTION public.hash_pii(data text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $function$
BEGIN
  IF data IS NULL OR data = '' THEN
    RETURN NULL;
  END IF;
  -- Use convert_to to properly convert text to bytea for digest
  RETURN encode(digest(convert_to(data, 'UTF8'), 'sha256'), 'hex');
END;
$function$;