import { supabase } from '@/integrations/supabase/client';

export type ClientesQueryParams = {
  search?: string | null;
  limit?: number;
  offset?: number;
};

export type ClientesServiceResponse = {
  ok: boolean;
  status: number;
  code?: string;
  message?: string;
  data: any[];
};

/**
 * Fetch clientes using secure RPC with RLS enforcement
 * Only returns clientes for the authenticated user
 * Includes lightweight telemetry (no PII)
 */
export async function fetchClientesSecure(
  params: ClientesQueryParams = {}
): Promise<ClientesServiceResponse> {
  const { search = null, limit = 100, offset = 0 } = params;

  try {
    const { data, error } = await supabase.rpc('get_clientes_secure', {
      p_search: search,
      p_limit: limit,
      p_offset: offset,
    });

    // Telemetria leve (não bloqueia a resposta)
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      supabase.functions
        .invoke('log-rpc-usage', {
          body: {
            rpc_name: 'get_clientes_secure',
            user_id: user.id,
          },
        })
        .catch(() => null); // Silenciar erros de telemetria para não afetar UX
    }

    if (error) {
      return {
        ok: false,
        status: 400,
        code: 'RPC_ERROR',
        message: error.message,
        data: [],
      };
    }

    return {
      ok: true,
      status: 200,
      data: data ?? [],
    };
  } catch (error) {
    return {
      ok: false,
      status: 500,
      code: 'UNEXPECTED_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
      data: [],
    };
  }
}
