-- ==========================================
-- FIX: Enable pgcrypto extension first
-- ==========================================

-- Step 1: Enable pgcrypto in the public schema
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- Verify extension is available
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto'
  ) THEN
    RAISE EXCEPTION 'pgcrypto extension not available';
  END IF;
END $$;