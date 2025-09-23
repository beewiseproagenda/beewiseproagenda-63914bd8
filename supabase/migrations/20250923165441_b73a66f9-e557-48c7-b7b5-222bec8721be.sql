-- Add timezone support to workspaces (assuming profiles table represents workspace)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS tz TEXT NOT NULL DEFAULT 'America/Sao_Paulo';

-- Add timezone columns to atendimentos table
ALTER TABLE public.atendimentos 
ADD COLUMN IF NOT EXISTS start_at_utc TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS tz TEXT NOT NULL DEFAULT 'America/Sao_Paulo';

-- Create index for UTC queries
CREATE INDEX IF NOT EXISTS idx_atendimentos_start_at_utc ON public.atendimentos(start_at_utc);

-- Migrate existing data: combine date + hora using workspace tz and convert to UTC
UPDATE public.atendimentos 
SET 
  start_at_utc = (data::text || ' ' || hora::text)::timestamp AT TIME ZONE 'America/Sao_Paulo' AT TIME ZONE 'UTC',
  tz = 'America/Sao_Paulo'
WHERE start_at_utc IS NULL;