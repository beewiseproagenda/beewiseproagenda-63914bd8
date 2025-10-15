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
    endereco?: any;
    observacoes?: string | null;
  };
  recorrencia?: {
    weekdays: number[];
    time_local: string;
    timezone: string;
    start_date: string;
    end_date?: string | null;
    interval_weeks?: number;
    amount: number;
    title?: string | null;
  } | null;
}

function sanitizeTelefone(tel: string | null | undefined): string {
  if (!tel) return '';
  return tel.replace(/\D/g, '');
}

function sanitizeCep(cep: string | null | undefined): string {
  if (!cep) return '';
  return cep.replace(/\D/g, '');
}

function normalizeWeekdays(weekdays: number[]): number[] {
  return weekdays.map(day => {
    if (day >= 1 && day <= 7) {
      return day === 7 ? 0 : day;
    }
    return day;
  }).filter(day => day >= 0 && day <= 6);
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
        stage: 'auth',
        error: { 
          code: 'NO_AUTH', 
          message: 'Missing authorization header', 
          hint: 'Include Authorization header' 
        },
        payload_echo: null
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) {
      return new Response(JSON.stringify({
        ok: false,
        stage: 'auth',
        error: { 
          code: 'INVALID_TOKEN', 
          message: userError?.message || 'Invalid auth token', 
          hint: 'Provide valid JWT' 
        },
        payload_echo: null
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const payload: DiagnosticInput = await req.json();

    // Sanitize and normalize input
    const sanitizedCliente = {
      user_id: user.id,
      nome: payload.cliente.nome?.trim() || '',
      telefone: sanitizeTelefone(payload.cliente.telefone),
      email: payload.cliente.email?.trim() || '',
      cpf_cnpj: payload.cliente.cpf_cnpj?.trim() || '',
      tipo_pessoa: payload.cliente.tipo_pessoa || 'cpf',
      endereco: payload.cliente.endereco || {
        cep: '',
        rua: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        estado: ''
      },
      recorrente: !!payload.recorrencia,
      recorrencia: payload.recorrencia ? 'semanal' : null,
      tipo_cobranca: 'variavel',
      pacote_id: null,
      agendamento_fixo: null,
      ultimo_atendimento: null,
    };

    // Validate required fields
    if (!sanitizedCliente.nome) {
      return new Response(JSON.stringify({
        ok: false,
        stage: 'validation',
        error: { 
          code: 'VALIDATION_FAILED', 
          message: 'Nome é obrigatório', 
          hint: 'Forneça o nome do cliente' 
        },
        payload_echo: payload
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!sanitizedCliente.telefone) {
      return new Response(JSON.stringify({
        ok: false,
        stage: 'validation',
        error: { 
          code: 'VALIDATION_FAILED', 
          message: 'Telefone é obrigatório', 
          hint: 'Forneça o telefone do cliente' 
        },
        payload_echo: payload
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Validate recurrence if provided
    if (payload.recorrencia) {
      const normalizedWeekdays = normalizeWeekdays(payload.recorrencia.weekdays);
      if (normalizedWeekdays.length === 0) {
        return new Response(JSON.stringify({
          ok: false,
          stage: 'validation',
          error: { 
            code: 'VALIDATION_FAILED', 
            message: 'Selecione ao menos um dia da semana para recorrência', 
            hint: 'weekdays deve ter ao menos 1 dia válido (0-6)' 
          },
          payload_echo: payload
        }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (!payload.recorrencia.time_local) {
        return new Response(JSON.stringify({
          ok: false,
          stage: 'validation',
          error: { 
            code: 'VALIDATION_FAILED', 
            message: 'Horário é obrigatório para recorrência', 
            hint: 'Forneça time_local no formato HH:MM' 
          },
          payload_echo: payload
        }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // Try to insert cliente
    try {
      const { data: clienteData, error: clienteError } = await supabase
        .from('clientes')
        .insert(sanitizedCliente)
        .select()
        .single();

      if (clienteError) {
        return new Response(JSON.stringify({
          ok: false,
          stage: 'insert_client',
          error: {
            code: clienteError.code || 'DB_ERROR',
            message: clienteError.message,
            details: clienteError.details || '',
            hint: clienteError.hint || 'Verifique os dados do cliente',
          },
          supabase: {
            table: 'clientes',
            constraint: clienteError.code?.includes('constraint') ? clienteError.message : null,
            rls: clienteError.code === '42501',
          },
          payload_echo: payload
        }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // If recorrencia, try to create rule
      if (payload.recorrencia && clienteData) {
        const ruleData = {
          user_id: user.id,
          client_id: clienteData.id,
          title: payload.recorrencia.title || 'Recorrência',
          weekdays: normalizeWeekdays(payload.recorrencia.weekdays),
          time_local: payload.recorrencia.time_local,
          timezone: payload.recorrencia.timezone || 'America/Sao_Paulo',
          start_date: payload.recorrencia.start_date,
          end_date: payload.recorrencia.end_date || null,
          interval_weeks: payload.recorrencia.interval_weeks || 1,
          amount: payload.recorrencia.amount || 0,
          active: true,
        };

        const { data: ruleResult, error: ruleError } = await supabase
          .from('recurring_rules')
          .insert(ruleData)
          .select()
          .single();

        if (ruleError) {
          // Rollback: delete cliente
          await supabase.from('clientes').delete().eq('id', clienteData.id);
          
          return new Response(JSON.stringify({
            ok: false,
            stage: 'insert_rule',
            error: {
              code: ruleError.code || 'DB_ERROR',
              message: ruleError.message,
              details: ruleError.details || '',
              hint: ruleError.hint || 'Erro ao criar regra de recorrência',
            },
            supabase: {
              table: 'recurring_rules',
              constraint: ruleError.code?.includes('constraint') ? ruleError.message : null,
              rls: ruleError.code === '42501',
            },
            payload_echo: payload
          }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // Try to materialize
        try {
          const { data: materializeData, error: materializeError } = await supabase.functions.invoke(
            'materialize-recurring',
            {
              body: { rule_id: ruleResult.id, window_days: 180 },
              headers: { Authorization: authHeader }
            }
          );

          if (materializeError) {
            return new Response(JSON.stringify({
              ok: false,
              stage: 'materialize',
              error: {
                code: 'MATERIALIZE_ERROR',
                message: materializeError.message,
                details: JSON.stringify(materializeError),
                hint: 'Erro ao materializar agendamentos automáticos',
              },
              cliente_id: clienteData.id,
              recurring_rule_id: ruleResult.id,
              payload_echo: payload
            }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }

          return new Response(JSON.stringify({
            ok: true,
            stage: 'complete',
            cliente_id: clienteData.id,
            recurring_rule_id: ruleResult.id,
            materialize_result: materializeData,
            payload_echo: payload
          }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        } catch (materializeEx) {
          return new Response(JSON.stringify({
            ok: false,
            stage: 'materialize',
            error: {
              code: 'MATERIALIZE_EXCEPTION',
              message: materializeEx instanceof Error ? materializeEx.message : 'Unknown error',
              details: String(materializeEx),
              hint: 'Exceção ao chamar materialize-recurring',
            },
            cliente_id: clienteData.id,
            recurring_rule_id: ruleResult.id,
            payload_echo: payload
          }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      }

      // No recurrence - success
      return new Response(JSON.stringify({
        ok: true,
        stage: 'complete',
        cliente_id: clienteData.id,
        recurring_rule_id: null,
        payload_echo: payload
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } catch (insertEx) {
      return new Response(JSON.stringify({
        ok: false,
        stage: 'insert_client',
        error: {
          code: 'DB_EXCEPTION',
          message: insertEx instanceof Error ? insertEx.message : 'Unknown error',
          details: String(insertEx),
          hint: 'Exceção ao inserir cliente',
        },
        payload_echo: payload
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

  } catch (error) {
    console.error('Diagnostic error:', error);
    return new Response(JSON.stringify({
      ok: false,
      stage: 'unexpected',
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: String(error),
        hint: 'Erro inesperado no diagnóstico',
      },
      payload_echo: null
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
