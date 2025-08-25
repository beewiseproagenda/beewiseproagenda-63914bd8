import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, Clock, Home } from 'lucide-react';

export const SubscriptionSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentSubscription, refetch, getStatusText, isActiveSubscription } = useSubscription();
  const [isPolling, setIsPolling] = useState(true);
  const [pollCount, setPollCount] = useState(0);

  const status = searchParams.get('status');
  const paymentId = searchParams.get('payment_id');
  const preapprovalId = searchParams.get('preapproval_id');

  useEffect(() => {
    // Show toast based on URL parameters
    if (status === 'approved') {
      toast({
        title: 'Pagamento aprovado!',
        description: 'Sua assinatura será ativada em instantes.',
      });
    } else if (status === 'pending') {
      toast({
        title: 'Pagamento em processamento',
        description: 'Aguardando confirmação do pagamento.',
        variant: 'default',
      });
    } else if (status === 'rejected' || status === 'cancelled') {
      toast({
        title: 'Pagamento não aprovado',
        description: 'Houve um problema com seu pagamento.',
        variant: 'destructive',
      });
    }

    // Initial fetch
    refetch();
  }, [status, paymentId, preapprovalId, toast, refetch]);

  useEffect(() => {
    // Poll subscription status until authorized or max attempts reached
    if (!isActiveSubscription && isPolling && pollCount < 30) {
      const interval = setInterval(() => {
        refetch();
        setPollCount(prev => prev + 1);
      }, 2000); // Poll every 2 seconds

      return () => clearInterval(interval);
    } else {
      setIsPolling(false);
    }
  }, [isActiveSubscription, isPolling, pollCount, refetch]);

  const handleReturnToDashboard = () => {
    navigate('/');
  };

  const handleTryAgain = () => {
    navigate('/cadastro');
  };

  const getStatusIcon = () => {
    if (isActiveSubscription) {
      return <CheckCircle className="w-16 h-16 text-green-600" />;
    } else if (currentSubscription?.status === 'pending') {
      return <Clock className="w-16 h-16 text-orange-600" />;
    } else {
      return <Clock className="w-16 h-16 text-gray-600" />;
    }
  };

  const getStatusTitle = () => {
    if (isActiveSubscription) {
      return 'Assinatura Ativada!';
    } else if (currentSubscription?.status === 'pending') {
      return 'Processando Pagamento';
    } else {
      return 'Pagamento Recebido';
    }
  };

  const getStatusDescription = () => {
    if (isActiveSubscription) {
      return 'Sua assinatura BeeWise Pro foi ativada com sucesso. Aproveite todos os recursos!';
    } else if (currentSubscription?.status === 'pending') {
      return 'Seu pagamento foi recebido e está sendo processado. Aguarde a confirmação.';
    } else {
      return 'Pagamento recebido ou em processamento. Seu acesso será liberado em instantes.';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            {isPolling && !isActiveSubscription ? (
              <LoadingSpinner />
            ) : (
              getStatusIcon()
            )}
          </div>
          <div>
            <CardTitle className="text-2xl mb-2">
              {getStatusTitle()}
            </CardTitle>
            <CardDescription className="text-base">
              {getStatusDescription()}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {currentSubscription && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium">
                Status: {getStatusText(currentSubscription.status)}
              </p>
              {paymentId && (
                <p className="text-xs text-muted-foreground mt-1">
                  ID do Pagamento: {paymentId}
                </p>
              )}
              {preapprovalId && (
                <p className="text-xs text-muted-foreground mt-1">
                  ID da Assinatura: {preapprovalId}
                </p>
              )}
            </div>
          )}

          {isActiveSubscription && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800 font-medium">
                🎉 Bem-vindo ao BeeWise Pro!
              </p>
              <p className="text-xs text-green-700 mt-1">
                Agora você tem acesso completo a todos os recursos.
              </p>
            </div>
          )}

          {currentSubscription?.status === 'pending' && isPolling && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-sm text-orange-800">
                ⏳ Aguardando confirmação...
              </p>
              <p className="text-xs text-orange-700 mt-1">
                Este processo pode levar alguns minutos.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button onClick={handleReturnToDashboard} className="w-full">
              <Home className="w-4 h-4 mr-2" />
              Ir para o Dashboard
            </Button>
            
            {(status === 'rejected' || status === 'cancelled' || 
              currentSubscription?.status === 'rejected' || 
              currentSubscription?.status === 'cancelled') && (
              <Button onClick={handleTryAgain} variant="outline" className="w-full">
                Tentar novamente
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};