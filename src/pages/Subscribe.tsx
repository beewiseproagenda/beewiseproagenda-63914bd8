import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Check, Crown, Zap, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const Subscribe = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<'mensal' | 'anual'>('mensal');
  const [isCreating, setIsCreating] = useState(false);
  const [userInfo, setUserInfo] = useState<{userId: string, email: string} | null>(null);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const validateTokenAndCheckSubscription = async () => {
      console.log('[Subscribe] Iniciando validação', { 
        authLoading, 
        user: user?.id, 
        token: searchParams.get('ot') 
      });

      try {
        setLoading(true);
        setError(null);
        
        const otToken = searchParams.get('ot');
        
        // Se há token, usar fluxo de onboarding
        if (otToken) {
          console.log('[Subscribe] Validando token de onboarding');
          
          const { data, error: tokenError } = await supabase.functions.invoke('validate-onboarding-token', {
            body: { token: otToken }
          });

          if (tokenError || !data?.valid) {
            console.log('[Subscribe] Token inválido ou expirado');
            setError('Seu link expirou. Solicite um novo e-mail de verificação.');
            return;
          }

          console.log('[Subscribe] Token válido, definindo userInfo');
          setUserInfo({ userId: data.userId, email: data.email });

          // Check if user already has active subscription
          const { data: subscriptions, error: subError } = await supabase
            .from('subscriptions')
            .select('status')
            .eq('user_id', data.userId)
            .in('status', ['authorized', 'active'])
            .limit(1);

          if (subError) {
            console.error('[Subscribe] Erro ao verificar assinatura:', subError);
          } else if (subscriptions && subscriptions.length > 0) {
            console.log('[Subscribe] Assinatura ativa encontrada');
            setHasActiveSubscription(true);
          } else {
            console.log('[Subscribe] Nenhuma assinatura ativa encontrada');
          }
        } 
        // Se não há token, verificar se há usuário logado
        else if (user) {
          console.log('[Subscribe] Usuário logado encontrado, sem token');
          setUserInfo({ userId: user.id, email: user.email || '' });

          // Check if user already has active subscription
          const { data: subscriptions, error: subError } = await supabase
            .from('subscriptions')
            .select('status')
            .eq('user_id', user.id)
            .in('status', ['authorized', 'active'])
            .limit(1);

          if (subError) {
            console.error('[Subscribe] Erro ao verificar assinatura:', subError);
          } else if (subscriptions && subscriptions.length > 0) {
            console.log('[Subscribe] Assinatura ativa encontrada para usuário logado');
            setHasActiveSubscription(true);
          } else {
            console.log('[Subscribe] Nenhuma assinatura ativa encontrada para usuário logado');
          }
        }
        // Se não há token nem usuário logado
        else {
          console.log('[Subscribe] Nem token nem usuário encontrado');
          setError('Acesso negado. Faça login ou solicite um novo e-mail de verificação.');
        }

      } catch (err) {
        console.error('[Subscribe] Erro na validação:', err);
        setError('Erro ao validar acesso. Tente novamente.');
      } finally {
        console.log('[Subscribe] Finalizando validação, setLoading(false)');
        setLoading(false);
      }
    };

    // Só executa quando o auth terminou de carregar
    if (!authLoading) {
      console.log('[Subscribe] Auth não está carregando, iniciando validação');
      validateTokenAndCheckSubscription();
    } else {
      console.log('[Subscribe] Auth ainda carregando, aguardando...');
    }
  }, [searchParams, user, authLoading]);

  const handleSubscribe = async () => {
    if (!userInfo) return;

    try {
      setIsCreating(true);
      console.log('Creating subscription:', { selectedPlan, userId: userInfo.userId });
      
      const { data, error } = await supabase.functions.invoke('create-subscription', {
        body: {
          user_id: userInfo.userId,
          email: userInfo.email,
          plan_code: selectedPlan,
          onboarding_token: searchParams.get('ot')
        }
      });
      
      if (error) {
        throw error;
      }
      
      if (data?.init_point) {
        console.log('Redirecting to Mercado Pago:', data.init_point);
        window.location.href = data.init_point;
      } else {
        throw new Error('No init_point received from server');
      }
    } catch (error) {
      console.error('Error creating subscription:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao criar assinatura. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleResendEmail = () => {
    navigate('/cadastro');
  };

  const handleGoToLogin = () => {
    navigate('/login');
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <CardTitle className="text-destructive">Link Expirado</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={handleResendEmail} className="w-full">
              Solicitar Novo E-mail
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (hasActiveSubscription) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Crown className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-lg">Assinatura Ativa ✅</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Você já tem uma assinatura ativa do BeeWise Pro.
            </p>
            <Button onClick={handleGoToLogin} className="w-full">
              Ir para Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-4xl space-y-6">
        <Card className="w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Escolha seu Plano</CardTitle>
            <p className="text-muted-foreground">
              Complete seu cadastro para acessar o BeeWise Pro
            </p>
          </CardHeader>
          <CardContent>
            <RadioGroup value={selectedPlan} onValueChange={(value) => setSelectedPlan(value as 'mensal' | 'anual')}>
              <div className="grid md:grid-cols-2 gap-4">
                {/* Plano Mensal */}
                <Label htmlFor="mensal" className="cursor-pointer">
                  <Card className={`relative transition-all hover:shadow-md ${
                    selectedPlan === 'mensal' ? 'ring-2 ring-primary' : ''
                  }`}>
                    <CardHeader className="text-center pb-2">
                      <div className="flex items-center justify-center gap-2">
                        <RadioGroupItem value="mensal" id="mensal" />
                        <CardTitle className="text-lg">
                          BeeWise Pro - Mensal
                        </CardTitle>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="text-center space-y-4">
                      <div>
                        <div className="text-3xl font-bold">
                          R$ 19,90
                        </div>
                        <div className="text-sm text-muted-foreground">
                          /mês
                        </div>
                        <div className="text-sm text-green-600 font-medium mt-1">
                          Renovação automática todo mês
                        </div>
                      </div>

                      <div className="space-y-2 text-sm text-left">
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                          Recursos ilimitados
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                          Suporte prioritário
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                          Relatórios avançados
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                          Integração com Mercado Pago
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Label>

                {/* Plano Anual */}
                <Label htmlFor="anual" className="cursor-pointer">
                  <Card className={`relative transition-all hover:shadow-md ${
                    selectedPlan === 'anual' ? 'ring-2 ring-primary' : ''
                  }`}>
                    <CardHeader className="text-center pb-2">
                      <div className="flex items-center justify-center gap-2">
                        <RadioGroupItem value="anual" id="anual" />
                        <CardTitle className="text-lg">
                          BeeWise Pro - Anual
                        </CardTitle>
                      </div>
                      <Badge variant="secondary" className="mx-auto w-fit text-yellow-700 bg-yellow-100">
                        <Zap className="w-3 h-3 mr-1" />
                        Economize 25%
                      </Badge>
                    </CardHeader>
                    
                    <CardContent className="text-center space-y-4">
                      <div>
                        <div className="text-3xl font-bold">
                          R$ 14,90
                        </div>
                        <div className="text-sm text-muted-foreground">
                          /mês (R$ 178,80/ano)
                        </div>
                        <div className="text-sm text-green-600 font-medium mt-1">
                          Parcelamento em até 12x no cartão disponível no checkout
                        </div>
                      </div>

                      <div className="space-y-2 text-sm text-left">
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                          Recursos ilimitados
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                          Suporte prioritário
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                          Relatórios avançados
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                          Integração com Mercado Pago
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Label>
              </div>
            </RadioGroup>

            <div className="text-center mt-6">
              <Button 
                onClick={handleSubscribe} 
                disabled={isCreating}
                size="lg"
                className="w-full max-w-sm"
              >
                {isCreating ? (
                  <>
                    <LoadingSpinner />
                    Processando...
                  </>
                ) : (
                  selectedPlan === 'mensal' ? 'Assinar Mensal' : 'Assinar Anual'
                )}
              </Button>
              
              <p className="text-xs text-muted-foreground mt-2">
                Você será redirecionado para o Mercado Pago para finalizar o pagamento
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Subscribe;