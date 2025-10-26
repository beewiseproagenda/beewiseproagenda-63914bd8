-- Add tipo column to receitas table
ALTER TABLE public.receitas 
ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'variavel'
CHECK (tipo IN ('fixa', 'variavel'));

-- Add comment explaining the column
COMMENT ON COLUMN public.receitas.tipo IS 'Tipo de receita: fixa (mensalidade repetida automaticamente) ou variavel (lançamento único)';