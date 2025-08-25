import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const PaymentReturn = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<'approved' | 'rejected' | 'pending' | 'cancelled' | null>(null);

  useEffect(() => {
    // Capturar parâmetros da URL do Mercado Pago
    const status = searchParams.get('status');
    const paymentId = searchParams.get('payment_id');
    const paymentType = searchParams.get('payment_type');
    const merchantOrder = searchParams.get('merchant_order_id');

    console.log('Payment return params:', { status, paymentId, paymentType, merchantOrder });

    // Determinar status do pagamento baseado nos parâmetros
    if (status === 'approved') {
      setPaymentStatus('approved');
      toast({
        title: "Pagamento Aprovado!",
        description: "Seu pagamento foi processado com sucesso. Aguarde a confirmação final.",
      });
    } else if (status === 'rejected') {
      setPaymentStatus('rejected');
      toast({
        title: "Pagamento Recusado",
        description: "Seu pagamento foi recusado. Tente novamente com outro método de pagamento.",
        variant: "destructive"
      });
    } else if (status === 'pending') {
      setPaymentStatus('pending');
      toast({
        title: "Pagamento Pendente",
        description: "Seu pagamento está sendo processado. Você receberá uma confirmação em breve.",
      });
    } else if (status === 'cancelled') {
      setPaymentStatus('cancelled');
      toast({
        title: "Pagamento Cancelado",
        description: "O pagamento foi cancelado. Você pode tentar novamente a qualquer momento.",
        variant: "destructive"
      });
    }

    setLoading(false);
  }, [searchParams, toast]);

  const getStatusIcon = () => {
    switch (paymentStatus) {
      case 'approved':
        return <CheckCircle className="h-16 w-16 text-green-500" />;
      case 'rejected':
      case 'cancelled':
        return <XCircle className="h-16 w-16 text-red-500" />;
      case 'pending':
        return <AlertCircle className="h-16 w-16 text-yellow-500" />;
      default:
        return <AlertCircle className="h-16 w-16 text-gray-500" />;
    }
  };

  const getStatusTitle = () => {
    switch (paymentStatus) {
      case 'approved':
        return 'Pagamento Aprovado!';
      case 'rejected':
        return 'Pagamento Recusado';
      case 'cancelled':
        return 'Pagamento Cancelado';
      case 'pending':
        return 'Pagamento Pendente';
      default:
        return 'Status do Pagamento';
    }
  };

  const getStatusDescription = () => {
    switch (paymentStatus) {
      case 'approved':
        return 'Seu pagamento foi processado com sucesso! Sua assinatura será ativada em instantes. Você receberá um email de confirmação.';
      case 'rejected':
        return 'Infelizmente seu pagamento foi recusado. Verifique os dados do seu cartão ou tente com outro método de pagamento.';
      case 'cancelled':
        return 'O pagamento foi cancelado. Você pode tentar novamente quando desejar.';
      case 'pending':
        return 'Seu pagamento está sendo processado. Aguarde a confirmação que pode levar alguns minutos. Você receberá um email assim que for confirmado.';
      default:
        return 'Não foi possível determinar o status do pagamento. Entre em contato com o suporte.';
    }
  };

  const handleReturnToDashboard = () => {
    navigate('/dashboard');
  };

  const handleTryAgain = () => {
    navigate('/configuracoes'); // Redirecionar para a página de configurações/assinatura
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {getStatusIcon()}
          </div>
          <CardTitle className="text-2xl">{getStatusTitle()}</CardTitle>
          <CardDescription className="text-center">
            {getStatusDescription()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col space-y-2">
            <Button
              onClick={handleReturnToDashboard}
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Dashboard
            </Button>
            
            {(paymentStatus === 'rejected' || paymentStatus === 'cancelled') && (
              <Button
                onClick={handleTryAgain}
                variant="outline"
                className="w-full"
              >
                Tentar Novamente
              </Button>
            )}
          </div>
          
          {paymentStatus === 'approved' && (
            <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-sm text-green-700 dark:text-green-300 text-center">
                <strong>Importante:</strong> O acesso completo será liberado após a confirmação final do pagamento pelo sistema.
              </p>
            </div>
          )}
          
          {paymentStatus === 'pending' && (
            <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <p className="text-sm text-yellow-700 dark:text-yellow-300 text-center">
                <strong>Atenção:</strong> Mantenha esta página favorita. Você pode verificar o status do pagamento a qualquer momento.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentReturn;