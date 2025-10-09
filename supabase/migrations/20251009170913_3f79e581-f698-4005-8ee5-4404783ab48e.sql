-- =====================================================
-- MATERIALIZAÇÃO AUTOMÁTICA DE RECORRÊNCIAS + FINANCEIRO
-- =====================================================

-- 1) Ajustar recurring_rules para incluir amount
ALTER TABLE recurring_rules 
ADD COLUMN IF NOT EXISTS amount numeric(12,2) DEFAULT 0;

-- 2) Ajustar atendimentos para suportar materialização
ALTER TABLE atendimentos
ADD COLUMN IF NOT EXISTS recurring_rule_id uuid REFERENCES recurring_rules(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS end_at timestamptz;

-- Índice único anti-duplicação para appointments materializados
CREATE UNIQUE INDEX IF NOT EXISTS ux_atendimentos_rule_occurrence
ON atendimentos (recurring_rule_id, occurrence_date)
WHERE recurring_rule_id IS NOT NULL;

-- 3) Criar tabela financial_entries para projeções financeiras
CREATE TABLE IF NOT EXISTS financial_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  appointment_id uuid REFERENCES atendimentos(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('revenue', 'expense')),
  status text NOT NULL CHECK (status IN ('expected', 'confirmed', 'cancelled')),
  amount numeric(12,2) NOT NULL,
  due_date date NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS para financial_entries
ALTER TABLE financial_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own financial entries"
ON financial_entries FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own financial entries"
ON financial_entries FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own financial entries"
ON financial_entries FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own financial entries"
ON financial_entries FOR DELETE
USING (auth.uid() = user_id);

-- Índice único para amarrar 1:1 com appointment (expected)
CREATE UNIQUE INDEX IF NOT EXISTS ux_fin_expected_appt
ON financial_entries (appointment_id)
WHERE appointment_id IS NOT NULL AND status = 'expected';

-- Índice para queries por user_id e status
CREATE INDEX IF NOT EXISTS idx_fin_entries_user_status
ON financial_entries (user_id, status, due_date);

-- 4) FUNÇÃO: Materializar ocorrências de uma regra
CREATE OR REPLACE FUNCTION fn_materialize_rule(
  p_rule_id uuid,
  p_window_days int DEFAULT 180
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rule recurring_rules%ROWTYPE;
  v_date_from date;
  v_date_to date;
  v_current_date date;
  v_occurrence_date date;
  v_start_at timestamptz;
  v_end_at timestamptz;
  v_weekday int;
  v_weeks_diff int;
  v_created int := 0;
  v_updated int := 0;
  v_skipped int := 0;
  v_appointment_id uuid;
  v_timezone text;
BEGIN
  -- Buscar regra
  SELECT * INTO v_rule FROM recurring_rules WHERE id = p_rule_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Rule not found: %', p_rule_id;
  END IF;
  
  -- Se inativa, retornar sem processar
  IF NOT v_rule.active THEN
    RETURN jsonb_build_object(
      'created', 0,
      'updated', 0,
      'skipped', 0,
      'window_days', p_window_days,
      'message', 'Rule is inactive'
    );
  END IF;
  
  -- Garantir timezone
  v_timezone := COALESCE(v_rule.timezone, 'America/Sao_Paulo');
  IF v_rule.timezone IS NULL THEN
    UPDATE recurring_rules SET timezone = v_timezone WHERE id = p_rule_id;
  END IF;
  
  -- Calcular janela
  v_date_from := GREATEST(v_rule.start_date, CURRENT_DATE);
  v_date_to := CASE 
    WHEN v_rule.end_date IS NOT NULL THEN LEAST(v_rule.end_date, CURRENT_DATE + p_window_days)
    ELSE CURRENT_DATE + p_window_days
  END;
  
  -- Iterar por cada data na janela
  v_current_date := v_date_from;
  WHILE v_current_date <= v_date_to LOOP
    v_weekday := EXTRACT(DOW FROM v_current_date)::int;
    
    -- Verificar se é dia da semana válido
    IF v_weekday = ANY(v_rule.weekdays) THEN
      -- Verificar intervalo de semanas
      v_weeks_diff := (v_current_date - v_rule.start_date) / 7;
      
      IF v_weeks_diff % v_rule.interval_weeks = 0 THEN
        v_occurrence_date := v_current_date;
        
        -- Converter para timestamptz
        v_start_at := (v_current_date::text || ' ' || v_rule.time_local)::timestamp AT TIME ZONE v_timezone;
        v_end_at := v_start_at + interval '60 minutes';
        
        -- Upsert appointment
        INSERT INTO atendimentos (
          user_id, cliente_id, recurring_rule_id, occurrence_date,
          data, hora, start_at_utc, end_at, tz,
          servico, valor, forma_pagamento, status, observacoes
        )
        VALUES (
          v_rule.user_id, v_rule.client_id, v_rule.id, v_occurrence_date,
          v_occurrence_date, v_rule.time_local::time, v_start_at, v_end_at, v_timezone,
          v_rule.title, COALESCE(v_rule.amount, 0), 'a_definir', 'agendado', 'Gerado automaticamente'
        )
        ON CONFLICT (recurring_rule_id, occurrence_date)
        WHERE recurring_rule_id IS NOT NULL
        DO UPDATE SET
          hora = EXCLUDED.hora,
          start_at_utc = EXCLUDED.start_at_utc,
          end_at = EXCLUDED.end_at,
          valor = EXCLUDED.valor,
          servico = EXCLUDED.servico,
          updated_at = now()
        RETURNING id INTO v_appointment_id;
        
        IF FOUND THEN
          IF v_appointment_id IS NOT NULL THEN
            -- Upsert financial entry
            INSERT INTO financial_entries (
              user_id, appointment_id, kind, status,
              amount, due_date, note
            )
            VALUES (
              v_rule.user_id, v_appointment_id, 'revenue', 'expected',
              COALESCE(v_rule.amount, 0), v_occurrence_date,
              'Projeção: ' || v_rule.title
            )
            ON CONFLICT (appointment_id)
            WHERE appointment_id IS NOT NULL AND status = 'expected'
            DO UPDATE SET
              amount = EXCLUDED.amount,
              due_date = EXCLUDED.due_date,
              updated_at = now();
            
            v_created := v_created + 1;
          END IF;
        ELSE
          v_updated := v_updated + 1;
        END IF;
      END IF;
    END IF;
    
    v_current_date := v_current_date + 1;
  END LOOP;
  
  RETURN jsonb_build_object(
    'created', v_created,
    'updated', v_updated,
    'skipped', v_skipped,
    'window_days', p_window_days
  );
END;
$$;

-- 5) FUNÇÃO: Limpar ocorrências futuras
CREATE OR REPLACE FUNCTION fn_prune_rule_future(p_rule_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_removed_appointments int;
  v_removed_finance int;
BEGIN
  -- Remover financial_entries expected futuras
  WITH deleted_fin AS (
    DELETE FROM financial_entries
    WHERE appointment_id IN (
      SELECT id FROM atendimentos
      WHERE recurring_rule_id = p_rule_id
        AND start_at_utc >= now()
    )
    AND status = 'expected'
    RETURNING id
  )
  SELECT COUNT(*) INTO v_removed_finance FROM deleted_fin;
  
  -- Remover appointments futuros
  WITH deleted_appt AS (
    DELETE FROM atendimentos
    WHERE recurring_rule_id = p_rule_id
      AND start_at_utc >= now()
    RETURNING id
  )
  SELECT COUNT(*) INTO v_removed_appointments FROM deleted_appt;
  
  RETURN jsonb_build_object(
    'removed_appointments_future', v_removed_appointments,
    'removed_finance_expected_future', v_removed_finance
  );
END;
$$;

-- 6) TRIGGERS para automação

-- Trigger para materializar/limpar ao modificar regra
CREATE OR REPLACE FUNCTION trg_recurring_rule_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM fn_prune_rule_future(OLD.id);
    RETURN OLD;
  END IF;
  
  IF TG_OP = 'UPDATE' THEN
    -- Verificar se campos relevantes mudaram
    IF (OLD.weekdays IS DISTINCT FROM NEW.weekdays OR
        OLD.time_local IS DISTINCT FROM NEW.time_local OR
        OLD.timezone IS DISTINCT FROM NEW.timezone OR
        OLD.start_date IS DISTINCT FROM NEW.start_date OR
        OLD.end_date IS DISTINCT FROM NEW.end_date OR
        OLD.interval_weeks IS DISTINCT FROM NEW.interval_weeks OR
        OLD.amount IS DISTINCT FROM NEW.amount OR
        OLD.active IS DISTINCT FROM NEW.active) THEN
      
      -- Se desativada, limpar
      IF NOT NEW.active THEN
        PERFORM fn_prune_rule_future(NEW.id);
      ELSE
        -- Se ativa, materializar
        PERFORM fn_materialize_rule(NEW.id, 180);
      END IF;
    END IF;
  END IF;
  
  IF TG_OP = 'INSERT' AND NEW.active THEN
    PERFORM fn_materialize_rule(NEW.id, 180);
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recurring_rule_changes ON recurring_rules;
CREATE TRIGGER trg_recurring_rule_changes
AFTER INSERT OR UPDATE OR DELETE ON recurring_rules
FOR EACH ROW
EXECUTE FUNCTION trg_recurring_rule_changed();

-- Trigger para atualizar updated_at em financial_entries
CREATE OR REPLACE FUNCTION update_financial_entries_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fin_entries_updated_at ON financial_entries;
CREATE TRIGGER trg_fin_entries_updated_at
BEFORE UPDATE ON financial_entries
FOR EACH ROW
EXECUTE FUNCTION update_financial_entries_updated_at();