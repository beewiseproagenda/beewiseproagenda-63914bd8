-- Fix critical security issues: Add authentication requirements to RLS policies

-- 1. Fix profiles table - Add explicit authentication requirement
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON profiles;

CREATE POLICY "Authenticated users can view own profile" 
ON profiles FOR SELECT 
USING (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert own profile" 
ON profiles FOR INSERT 
WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "Authenticated users can update own profile" 
ON profiles FOR UPDATE 
USING (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "Authenticated users can delete own profile" 
ON profiles FOR DELETE 
USING (auth.role() = 'authenticated' AND auth.uid() = user_id);

-- 2. Fix clientes table - Add explicit authentication requirement for sensitive PII
DROP POLICY IF EXISTS "Users can view their own clientes" ON clientes;
DROP POLICY IF EXISTS "Users can insert their own clientes" ON clientes;
DROP POLICY IF EXISTS "Users can update their own clientes" ON clientes;
DROP POLICY IF EXISTS "Users can delete their own clientes" ON clientes;

CREATE POLICY "Authenticated users can view own clientes" 
ON clientes FOR SELECT 
USING (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert own clientes" 
ON clientes FOR INSERT 
WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "Authenticated users can update own clientes" 
ON clientes FOR UPDATE 
USING (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "Authenticated users can delete own clientes" 
ON clientes FOR DELETE 
USING (auth.role() = 'authenticated' AND auth.uid() = user_id);

-- 3. Fix atendimentos table - Add explicit authentication requirement for financial data
DROP POLICY IF EXISTS "Users can view their own atendimentos" ON atendimentos;
DROP POLICY IF EXISTS "Users can insert their own atendimentos" ON atendimentos;
DROP POLICY IF EXISTS "Users can update their own atendimentos" ON atendimentos;
DROP POLICY IF EXISTS "Users can delete their own atendimentos" ON atendimentos;

CREATE POLICY "Authenticated users can view own atendimentos" 
ON atendimentos FOR SELECT 
USING (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert own atendimentos" 
ON atendimentos FOR INSERT 
WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "Authenticated users can update own atendimentos" 
ON atendimentos FOR UPDATE 
USING (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "Authenticated users can delete own atendimentos" 
ON atendimentos FOR DELETE 
USING (auth.role() = 'authenticated' AND auth.uid() = user_id);

-- Also fix other sensitive tables for consistency
DROP POLICY IF EXISTS "Users can view their own despesas" ON despesas;
DROP POLICY IF EXISTS "Users can insert their own despesas" ON despesas;
DROP POLICY IF EXISTS "Users can update their own despesas" ON despesas;
DROP POLICY IF EXISTS "Users can delete their own despesas" ON despesas;

CREATE POLICY "Authenticated users can view own despesas" 
ON despesas FOR SELECT 
USING (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert own despesas" 
ON despesas FOR INSERT 
WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "Authenticated users can update own despesas" 
ON despesas FOR UPDATE 
USING (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "Authenticated users can delete own despesas" 
ON despesas FOR DELETE 
USING (auth.role() = 'authenticated' AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own receitas" ON receitas;
DROP POLICY IF EXISTS "Users can insert their own receitas" ON receitas;
DROP POLICY IF EXISTS "Users can update their own receitas" ON receitas;
DROP POLICY IF EXISTS "Users can delete their own receitas" ON receitas;

CREATE POLICY "Authenticated users can view own receitas" 
ON receitas FOR SELECT 
USING (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert own receitas" 
ON receitas FOR INSERT 
WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "Authenticated users can update own receitas" 
ON receitas FOR UPDATE 
USING (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "Authenticated users can delete own receitas" 
ON receitas FOR DELETE 
USING (auth.role() = 'authenticated' AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own financial entries" ON financial_entries;
DROP POLICY IF EXISTS "Users can insert own financial entries" ON financial_entries;
DROP POLICY IF EXISTS "Users can update own financial entries" ON financial_entries;
DROP POLICY IF EXISTS "Users can delete own financial entries" ON financial_entries;

CREATE POLICY "Authenticated users can view own financial entries" 
ON financial_entries FOR SELECT 
USING (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert own financial entries" 
ON financial_entries FOR INSERT 
WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "Authenticated users can update own financial entries" 
ON financial_entries FOR UPDATE 
USING (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "Authenticated users can delete own financial entries" 
ON financial_entries FOR DELETE 
USING (auth.role() = 'authenticated' AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own servicos_pacotes" ON servicos_pacotes;
DROP POLICY IF EXISTS "Users can insert their own servicos_pacotes" ON servicos_pacotes;
DROP POLICY IF EXISTS "Users can update their own servicos_pacotes" ON servicos_pacotes;
DROP POLICY IF EXISTS "Users can delete their own servicos_pacotes" ON servicos_pacotes;

CREATE POLICY "Authenticated users can view own servicos_pacotes" 
ON servicos_pacotes FOR SELECT 
USING (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert own servicos_pacotes" 
ON servicos_pacotes FOR INSERT 
WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "Authenticated users can update own servicos_pacotes" 
ON servicos_pacotes FOR UPDATE 
USING (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "Authenticated users can delete own servicos_pacotes" 
ON servicos_pacotes FOR DELETE 
USING (auth.role() = 'authenticated' AND auth.uid() = user_id);