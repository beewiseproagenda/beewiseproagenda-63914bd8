-- 1) Garantir que RLS está ativo na tabela clientes (já está, mas reforçando)
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- 2) Criar função RPC segura para listar clientes do usuário autenticado
CREATE OR REPLACE FUNCTION public.get_clientes_secure(
  p_search text DEFAULT NULL,
  p_limit int DEFAULT 100,
  p_offset int DEFAULT 0
)
RETURNS SETOF public.clientes
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.*
  FROM public.clientes c
  WHERE c.user_id = auth.uid()
    AND (
      p_search IS NULL
      OR c.nome ILIKE '%'||p_search||'%'
      OR COALESCE(REGEXP_REPLACE(c.telefone, '\D', '', 'g'),'') ILIKE '%'||REGEXP_REPLACE(p_search, '\D','','g')||'%'
    )
  ORDER BY c.criado_em DESC
  LIMIT GREATEST(p_limit, 0)
  OFFSET GREATEST(p_offset, 0)
$$;

-- 3) Configurar permissões (apenas para usuários autenticados)
REVOKE ALL ON FUNCTION public.get_clientes_secure(text,int,int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_clientes_secure(text,int,int) TO authenticated;

-- 4) Desabilitar uso da view antiga (preparação para deprecação)
REVOKE ALL ON TABLE public.clientes_decrypted FROM authenticated, anon;

-- 5) Comentar a função para documentação
COMMENT ON FUNCTION public.get_clientes_secure IS 'RPC segura com RLS - retorna clientes do usuário autenticado apenas';