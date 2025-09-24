-- Liberar acesso de assinatura anual para gabrielbragavenci2000@gmail.com
-- User ID: 554b46f9-de7a-403c-814b-59d2c68495a1

-- 1. Atualizar status no profiles
UPDATE public.profiles 
SET 
  subscription_active = true,
  subscription_updated_at = now()
WHERE user_id = '554b46f9-de7a-403c-814b-59d2c68495a1';

-- 2. Verificar se já existe na tabela subscriptions e atualizar, senão inserir
DO $$
BEGIN
  -- Tentar atualizar primeiro
  UPDATE public.subscriptions 
  SET 
    plan_code = 'anual',
    status = 'active',
    started_at = now(),
    next_charge_at = now() + interval '1 year',
    updated_at = now(),
    cancelled_at = NULL
  WHERE user_id = '554b46f9-de7a-403c-814b-59d2c68495a1';
  
  -- Se não atualizou nenhuma linha, inserir nova
  IF NOT FOUND THEN
    INSERT INTO public.subscriptions (
      user_id,
      plan_code,
      status,
      started_at,
      next_charge_at,
      created_at,
      updated_at
    ) VALUES (
      '554b46f9-de7a-403c-814b-59d2c68495a1',
      'anual',
      'active',
      now(),
      now() + interval '1 year',
      now(),
      now()
    );
  END IF;
END $$;

-- 3. Atualizar tabela subscribers
DO $$
BEGIN
  -- Tentar atualizar primeiro
  UPDATE public.subscribers 
  SET 
    subscribed = true,
    subscription_tier = 'anual',
    subscription_end = now() + interval '1 year',
    updated_at = now()
  WHERE user_id = '554b46f9-de7a-403c-814b-59d2c68495a1';
  
  -- Se não atualizou nenhuma linha, inserir nova
  IF NOT FOUND THEN
    INSERT INTO public.subscribers (
      user_id,
      email,
      subscribed,
      subscription_tier,
      subscription_end,
      created_at,
      updated_at
    ) VALUES (
      '554b46f9-de7a-403c-814b-59d2c68495a1',
      'gabrielbragavenci2000@gmail.com',
      true,
      'anual',
      now() + interval '1 year',
      now(),
      now()
    );
  END IF;
END $$;