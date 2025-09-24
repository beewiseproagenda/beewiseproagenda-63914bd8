import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
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
  const { status: authStatus, hasActive, subscription } = useAuthAndSubscription();
  const queryClient = useQueryClient();
  const [isPolling, setIsPolling] = useState(true);
  const [pollCount, setPollCount] = useState(0);

  const status = searchParams.get('status');
  const paymentId = searchParams.get('payment_id');
  const preapprovalId = searchParams.get('preApproval_id');

  // Auto-redirect quando tem assinatura ativa - não renderizar nada
  useEffect(() => {
    if (authStatus === 'ready' && hasActive) {
      navigate('/dashboard', { replace: true });
    }
  }, [authStatus, hasActive, navigate]);

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
    if (!hasActive && isPolling && pollCount < 30) {
      const interval = setInterval(() => {
        refetch();
        setPollCount(prev => prev + 1);
      }, 2000); // Poll every 2 seconds

      return () => clearInterval(interval);
    } else {
      setIsPolling(false);
    }
  }, [hasActive, isPolling, pollCount]);

  const handleGoToDashboard = useCallback(() => {
    try {
      // 1) SPA replace (evita voltar para esta página)
      navigate('/dashboard', { replace: true });
      // 2) Fallback para iOS/Safari caso um guard tente bloquear no mesmo tick
      setTimeout(() => {
        if (window.location.pathname !== '/dashboard') {
          window.location.assign('/dashboard');
        }
      }, 120);
    } catch {
      window.location.assign('/dashboard');
    }
  }, [navigate]);

  const handleTryAgain = () => {
    navigate('/assinar');
  };

  const getStatusIcon = () => {
    if (hasActive) {
      return <CheckCircle className="w-16 h-16 text-green-600" />;
    } else if (subscription.status === 'pending') {
      return <Clock className="w-16 h-16 text-orange-600" />;
    } else {
      return <Clock className="w-16 h-16 text-gray-600" />;
    }
  };

  const getStatusTitle = () => {
    if (hasActive) {
      return 'Assinatura Ativada!';
    } else if (subscription.status === 'pending') {
      return 'Processando Pagamento';
    } else {
      return 'Pagamento Recebido';
    }
  };

  const getStatusDescription = () => {
    if (hasActive) {
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

  // Se já tem assinatura ativa, mostrar apenas spinner e redirecionar
  if (authStatus === 'ready' && hasActive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner />
      </div>
    );
  }

  // Se ainda carregando status, mostrar spinner
  if (authStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            {isPolling && !hasActive ? (
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