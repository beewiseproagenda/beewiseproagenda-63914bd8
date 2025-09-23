-- Inserir assinaturas ativas anuais para os usuários especificados
INSERT INTO public.subscribers (email, user_id, subscribed, subscription_tier, subscription_end)
VALUES 
  ('gabrielbragavenci2000@gmail.com', 'aaee6215-67f7-41c3-9aa0-82c72109aff4', true, 'anual', (CURRENT_DATE + INTERVAL '1 year')::timestamp with time zone),
  ('felipe.bardella.1@gmail.com', '07d4c9be-e86c-4bde-9b72-328ba61a1910', true, 'anual', (CURRENT_DATE + INTERVAL '1 year')::timestamp with time zone),
  ('yuji.qtg@gmail.com', 'f6c7d7c3-3f1f-4f57-8fd5-72709eaeee6e', true, 'anual', (CURRENT_DATE + INTERVAL '1 year')::timestamp with time zone)
ON CONFLICT (email) DO UPDATE SET
  subscribed = EXCLUDED.subscribed,
  subscription_tier = EXCLUDED.subscription_tier,
  subscription_end = EXCLUDED.subscription_end,
  updated_at = now();