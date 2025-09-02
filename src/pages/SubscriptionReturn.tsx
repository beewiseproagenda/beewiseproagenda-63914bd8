import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const SubscriptionReturn = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'pending'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const processReturn = () => {
      const paymentId = searchParams.get('payment_id');
      const status = searchParams.get('status');
      const merchantOrder = searchParams.get('merchant_order_id');
      const preapprovalId = searchParams.get('preapproval_id');
      
      console.log('Mercado Pago return params:', {
        paymentId,
        status,
        merchantOrder,
        preapprovalId
      });

      if (status === 'approved' || preapprovalId) {
        setStatus('success');
        setMessage('Assinatura realizada com sucesso! Você agora tem acesso ao BeeWise Pro.');
      } else if (status === 'pending') {
        setStatus('pending');
        setMessage('Seu pagamento está sendo processado. Você receberá uma confirmação em breve.');
      } else if (status === 'rejected' || status === 'cancelled') {
        setStatus('error');
        setMessage('O pagamento foi cancelado ou rejeitado. Tente novamente.');
      } else {
        setStatus('error');
        setMessage('Ocorreu um erro no processamento do pagamento.');
      }
    };

    const timer = setTimeout(processReturn, 1000);
    return () => clearTimeout(timer);
  }, [searchParams]);

  const handleGoToDashboard = () => {
    navigate('/dashboard');
  };

  const handleTryAgain = () => {
    navigate('/subscribe');
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <LoadingSpinner />
              <p className="text-muted-foreground">
                Processando retorno do pagamento...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-16 h-16 text-green-600 mx-auto" />;
      case 'pending':
        return <AlertCircle className="w-16 h-16 text-yellow-600 mx-auto" />;
      case 'error':
        return <XCircle className="w-16 h-16 text-red-600 mx-auto" />;
      default:
        return null;
    }
  };

  const getTitle = () => {
    switch (status) {
      case 'success':
        return 'Pagamento Aprovado!';
      case 'pending':
        return 'Pagamento Pendente';
      case 'error':
        return 'Pagamento Não Processado';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {getIcon()}
          <CardTitle className="text-xl mt-4">
            {getTitle()}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            {message}
          </p>
          
          <div className="space-y-2">
            {status === 'success' && (
              <Button onClick={handleGoToDashboard} className="w-full">
                Ir para Dashboard
              </Button>
            )}
            
            {status === 'pending' && (
              <Button onClick={handleGoToDashboard} className="w-full">
                Verificar Status
              </Button>
            )}
            
            {status === 'error' && (
              <>
                <Button onClick={handleTryAgain} className="w-full">
                  Tentar Novamente
                </Button>
                <Button variant="outline" onClick={handleGoToDashboard} className="w-full">
                  Voltar ao Dashboard
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionReturn;