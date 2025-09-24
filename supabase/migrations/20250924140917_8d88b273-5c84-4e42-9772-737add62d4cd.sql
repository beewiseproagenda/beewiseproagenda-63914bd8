-- Adicionar colunas de controle de assinatura na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS subscription_active boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS subscription_updated_at timestamp with time zone DEFAULT now();

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_active ON public.profiles(subscription_active);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id_subscription ON public.profiles(user_id, subscription_active);