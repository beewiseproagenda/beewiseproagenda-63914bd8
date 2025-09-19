-- Criar assinatura anual para yuji.qtg@gmail.com baseada nos mesmos parâmetros do felipe.bardella.1@gmail.com
INSERT INTO subscriptions (
  user_id,
  plan_code,
  status,
  started_at,
  next_charge_at,
  created_at,
  updated_at
)
VALUES (
  'f6c7d7c3-3f1f-4f57-8fd5-72709eaeee6e', -- yuji.qtg@gmail.com user_id
  'anual',
  'authorized',
  now(),
  (now() + interval '1 year'),
  now(),
  now()
);