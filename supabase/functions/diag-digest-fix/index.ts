import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DiagnosticResponse {
  ok: boolean;
  stage: string;
  hash_samples?: string[];
  client_id?: string;
  rule_id?: string;
  appointments_count?: number;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      const response: DiagnosticResponse = {
        ok: false,
        stage: 'auth',
        error: {
          code: 'NO_AUTH',
          message: 'Authorization header required',
        },
      };
      return new Response(JSON.stringify(response), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      const response: DiagnosticResponse = {
        ok: false,
        stage: 'auth',
        error: {
          code: 'AUTH_FAILED',
          message: authError?.message || 'Authentication failed',
        },
      };
      return new Response(JSON.stringify(response), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Test hash functions
    const { data: hashTest, error: hashError } = await supabase.rpc('util_hash_sha256', {
      input: 'test@example.com',
    });

    if (hashError) {
      const response: DiagnosticResponse = {
        ok: false,
        stage: 'hash_test',
        error: {
          code: 'HASH_FUNCTION_ERROR',
          message: hashError.message,
          details: hashError,
        },
      };
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const hash_samples = [hashTest];

    // Create test client with recurring rule
    const testClientData = {
      user_id: user.id,
      nome: `Test Cliente Digest Fix ${Date.now()}`,
      email: `test-digest-${Date.now()}@example.com`,
      telefone: '11999999999',
      cpf_cnpj: '',
      tipo_pessoa: 'cpf',
      endereco: {},
    };

    const { data: client, error: clientError } = await supabase
      .from('clientes')
      .insert(testClientData)
      .select()
      .single();

    if (clientError) {
      const response: DiagnosticResponse = {
        ok: false,
        stage: 'create_client',
        hash_samples,
        error: {
          code: 'CLIENT_INSERT_ERROR',
          message: clientError.message,
          details: clientError,
        },
      };
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create recurring rule
    const ruleData = {
      user_id: user.id,
      client_id: client.id,
      title: 'Test Recurring Service',
      weekdays: [1, 3, 5], // Mon, Wed, Fri
      time_local: '10:00',
      timezone: 'America/Sao_Paulo',
      start_date: new Date().toISOString().split('T')[0],
      end_date: null,
      interval_weeks: 1,
      amount: 100.0,
      active: true,
    };

    const { data: rule, error: ruleError } = await supabase
      .from('recurring_rules')
      .insert(ruleData)
      .select()
      .single();

    if (ruleError) {
      // Clean up client
      await supabase.from('clientes').delete().eq('id', client.id);
      
      const response: DiagnosticResponse = {
        ok: false,
        stage: 'create_recurring_rule',
        hash_samples,
        client_id: client.id,
        error: {
          code: 'RULE_INSERT_ERROR',
          message: ruleError.message,
          details: ruleError,
        },
      };
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Count generated appointments
    const { count, error: countError } = await supabase
      .from('atendimentos')
      .select('*', { count: 'exact', head: true })
      .eq('recurring_rule_id', rule.id);

    if (countError) {
      const response: DiagnosticResponse = {
        ok: false,
        stage: 'count_appointments',
        hash_samples,
        client_id: client.id,
        rule_id: rule.id,
        error: {
          code: 'COUNT_ERROR',
          message: countError.message,
          details: countError,
        },
      };
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Clean up test data
    await supabase.from('recurring_rules').delete().eq('id', rule.id);
    await supabase.from('clientes').delete().eq('id', client.id);

    // Success response
    const response: DiagnosticResponse = {
      ok: true,
      stage: 'complete',
      hash_samples,
      client_id: client.id,
      rule_id: rule.id,
      appointments_count: count || 0,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const response: DiagnosticResponse = {
      ok: false,
      stage: 'unexpected_error',
      error: {
        code: 'UNEXPECTED_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error,
      },
    };
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
