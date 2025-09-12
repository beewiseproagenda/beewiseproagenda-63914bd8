import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Check, Crown, Zap, AlertCircle, LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const EDGE = 'https://obdwvgxxunkomacbifry.supabase.co/functions/v1';
const Subscribe = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading, session } = useAuth();
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

  const didAuthPing = useRef(false);

  useEffect(() => {
    if (authLoading || didAuthPing.current) return;
    if (!session?.access_token) return;

    didAuthPing.current = true;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('auth-ping', {
          headers: { 'x-origin': window.location.origin }
        });
        console.log('[Subscribe] auth-ping result', { data, error });
      } catch (err) {
        console.error('[Subscribe] auth-ping failed', err);
      }
    })();
  }, [authLoading, session?.access_token]);

  async function callCreateSubscription(plan: 'monthly'|'annual') {
    try {
      // garantir sessão válida
      try { await supabase.auth.refreshSession(); } catch {}
      const { data: s } = await supabase.auth.getSession();
      if (!s?.session?.access_token) { 
        alert('Faça login para assinar.'); 
        return { ok:false, reason:'NO_SESSION' }; 
      }

      // log NÃO PII
      console.log('[SUBSCRIBE] token_present=true, plan=', plan);

      const { data, error } = await supabase.functions.invoke('create-subscription', {
        body: { plan, userEmail: s.session.user.email },
        headers: { 'x-origin': window.location.origin }
      });

      if (error) {
        alert(`Falha: ${error.message}`);
        return { ok: false, reason: 'ERROR', error };
      } else if (data?.init_point) {
        window.location.href = data.init_point;
        return { ok: true, data };
      } else {
        alert(`Falha: resposta sem init_point (${JSON.stringify(data)})`);
        return { ok: false, reason: 'NO_INIT_POINT', data };
      }
    } catch (e:any) {
      console.error('[SUBSCRIBE ERROR]', e);
      alert(`Erro de rede: ${e?.message||e}`);
      return { ok:false, reason:'NETWORK', message: e?.message||String(e) };
    }
  }

  const handleSubscribe = async () => {
    setIsCreating(true);
    const planValue = selectedPlan === 'mensal' ? 'monthly' : 'annual';
    const result = await callCreateSubscription(planValue);
    setIsCreating(false);
    return result;
  };

  const handleResendEmail = () => {
    navigate('/cadastro');
  };

  const handleGoToDashboard = () => {
    console.log('[Subscribe] handleGoToDashboard chamado', {
      hasToken: !!searchParams.get('ot'),
      hasUser: !!user,
      userEmailConfirmed: user?.email_confirmed_at ? 'confirmed' : 'not_confirmed',
      hasActiveSubscription,
      currentPath: window.location.pathname
    });
    
    // Se há token de onboarding mas usuário não está autenticado,
    // redireciona para login para completar a autenticação
    if (searchParams.get('ot') && !user) {
      console.log('[Subscribe] Token existe mas usuário não autenticado, indo para login');
      navigate('/login');
      return;
    }

    // Para usuários autenticados com assinatura ativa, ir direto para o dashboard
    console.log('[Subscribe] Usuário autenticado com assinatura ativa, navegando para /dashboard');
    navigate('/dashboard', { replace: true });
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
            <Button onClick={handleGoToDashboard} className="w-full">
              Ir para Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header isolado para página de assinatura */}
      <header className="h-16 border-b border-border backdrop-blur flex items-center px-4 bg-amber-400">
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-foreground">
            BeeWise - Assinar Plano
          </h1>
        </div>
        {userInfo && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.location.href = '/login'}
            className="text-foreground hover:bg-background/10"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        )}
      </header>

      {/* Conteúdo principal */}
      <div className="flex-1 flex items-center justify-center p-4">
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
                       <div className="mt-2">
                         <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                           💳 PIX, Boleto e Cartão até 12x
                         </span>
                       </div>
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
                           PIX, Boleto e Cartão aceitos
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
                disabled={isCreating || !session?.access_token}
                size="lg"
                className="w-full max-w-sm"
              >
                {isCreating ? (
                  <>
                    <LoadingSpinner />
                    Processando...
                  </>
                ) : !session?.access_token ? (
                  'Faça login para continuar'
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
    </div>
  );
};

export default Subscribe;