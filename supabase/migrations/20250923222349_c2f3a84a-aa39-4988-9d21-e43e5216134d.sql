-- Marcar emails como confirmados para os usuários especificados
UPDATE auth.users 
SET 
  email_confirmed_at = now(),
  updated_at = now()
WHERE email IN (
  'vitoriacpvieira@gmail.com',
  'tnatalylourenco@gmail.com', 
  'm.oliva77@hotmail.com'
) AND email_confirmed_at IS NULL;