import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { requireAuth, corsHeaders, handleCors, logSafely } from '../_shared/auth.ts';

serve(async (req) => {
  logSafely('User data request received', { method: req.method });
  
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // SECURITY: Require authentication for all user data operations
    const authResult = await requireAuth(req);
    if (!authResult) {
      logSafely('Authentication failed for user-data endpoint');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Valid authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // SECURITY: Fetch only user's own data with whitelisted fields
    const [clientesResult, atendimentosResult, servicosResult, despesasResult, receitasResult] = await Promise.all([
      supabase
        .from('clientes')
        .select('id, nome, email, telefone, tipo_pessoa, criado_em, ultimo_atendimento')
        .eq('user_id', authResult.userId)
        .order('criado_em', { ascending: false }),
      
      supabase
        .from('atendimentos')
        .select('id, data, hora, cliente_id, servico, valor, forma_pagamento, status')
        .eq('user_id', authResult.userId)
        .order('data', { ascending: false })
        .limit(50), // Limit to recent records
      
      supabase
        .from('servicos_pacotes')
        .select('id, nome, tipo, valor, descricao')
        .eq('user_id', authResult.userId)
        .order('criado_em', { ascending: false }),
      
      supabase
        .from('despesas')
        .select('id, data, valor, descricao, categoria, tipo')
        .eq('user_id', authResult.userId)
        .order('data', { ascending: false })
        .limit(50), // Limit to recent records
      
      supabase
        .from('receitas')
        .select('id, data, valor, descricao, categoria, forma_pagamento')
        .eq('user_id', authResult.userId)
        .order('data', { ascending: false })
        .limit(50) // Limit to recent records
    ]);

    // Check for errors
    const errors = [
      clientesResult.error,
      atendimentosResult.error,
      servicosResult.error,
      despesasResult.error,
      receitasResult.error
    ].filter(Boolean);

    if (errors.length > 0) {
      logSafely('Database errors in user-data', { error_count: errors.length });
      throw new Error('Database query failed');
    }

    // SECURITY: Return only whitelisted fields
    const response = {
      clientes: clientesResult.data || [],
      atendimentos: atendimentosResult.data || [],
      servicos_pacotes: servicosResult.data || [],
      despesas: despesasResult.data || [],
      receitas: receitasResult.data || []
    };

    logSafely('User data retrieved successfully', { 
      clientes_count: response.clientes.length,
      atendimentos_count: response.atendimentos.length,
      servicos_count: response.servicos_pacotes.length,
      despesas_count: response.despesas.length,
      receitas_count: response.receitas.length
    });

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    logSafely('Error in user-data endpoint', { 
      error_code: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});