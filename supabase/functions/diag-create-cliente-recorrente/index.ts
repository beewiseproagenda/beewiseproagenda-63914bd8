import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DiagnosticInput {
  cliente: {
    nome: string;
    telefone?: string | null;
    email?: string | null;
    cpf_cnpj?: string | null;
    tipo_pessoa?: 'cpf' | 'cnpj';
    observacoes?: string | null;
  };
  recorrencia: {
    weekdays: number[];
    time_local: string;
    timezone: string;
    start_date: string;
    end_date?: string | null;
    interval_weeks?: number;
    amount: number;
    title?: string | null;
  };
}

function normalizeWeekdays(weekdays: number[]): number[] {
  return weekdays.map(day => {
    if (day >= 1 && day <= 7) {
      return day === 7 ? 0 : day;
    }
    return day;
  }).filter(day => day >= 0 && day <= 6);
}

function validateTimeLocal(time: string): boolean {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return timeRegex.test(time);
}

function validateTimezone(tz: string): boolean {
  return tz.startsWith('America/') || tz.startsWith('Europe/') || tz === 'UTC';
}

function validateDates(start: string, end?: string | null): boolean {
  const startDate = new Date(start);
  if (isNaN(startDate.getTime())) return false;
  if (end) {
    const endDate = new Date(end);
    if (isNaN(endDate.getTime())) return false;
    return endDate >= startDate;
  }
  return true;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({
        input_ok: false,
        validation: { timezone_ok: false, time_local_ok: false, weekdays_ok: false, dates_ok: false },
        transaction: { ok: false, stage_failed: 'auth' },
        result: { ok: false, cliente_id: null, recurring_rule_id: null, materialize: { created: 0, updated: 0, skipped: 0, window_days: 0, until: null }, finance_expected: { upserted: 0 } },
        error: { code: 'NO_AUTH', message: 'Missing authorization header', hint: 'Include Authorization header' }
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) {
      return new Response(JSON.stringify({
        input_ok: false,
        validation: { timezone_ok: false, time_local_ok: false, weekdays_ok: false, dates_ok: false },
        transaction: { ok: false, stage_failed: 'auth' },
        result: { ok: false, cliente_id: null, recurring_rule_id: null, materialize: { created: 0, updated: 0, skipped: 0, window_days: 0, until: null }, finance_expected: { upserted: 0 } },
        error: { code: 'INVALID_TOKEN', message: userError?.message || 'Invalid auth token', hint: 'Provide valid JWT' }
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const payload: DiagnosticInput = await req.json();

    // Validation
    const normalizedWeekdays = normalizeWeekdays(payload.recorrencia.weekdays);
    const weekdays_ok = normalizedWeekdays.length > 0;
    const time_local_ok = validateTimeLocal(payload.recorrencia.time_local);
    const timezone_ok = validateTimezone(payload.recorrencia.timezone);
    const dates_ok = validateDates(payload.recorrencia.start_date, payload.recorrencia.end_date);

    const input_ok = weekdays_ok && time_local_ok && timezone_ok && dates_ok && !!payload.cliente.nome;

    if (!input_ok) {
      return new Response(JSON.stringify({
        input_ok: false,
        validation: { timezone_ok, time_local_ok, weekdays_ok, dates_ok },
        transaction: { ok: false, stage_failed: 'validation' },
        result: { ok: false, cliente_id: null, recurring_rule_id: null, materialize: { created: 0, updated: 0, skipped: 0, window_days: 0, until: null }, finance_expected: { upserted: 0 } },
        error: { code: 'VALIDATION_FAILED', message: 'Input validation failed', hint: 'Check validation details' }
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Call create-cliente-recorrente function
    const createResponse = await supabase.functions.invoke('create-cliente-recorrente', {
      body: payload,
      headers: {
        Authorization: authHeader,
      },
    });

    if (createResponse.error) {
      return new Response(JSON.stringify({
        input_ok: true,
        validation: { timezone_ok, time_local_ok, weekdays_ok, dates_ok },
        transaction: { ok: false, stage_failed: 'invoke' },
        result: { ok: false, cliente_id: null, recurring_rule_id: null, materialize: { created: 0, updated: 0, skipped: 0, window_days: 0, until: null }, finance_expected: { upserted: 0 } },
        error: { code: 'INVOKE_ERROR', message: createResponse.error.message, hint: 'Check create-cliente-recorrente logs' }
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const createResult = createResponse.data;

    // Fetch sample appointments if successful
    let sample = null;
    if (createResult.ok && createResult.recurring_rule_id) {
      const { data: appointments } = await supabase
        .from('atendimentos')
        .select('occurrence_date, start_at_utc, hora')
        .eq('recurring_rule_id', createResult.recurring_rule_id)
        .order('occurrence_date', { ascending: true });

      if (appointments && appointments.length > 0) {
        const first = appointments[0];
        const last = appointments[appointments.length - 1];
        sample = {
          first: {
            local: `${first.occurrence_date} ${first.hora}`,
            utc: first.start_at_utc,
          },
          last: {
            local: `${last.occurrence_date} ${last.hora}`,
            utc: last.start_at_utc,
          },
        };
      }
    }

    return new Response(JSON.stringify({
      input_ok: true,
      validation: { timezone_ok, time_local_ok, weekdays_ok, dates_ok },
      transaction: { ok: createResult.ok, stage_failed: createResult.error?.stage || null },
      result: {
        ok: createResult.ok,
        cliente_id: createResult.cliente_id,
        recurring_rule_id: createResult.recurring_rule_id,
        materialize: createResult.materialize,
        finance_expected: createResult.finance_expected,
        sample,
      },
      error: createResult.error,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Diagnostic error:', error);
    return new Response(JSON.stringify({
      input_ok: false,
      validation: { timezone_ok: false, time_local_ok: false, weekdays_ok: false, dates_ok: false },
      transaction: { ok: false, stage_failed: 'unexpected' },
      result: { ok: false, cliente_id: null, recurring_rule_id: null, materialize: { created: 0, updated: 0, skipped: 0, window_days: 0, until: null }, finance_expected: { upserted: 0 } },
      error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error', hint: 'Check edge function logs' }
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
