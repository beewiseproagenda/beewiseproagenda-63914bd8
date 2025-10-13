import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const testResults = {
      timestamp: new Date().toISOString(),
      tests: [] as any[],
    };

    // Test 1: Verificar se RLS está ativo na tabela clientes
    const { data: rlsCheck } = await supabaseAdmin
      .from('pg_class')
      .select('relname, relrowsecurity')
      .eq('relname', 'clientes')
      .maybeSingle();

    testResults.tests.push({
      name: 'RLS habilitado na tabela clientes',
      status: rlsCheck?.relrowsecurity ? 'PASS' : 'FAIL',
      details: rlsCheck,
    });

    // Test 2: Verificar se a função get_clientes_secure existe
    const { data: funcList } = await supabaseAdmin.rpc('pg_catalog.pg_get_functiondef', {
      funcid: 'public.get_clientes_secure'::regprocedure,
    });

    testResults.tests.push({
      name: 'Função get_clientes_secure existe',
      status: funcList ? 'PASS' : 'FAIL',
      details: { exists: !!funcList },
    });

    // Test 3: Verificar tabela de telemetria
    const { data: telemetryTable } = await supabaseAdmin
      .from('pg_tables')
      .select('*')
      .eq('tablename', 'analytics_rpc_usage')
      .maybeSingle();

    testResults.tests.push({
      name: 'Tabela de telemetria existe',
      status: telemetryTable ? 'PASS' : 'FAIL',
      details: telemetryTable,
    });

    // Test 4: Verificar função increment_rpc_usage
    const { data: incrementFunc } = await supabaseAdmin
      .from('information_schema.routines')
      .select('*')
      .eq('routine_name', 'increment_rpc_usage')
      .maybeSingle();

    testResults.tests.push({
      name: 'Função increment_rpc_usage existe',
      status: incrementFunc ? 'PASS' : 'FAIL',
      details: { exists: !!incrementFunc },
    });

    // Test 5: Isolamento entre usuários (nota informativa)
    testResults.tests.push({
      name: 'Isolamento entre usuários',
      status: 'INFO',
      details: {
        note: 'RPC usa WHERE user_id = auth.uid() para garantir isolamento',
        verification: 'Manual - requer múltiplos usuários de teste',
      },
    });

    const summary = {
      total: testResults.tests.length,
      passed: testResults.tests.filter((t) => t.status === 'PASS').length,
      failed: testResults.tests.filter((t) => t.status === 'FAIL').length,
      info: testResults.tests.filter((t) => t.status === 'INFO').length,
    };

    return new Response(
      JSON.stringify({ ...testResults, summary }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Test suite error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
