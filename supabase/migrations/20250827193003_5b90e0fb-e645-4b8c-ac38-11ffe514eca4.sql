-- Atualizar a assinatura anual do usuário para status authorized
UPDATE subscriptions 
SET 
  status = 'authorized',
  next_charge_at = NOW() + INTERVAL '1 year',
  updated_at = NOW()
WHERE 
  user_id = '07d4c9be-e86c-4bde-9b72-328ba61a1910' 
  AND plan_code = 'anual';