-- Atualizar função de materialização para suportar recorrência mensal e semanal
-- IMPORTANTE: Mantém compatibilidade com regras existentes (apenas semanal)

DROP FUNCTION IF EXISTS public.fn_materialize_rule(uuid, integer);

CREATE OR REPLACE FUNCTION public.fn_materialize_rule(p_rule_id uuid, p_window_days integer DEFAULT 180)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  v_months_diff int;
  v_day_of_month int;
  v_created int := 0;
  v_updated int := 0;
  v_skipped int := 0;
  v_appointment_id uuid;
  v_existing_id uuid;
  v_timezone text;
  v_amount_to_use numeric;
  v_package_valor numeric;
  v_recebimento_posterior boolean;
  v_recurrence_type text;
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
  
  -- Determinar tipo de recorrência (compatibilidade com regras antigas)
  v_recurrence_type := COALESCE(v_rule.recurrence_type, 'weekly');
  
  -- Garantir timezone
  v_timezone := COALESCE(v_rule.timezone, 'America/Sao_Paulo');
  IF v_rule.timezone IS NULL THEN
    UPDATE recurring_rules SET timezone = v_timezone WHERE id = p_rule_id;
  END IF;
  
  -- Determinar valor a usar (prioridade: rule.amount -> package.valor -> 0)
  v_amount_to_use := v_rule.amount;
  
  IF v_amount_to_use IS NULL OR v_amount_to_use = 0 THEN
    -- Buscar valor do pacote do cliente
    SELECT sp.valor INTO v_package_valor
    FROM clientes c
    LEFT JOIN servicos_pacotes sp ON sp.id = c.pacote_id
    WHERE c.id = v_rule.client_id
      AND c.pacote_id IS NOT NULL;
    
    v_amount_to_use := COALESCE(v_package_valor, 0);
  END IF;
  
  -- Buscar flag de recebimento posterior do cliente
  SELECT COALESCE(recebimento_posterior, false) INTO v_recebimento_posterior
  FROM clientes
  WHERE id = v_rule.client_id;
  
  -- Calcular janela
  v_date_from := GREATEST(v_rule.start_date, CURRENT_DATE);
  v_date_to := CASE 
    WHEN v_rule.end_date IS NOT NULL THEN LEAST(v_rule.end_date, CURRENT_DATE + p_window_days)
    ELSE CURRENT_DATE + p_window_days
  END;
  
  -- Iterar por cada data na janela
  v_current_date := v_date_from;
  WHILE v_current_date <= v_date_to LOOP
    v_occurrence_date := NULL;
    
    -- Verificar se deve criar ocorrência baseado no tipo de recorrência
    IF v_recurrence_type = 'weekly' THEN
      -- Recorrência semanal (lógica existente)
      v_weekday := EXTRACT(DOW FROM v_current_date)::int;
      
      IF v_rule.weekdays IS NOT NULL AND v_weekday = ANY(v_rule.weekdays) THEN
        -- Verificar intervalo de semanas
        v_weeks_diff := (v_current_date - v_rule.start_date) / 7;
        
        IF v_weeks_diff % COALESCE(v_rule.interval_weeks, 1) = 0 THEN
          v_occurrence_date := v_current_date;
        END IF;
      END IF;
      
    ELSIF v_recurrence_type = 'monthly' THEN
      -- Recorrência mensal (nova lógica)
      v_day_of_month := EXTRACT(DAY FROM v_current_date)::int;
      
      IF v_day_of_month = v_rule.day_of_month THEN
        -- Verificar intervalo de meses
        v_months_diff := (EXTRACT(YEAR FROM v_current_date) - EXTRACT(YEAR FROM v_rule.start_date)) * 12
                       + (EXTRACT(MONTH FROM v_current_date) - EXTRACT(MONTH FROM v_rule.start_date));
        
        IF v_months_diff >= 0 AND v_months_diff % COALESCE(v_rule.interval_months, 1) = 0 THEN
          v_occurrence_date := v_current_date;
        END IF;
      END IF;
    END IF;
    
    -- Se deve criar ocorrência
    IF v_occurrence_date IS NOT NULL THEN
      -- Converter para timestamptz
      v_start_at := (v_occurrence_date::text || ' ' || v_rule.time_local)::timestamp AT TIME ZONE v_timezone;
      v_end_at := v_start_at + interval '60 minutes';
      
      -- Verificar se já existe para não sobrescrever edições manuais
      SELECT id INTO v_existing_id
      FROM atendimentos
      WHERE recurring_rule_id = v_rule.id
        AND occurrence_date = v_occurrence_date;
      
      IF v_existing_id IS NOT NULL THEN
        -- Atualizar apenas se valor mudou e não foi editado manualmente
        UPDATE atendimentos
        SET 
          hora = v_rule.time_local::time,
          start_at_utc = v_start_at,
          end_at = v_end_at,
          servico = v_rule.title,
          updated_at = now()
        WHERE id = v_existing_id
          AND observacoes = 'Gerado automaticamente'; -- Só atualizar se não foi editado
        
        v_updated := v_updated + 1;
        v_appointment_id := v_existing_id;
      ELSE
        -- Inserir novo appointment com valor
        INSERT INTO atendimentos (
          user_id, cliente_id, recurring_rule_id, occurrence_date,
          data, hora, start_at_utc, end_at, tz,
          servico, valor, forma_pagamento, status, observacoes,
          competencia_date, recebimento_previsto
        )
        VALUES (
          v_rule.user_id, v_rule.client_id, v_rule.id, v_occurrence_date,
          v_occurrence_date, v_rule.time_local::time, v_start_at, v_end_at, v_timezone,
          v_rule.title, v_amount_to_use, 'outro', 'agendado', 'Gerado automaticamente',
          v_occurrence_date, 
          public.calcular_recebimento_previsto(v_occurrence_date, v_recebimento_posterior)
        )
        RETURNING id INTO v_appointment_id;
        
        v_created := v_created + 1;
      END IF;
      
      -- Upsert financial entry com valor
      IF v_appointment_id IS NOT NULL THEN
        INSERT INTO financial_entries (
          user_id, appointment_id, kind, status,
          amount, due_date, note
        )
        VALUES (
          v_rule.user_id, v_appointment_id, 'revenue', 'expected',
          v_amount_to_use, 
          public.calcular_recebimento_previsto(v_occurrence_date, v_recebimento_posterior),
          'Projeção: ' || v_rule.title
        )
        ON CONFLICT (appointment_id)
        WHERE appointment_id IS NOT NULL AND status = 'expected'
        DO UPDATE SET
          amount = EXCLUDED.amount,
          due_date = EXCLUDED.due_date,
          updated_at = now();
      END IF;
    END IF;
    
    v_current_date := v_current_date + 1;
  END LOOP;
  
  RETURN jsonb_build_object(
    'created', v_created,
    'updated', v_updated,
    'skipped', v_skipped,
    'window_days', p_window_days,
    'amount_used', v_amount_to_use,
    'recebimento_posterior', v_recebimento_posterior,
    'recurrence_type', v_recurrence_type
  );
END;
$function$;