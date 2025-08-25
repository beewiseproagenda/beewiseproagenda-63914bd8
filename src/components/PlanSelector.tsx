import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/hooks/use-toast';
import { Check, Crown, Zap } from 'lucide-react';

export const PlanSelector = () => {
  const [selectedPlan, setSelectedPlan] = useState<'mensal' | 'anual'>('mensal');
  const [isCreating, setIsCreating] = useState(false);
  const { plans, currentSubscription, createSubscription, formatPrice, getStatusText, isActiveSubscription } = useSubscription();
  const { toast } = useToast();

  const handleSubscribe = async () => {
    try {
      setIsCreating(true);
      const result = await createSubscription(selectedPlan);
      
      if (result?.init_point) {
        // Redirecionar para o Mercado Pago
        window.location.href = result.init_point;
      } else {
        throw new Error('Erro ao criar assinatura');
      }
    } catch (error) {
      console.error('Error creating subscription:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao criar assinatura. Tente novamente.',
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
        <h2 className="text-2xl font-bold">Escolha seu plano</h2>
        <p className="text-muted-foreground">
          Desbloqueie todo o potencial do BeeWise Pro
        </p>
      </div>

      <RadioGroup value={selectedPlan} onValueChange={(value) => setSelectedPlan(value as 'mensal' | 'anual')}>
        <div className="grid md:grid-cols-2 gap-4">
          {plans.map((plan) => (
            <Label key={plan.code} htmlFor={plan.code} className="cursor-pointer">
              <Card className={`relative transition-all hover:shadow-md ${
                selectedPlan === plan.code ? 'ring-2 ring-primary' : ''
              }`}>
                <CardHeader className="text-center pb-2">
                  <div className="flex items-center justify-center gap-2">
                    <RadioGroupItem value={plan.code} id={plan.code} />
                    <CardTitle className="text-lg">
                      BeeWise Pro - {plan.code === 'mensal' ? 'Mensal' : 'Anual'}
                    </CardTitle>
                  </div>
                  {plan.code === 'anual' && (
                    <Badge variant="secondary" className="mx-auto w-fit">
                      <Zap className="w-3 h-3 mr-1" />
                      Mais popular
                    </Badge>
                  )}
                </CardHeader>
                
                <CardContent className="text-center space-y-4">
                  <div>
                    <div className="text-3xl font-bold">
                      {formatPrice(plan.price_cents)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      /{plan.interval === 'month' ? 'mês' : 'ano'}
                    </div>
                    {plan.code === 'anual' && (
                      <div className="text-xs text-green-600 font-medium mt-1">
                        12x no cartão no checkout
                      </div>
                    )}
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
          ))}
        </div>
      </RadioGroup>

      <div className="text-center">
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
            'Assinar agora'
          )}
        </Button>
        
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