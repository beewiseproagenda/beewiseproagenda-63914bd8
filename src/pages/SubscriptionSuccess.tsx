import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useAuthAndSubscription } from '@/hooks/useAuthAndSubscription';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Clock, Home } from 'lucide-react';

export const SubscriptionSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { subscription } = useAuthAndSubscription();
  const queryClient = useQueryClient();
  const [isPolling, setIsPolling] = useState(true);
  const [pollCount, setPollCount] = useState(0);

  const status = searchParams.get('status');
  const paymentId = searchParams.get('payment_id');
  const preapprovalId = searchParams.get('preapproval_id');

  // Auto-redirect if subscription is already active
  useEffect(() => {
    if (subscription.active) {
      navigate('/dashboard', { replace: true });
    }
  }, [subscription.active, navigate]);

  const refetch = async () => {
    await queryClient.invalidateQueries({ queryKey: ['subscription'] });
  };

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
  }, [status, paymentId, preapprovalId, toast]);

  useEffect(() => {
    // Poll subscription status until authorized or max attempts reached
    if (!subscription.active && isPolling && pollCount < 30) {
      const interval = setInterval(() => {
        refetch();
        setPollCount(prev => prev + 1);
      }, 2000); // Poll every 2 seconds

      return () => clearInterval(interval);
    } else {
      setIsPolling(false);
    }
  }, [subscription.active, isPolling, pollCount]);

  const handleGoToDashboard = async () => {
    // Garante dados atualizados e navegação definitiva
    await queryClient.invalidateQueries({ queryKey: ['subscription'] });
    navigate('/dashboard', { replace: true });
  };

  const handleTryAgain = () => {
    navigate('/assinar');
  };

  const getStatusIcon = () => {
    if (subscription.active) {
      return <CheckCircle className="w-16 h-16 text-green-600" />;
    } else if (subscription.status === 'pending') {
      return <Clock className="w-16 h-16 text-orange-600" />;
    } else {
      return <Clock className="w-16 h-16 text-gray-600" />;
    }
  };

  const getStatusTitle = () => {
    if (subscription.active) {
      return 'Assinatura Ativada!';
    } else if (subscription.status === 'pending') {
      return 'Processando Pagamento';
    } else {
      return 'Pagamento Recebido';
    }
  };

  const getStatusDescription = () => {
    if (subscription.active) {
      return 'Sua assinatura BeeWise Pro foi ativada com sucesso. Aproveite todos os recursos!';
    } else if (subscription.status === 'pending') {
      return 'Seu pagamento foi recebido e está sendo processado. Aguarde a confirmação.';
    } else {
      return 'Pagamento recebido ou em processamento. Seu acesso será liberado em instantes.';
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'active': return 'Ativa';
      case 'pending': return 'Pendente';
      case 'cancelled': return 'Cancelada';
      case 'rejected': return 'Rejeitada';
      default: return 'Aguardando';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            {isPolling && !subscription.active ? (
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
          {subscription.status && subscription.status !== 'none' && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium">
                Status: {getStatusText(subscription.status)}
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

          {subscription.active && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800 font-medium">
                🎉 Bem-vindo ao BeeWise Pro!
              </p>
              <p className="text-xs text-green-700 mt-1">
                Agora você tem acesso completo a todos os recursos.
              </p>
            </div>
          )}

          {subscription.status === 'pending' && isPolling && (
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
            <Button onClick={handleGoToDashboard} className="w-full">
              <Home className="w-4 h-4 mr-2" />
              Ir para Dashboard
            </Button>
            
            {(status === 'rejected' || status === 'cancelled' || 
              subscription.status === 'rejected' || 
              subscription.status === 'cancelled') && (
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