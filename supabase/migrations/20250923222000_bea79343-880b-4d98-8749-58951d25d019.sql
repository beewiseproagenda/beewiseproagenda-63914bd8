-- Inserir assinaturas anuais ativas para os 3 usuários especificados
INSERT INTO public.subscriptions (
  user_id,
  plan_code,
  status,
  started_at,
  next_charge_at,
  created_at,
  updated_at
) VALUES 
  -- vitoriacpvieira@gmail.com
  ('18426c67-cbfa-47d6-934d-987d9df0c99b', 'anual', 'active', now(), now() + interval '1 year', now(), now()),
  -- tnatalylourenco@gmail.com  
  ('63573461-dc45-4941-b672-9fb8682cee27', 'anual', 'active', now(), now() + interval '1 year', now(), now()),
  -- m.oliva77@hotmail.com
  ('175a7744-929d-4c21-a3e0-435d16f8cadd', 'anual', 'active', now(), now() + interval '1 year', now(), now())
ON CONFLICT (user_id) DO UPDATE SET
  plan_code = EXCLUDED.plan_code,
  status = EXCLUDED.status,
  started_at = EXCLUDED.started_at,
  next_charge_at = EXCLUDED.next_charge_at,
  updated_at = EXCLUDED.updated_at;

-- Inserir também na tabela legacy subscribers para compatibilidade
INSERT INTO public.subscribers (
  user_id,
  email,
  subscribed,
  subscription_tier,
  subscription_end,
  created_at,
  updated_at
) VALUES 
  -- vitoriacpvieira@gmail.com
  ('18426c67-cbfa-47d6-934d-987d9df0c99b', 'vitoriacpvieira@gmail.com', true, 'anual', now() + interval '1 year', now(), now()),
  -- tnatalylourenco@gmail.com  
  ('63573461-dc45-4941-b672-9fb8682cee27', 'tnatalylourenco@gmail.com', true, 'anual', now() + interval '1 year', now(), now()),
  -- m.oliva77@hotmail.com
  ('175a7744-929d-4c21-a3e0-435d16f8cadd', 'm.oliva77@hotmail.com', true, 'anual', now() + interval '1 year', now(), now())
ON CONFLICT (email) DO UPDATE SET
  user_id = EXCLUDED.user_id,
  subscribed = EXCLUDED.subscribed,
  subscription_tier = EXCLUDED.subscription_tier,
  subscription_end = EXCLUDED.subscription_end,
  updated_at = EXCLUDED.updated_at;