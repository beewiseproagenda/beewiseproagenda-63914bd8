import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Check, Crown, Zap } from 'lucide-react';

export const PlanSelector = () => {
  const [selectedPlan, setSelectedPlan] = useState<'mensal' | 'anual'>('mensal');
  const [isCreating, setIsCreating] = useState(false);
  const { user } = useAuth();
  const { plans, currentSubscription, createSubscription, formatPrice, getStatusText, isActiveSubscription } = useSubscription();
  const { toast } = useToast();

  // Verificar se o email foi confirmado
  const emailConfirmed = user?.email_confirmed_at !== null;

  const handleSubscribe = async () => {
    if (!emailConfirmed) {
      toast({
        title: 'Email não confirmado',
        description: 'Confirme seu email antes de assinar um plano.',
        variant: 'destructive',
      });
      return;
    }

    // Verificar novamente se já tem assinatura ativa
    if (isActiveSubscription) {
      toast({
        title: 'Assinatura já ativa',
        description: 'Você já possui uma assinatura ativa.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsCreating(true);
      console.log('Creating subscription:', { selectedPlan, userId: user?.id });
      
      const result = await createSubscription(selectedPlan);
      console.log('Subscription result:', result);
      
      if (result?.init_point) {
        console.log('Redirecting to Mercado Pago:', result.init_point);
        window.location.href = result.init_point;
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

  if (isActiveSubscription) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Crown className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-lg">BeeWise Pro</CardTitle>
          <CardDescription>
            {getStatusText(currentSubscription?.status || '')}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center justify-center gap-2">
              <Check className="w-4 h-4 text-green-600" />
              Recursos ilimitados
            </div>
            <div className="flex items-center justify-center gap-2">
              <Check className="w-4 h-4 text-green-600" />
              Suporte prioritário
            </div>
            <div className="flex items-center justify-center gap-2">
              <Check className="w-4 h-4 text-green-600" />
              Relatórios avançados
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Escolha seu Plano</h2>
      </div>

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

      <div className="text-center">
        <Button 
          onClick={handleSubscribe} 
          disabled={isCreating || !emailConfirmed}
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
        
        {!emailConfirmed && (
          <p className="text-sm text-amber-600 mt-2 font-medium">
            ⚠️ Confirme seu email para habilitar a assinatura
          </p>
        )}
        
        <p className="text-xs text-muted-foreground mt-2">
          Você será redirecionado para o Mercado Pago para finalizar o pagamento
        </p>
      </div>

      {currentSubscription && !isActiveSubscription && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-4">
            <div className="text-center text-sm">
              <p className="font-medium text-orange-800">
                {getStatusText(currentSubscription.status)}
              </p>
              {currentSubscription.status === 'pending' && (
                <p className="text-orange-600 mt-1">
                  Aguardando confirmação do pagamento
                </p>
              )}
              {(currentSubscription.status === 'cancelled' || currentSubscription.status === 'rejected') && (
                <p className="text-orange-600 mt-1">
                  Selecione um plano para regularizar sua assinatura
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};