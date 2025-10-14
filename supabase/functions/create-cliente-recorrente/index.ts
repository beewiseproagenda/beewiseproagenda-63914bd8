import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NovoClienteComRecorrencia {
  cliente: {
    nome: string;
    telefone?: string | null;
    email?: string | null;
    cpf_cnpj?: string | null;
    tipo_pessoa?: 'cpf' | 'cnpj';
    endereco?: any;
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

interface DiagnosticResponse {
  ok: boolean;
  cliente_id: string | null;
  recurring_rule_id: string | null;
  materialize: {
    created: number;
    updated: number;
    skipped: number;
    window_days: number;
    until: string | null;
  };
  finance_expected: {
    upserted: number;
  };
  error: {
    stage: string | null;
    code: string | null;
    message: string | null;
    hint: string | null;
  } | null;
}

function normalizeWeekdays(weekdays: number[]): number[] {
  return weekdays.map(day => {
    if (day >= 1 && day <= 7) {
      return day === 7 ? 0 : day; // Convert Sunday from 7 to 0
    }
    return day; // Already 0-6
  }).filter(day => day >= 0 && day <= 6);
}

function validateTimeLocal(time: string): boolean {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return timeRegex.test(time);
}

function validateTimezone(tz: string): boolean {
  const validTimezones = ['America/Sao_Paulo', 'America/New_York', 'UTC', 'Europe/London'];
  return validTimezones.includes(tz) || tz.startsWith('America/') || tz.startsWith('Europe/');
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
        ok: false,
        cliente_id: null,
        recurring_rule_id: null,
        materialize: { created: 0, updated: 0, skipped: 0, window_days: 0, until: null },
        finance_expected: { upserted: 0 },
        error: { stage: 'auth', code: 'NO_AUTH', message: 'Missing authorization header', hint: 'Include Authorization header' }
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) {
      return new Response(JSON.stringify({
        ok: false,
        cliente_id: null,
        recurring_rule_id: null,
        materialize: { created: 0, updated: 0, skipped: 0, window_days: 0, until: null },
        finance_expected: { upserted: 0 },
        error: { stage: 'auth', code: 'INVALID_TOKEN', message: userError?.message || 'Invalid auth token', hint: 'Provide valid JWT' }
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const payload: NovoClienteComRecorrencia = await req.json();

    // Validation
    if (!payload.cliente?.nome) {
      return new Response(JSON.stringify({
        ok: false,
        cliente_id: null,
        recurring_rule_id: null,
        materialize: { created: 0, updated: 0, skipped: 0, window_days: 0, until: null },
        finance_expected: { upserted: 0 },
        error: { stage: 'validation', code: 'MISSING_NOME', message: 'Cliente nome is required', hint: 'Provide cliente.nome' }
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!payload.recorrencia?.weekdays || payload.recorrencia.weekdays.length === 0) {
      return new Response(JSON.stringify({
        ok: false,
        cliente_id: null,
        recurring_rule_id: null,
        materialize: { created: 0, updated: 0, skipped: 0, window_days: 0, until: null },
        finance_expected: { upserted: 0 },
        error: { stage: 'validation', code: 'MISSING_WEEKDAYS', message: 'Weekdays array is required', hint: 'Provide recorrencia.weekdays as array' }
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const normalizedWeekdays = normalizeWeekdays(payload.recorrencia.weekdays);
    if (normalizedWeekdays.length === 0) {
      return new Response(JSON.stringify({
        ok: false,
        cliente_id: null,
        recurring_rule_id: null,
        materialize: { created: 0, updated: 0, skipped: 0, window_days: 0, until: null },
        finance_expected: { upserted: 0 },
        error: { stage: 'validation', code: 'INVALID_WEEKDAYS', message: 'No valid weekdays provided', hint: 'Weekdays must be 0-6 or 1-7' }
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!validateTimeLocal(payload.recorrencia.time_local)) {
      return new Response(JSON.stringify({
        ok: false,
        cliente_id: null,
        recurring_rule_id: null,
        materialize: { created: 0, updated: 0, skipped: 0, window_days: 0, until: null },
        finance_expected: { upserted: 0 },
        error: { stage: 'validation', code: 'INVALID_TIME', message: 'Invalid time_local format', hint: 'Use HH:MM format (e.g., 19:00)' }
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!validateTimezone(payload.recorrencia.timezone)) {
      return new Response(JSON.stringify({
        ok: false,
        cliente_id: null,
        recurring_rule_id: null,
        materialize: { created: 0, updated: 0, skipped: 0, window_days: 0, until: null },
        finance_expected: { upserted: 0 },
        error: { stage: 'validation', code: 'INVALID_TIMEZONE', message: 'Invalid timezone', hint: 'Use valid IANA timezone (e.g., America/Sao_Paulo)' }
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Insert cliente
    const { data: clienteData, error: clienteError } = await supabase
      .from('clientes')
      .insert({
        user_id: user.id,
        nome: payload.cliente.nome,
        telefone: payload.cliente.telefone || '',
        email: payload.cliente.email || '',
        cpf_cnpj: payload.cliente.cpf_cnpj || '',
        tipo_pessoa: payload.cliente.tipo_pessoa || 'cpf',
        endereco: payload.cliente.endereco || {},
        recorrente: true,
      })
      .select()
      .single();

    if (clienteError || !clienteData) {
      return new Response(JSON.stringify({
        ok: false,
        cliente_id: null,
        recurring_rule_id: null,
        materialize: { created: 0, updated: 0, skipped: 0, window_days: 0, until: null },
        finance_expected: { upserted: 0 },
        error: { stage: 'insert_cliente', code: clienteError?.code || 'INSERT_ERROR', message: clienteError?.message || 'Failed to insert cliente', hint: clienteError?.hint || 'Check RLS policies' }
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Insert recurring_rule
    const windowDays = payload.recorrencia.end_date ? null : 180;
    const { data: ruleData, error: ruleError } = await supabase
      .from('recurring_rules')
      .insert({
        user_id: user.id,
        client_id: clienteData.id,
        weekdays: normalizedWeekdays,
        time_local: payload.recorrencia.time_local,
        timezone: payload.recorrencia.timezone,
        start_date: payload.recorrencia.start_date,
        end_date: payload.recorrencia.end_date || null,
        interval_weeks: payload.recorrencia.interval_weeks || 1,
        amount: payload.recorrencia.amount,
        title: payload.recorrencia.title || 'Recorrência',
        active: true,
      })
      .select()
      .single();

    if (ruleError || !ruleData) {
      // Rollback cliente
      await supabase.from('clientes').delete().eq('id', clienteData.id);
      
      return new Response(JSON.stringify({
        ok: false,
        cliente_id: null,
        recurring_rule_id: null,
        materialize: { created: 0, updated: 0, skipped: 0, window_days: 0, until: null },
        finance_expected: { upserted: 0 },
        error: { stage: 'insert_regra', code: ruleError?.code || 'INSERT_ERROR', message: ruleError?.message || 'Failed to insert recurring rule', hint: ruleError?.hint || 'Check RLS policies' }
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Materialize using existing function
    const materializeWindowDays = payload.recorrencia.end_date 
      ? Math.ceil((new Date(payload.recorrencia.end_date).getTime() - new Date(payload.recorrencia.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1
      : 180;

    const { data: materializeResult, error: materializeError } = await supabase.rpc('fn_materialize_rule', {
      p_rule_id: ruleData.id,
      p_window_days: materializeWindowDays,
    });

    if (materializeError) {
      return new Response(JSON.stringify({
        ok: false,
        cliente_id: clienteData.id,
        recurring_rule_id: ruleData.id,
        materialize: { created: 0, updated: 0, skipped: 0, window_days: materializeWindowDays, until: payload.recorrencia.end_date },
        finance_expected: { upserted: 0 },
        error: { stage: 'materialize', code: materializeError.code, message: materializeError.message, hint: materializeError.hint || 'Check fn_materialize_rule' }
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const result: DiagnosticResponse = {
      ok: true,
      cliente_id: clienteData.id,
      recurring_rule_id: ruleData.id,
      materialize: {
        created: materializeResult?.created || 0,
        updated: materializeResult?.updated || 0,
        skipped: materializeResult?.skipped || 0,
        window_days: materializeWindowDays,
        until: payload.recorrencia.end_date || null,
      },
      finance_expected: {
        upserted: materializeResult?.created || 0, // Finance entries created by trigger
      },
      error: null,
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({
      ok: false,
      cliente_id: null,
      recurring_rule_id: null,
      materialize: { created: 0, updated: 0, skipped: 0, window_days: 0, until: null },
      finance_expected: { upserted: 0 },
      error: { 
        stage: 'unexpected', 
        code: 'INTERNAL_ERROR', 
        message: error instanceof Error ? error.message : 'Unknown error', 
        hint: 'Check edge function logs' 
      }
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
