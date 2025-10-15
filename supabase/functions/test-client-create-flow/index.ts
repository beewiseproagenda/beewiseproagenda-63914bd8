import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TEST_PAYLOADS = {
  // (a) Cliente sem recorrência
  simple: {
    cliente: {
      nome: 'Cliente Teste Simples',
      telefone: '(11) 98888-7777',
      email: 'teste.simples@example.com',
      tipo_pessoa: 'cpf' as const,
      cpf_cnpj: '',
      endereco: {
        cep: '',
        rua: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        estado: ''
      }
    },
    recorrencia: null
  },
  // (b) Cliente com recorrência
  recurring: {
    cliente: {
      nome: 'Cliente Teste Recorrente',
      telefone: '11987776666',
      email: 'teste.recorrente@example.com',
      tipo_pessoa: 'cpf' as const,
      cpf_cnpj: '',
      endereco: null
    },
    recorrencia: {
      weekdays: [1, 4], // Segunda e Quinta
      time_local: '19:00',
      timezone: 'America/Sao_Paulo',
      start_date: new Date().toISOString().split('T')[0],
      end_date: null,
      interval_weeks: 1,
      amount: 50,
      title: 'Aulas particulares'
    }
  },
  // (c) Cliente com endereço completo
  fullAddress: {
    cliente: {
      nome: 'Cliente Teste Endereço',
      telefone: '11976665555',
      email: '',
      tipo_pessoa: 'cpf' as const,
      cpf_cnpj: '',
      endereco: {
        cep: '01310-100',
        rua: 'Avenida Paulista',
        numero: '1578',
        complemento: 'Apto 101',
        bairro: 'Bela Vista',
        cidade: 'São Paulo',
        estado: 'SP'
      }
    },
    recorrencia: null
  }
};

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
        error: 'Missing authorization header'
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) {
      return new Response(JSON.stringify({
        ok: false,
        error: userError?.message || 'Invalid auth token'
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const results = {
      test_simple: null as any,
      test_recurring: null as any,
      test_full_address: null as any,
      summary: {
        total_tests: 3,
        passed: 0,
        failed: 0,
        warnings: [] as string[]
      }
    };

    // Test 1: Simple client
    try {
      const { data: simpleResult, error: simpleError } = await supabase.functions.invoke(
        'diag-create-client',
        {
          body: TEST_PAYLOADS.simple,
          headers: { Authorization: authHeader }
        }
      );

      results.test_simple = simpleError ? { ok: false, error: simpleError } : simpleResult;
      if (simpleResult?.ok) {
        results.summary.passed++;
      } else {
        results.summary.failed++;
        results.summary.warnings.push(`Simple client test failed: ${simpleResult?.error?.message}`);
      }
    } catch (ex) {
      results.test_simple = { ok: false, error: String(ex) };
      results.summary.failed++;
    }

    // Test 2: Recurring client
    try {
      const { data: recurringResult, error: recurringError } = await supabase.functions.invoke(
        'diag-create-client',
        {
          body: TEST_PAYLOADS.recurring,
          headers: { Authorization: authHeader }
        }
      );

      results.test_recurring = recurringError ? { ok: false, error: recurringError } : recurringResult;
      if (recurringResult?.ok) {
        results.summary.passed++;
      } else {
        results.summary.failed++;
        results.summary.warnings.push(`Recurring client test failed: ${recurringResult?.error?.message}`);
      }
    } catch (ex) {
      results.test_recurring = { ok: false, error: String(ex) };
      results.summary.failed++;
    }

    // Test 3: Full address client
    try {
      const { data: fullAddressResult, error: fullAddressError } = await supabase.functions.invoke(
        'diag-create-client',
        {
          body: TEST_PAYLOADS.fullAddress,
          headers: { Authorization: authHeader }
        }
      );

      results.test_full_address = fullAddressError ? { ok: false, error: fullAddressError } : fullAddressResult;
      if (fullAddressResult?.ok) {
        results.summary.passed++;
      } else {
        results.summary.failed++;
        results.summary.warnings.push(`Full address client test failed: ${fullAddressResult?.error?.message}`);
      }
    } catch (ex) {
      results.test_full_address = { ok: false, error: String(ex) };
      results.summary.failed++;
    }

    // Count created data in dashboard/agenda/financeiro
    const createdClientIds = [
      results.test_simple?.cliente_id,
      results.test_recurring?.cliente_id,
      results.test_full_address?.cliente_id
    ].filter(Boolean);

    const counts = {
      dashboard_clients: 0,
      agenda_appointments: 0,
      financeiro_entries: 0
    };

    if (createdClientIds.length > 0) {
      // Count in clientes
      const { data: clientesData } = await supabase
        .from('clientes')
        .select('id')
        .in('id', createdClientIds);
      counts.dashboard_clients = clientesData?.length || 0;

      // Count in atendimentos
      const { data: atendimentosData } = await supabase
        .from('atendimentos')
        .select('id')
        .in('cliente_id', createdClientIds);
      counts.agenda_appointments = atendimentosData?.length || 0;

      // Count in financial_entries
      const { data: financialData } = await supabase
        .from('financial_entries')
        .select('id')
        .eq('user_id', user.id);
      counts.financeiro_entries = financialData?.length || 0;
    }

    return new Response(JSON.stringify({
      ok: results.summary.failed === 0,
      results,
      counts,
      created_ids: createdClientIds
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Test flow error:', error);
    return new Response(JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
