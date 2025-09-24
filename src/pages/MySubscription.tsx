import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/hooks/use-toast';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { 
  Crown, 
  Calendar, 
  CreditCard, 
  AlertTriangle, 
  CheckCircle,
  XCircle,
  Clock,
  Settings
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FREEMIUM_MODE } from '@/config/freemium';
import { useNavigate } from 'react-router-dom';

export const MySubscription = () => {
  const navigate = useNavigate();
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // FREEMIUM MODE: Redirect to dashboard
  if (FREEMIUM_MODE) {
    navigate('/dashboard', { replace: true });
    return null;
  }
  const { 
    plans, 
    currentSubscription, 
    loading, 
    cancelSubscription, 
    formatPrice, 
    getStatusText, 
    isActiveSubscription 
  } = useSubscription();
  const { toast } = useToast();

  const currentPlan = plans.find(plan => plan.code === currentSubscription?.plan_code);

  const handleCancelSubscription = async () => {
    try {
      setIsCancelling(true);
      await cancelSubscription();
      toast({
        title: 'Assinatura cancelada',
        description: 'Sua assinatura foi cancelada com sucesso.',
      });
      setShowCancelDialog(false);
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao cancelar assinatura. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'authorized':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-orange-600" />;
      case 'cancelled':
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'authorized':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'cancelled':
      case 'rejected':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  if (!currentSubscription) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardHeader className="text-center">
            <Crown className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <CardTitle>Nenhuma assinatura ativa</CardTitle>
            <CardDescription>
              Você ainda não possui uma assinatura BeeWise Pro.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => window.location.href = '/cadastro'}>
              Assinar BeeWise Pro
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Crown className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Minha Assinatura</h1>
          <p className="text-muted-foreground">Gerencie sua assinatura BeeWise Pro</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5" />
                BeeWise Pro - {currentPlan?.code === 'mensal' ? 'Mensal' : 'Anual'}
              </CardTitle>
              <CardDescription>
                {currentPlan && formatPrice(currentPlan.price_cents)} / {currentPlan?.interval === 'month' ? 'mês' : 'ano'}
              </CardDescription>
            </div>
            <Badge variant={getStatusVariant(currentSubscription.status)} className="flex items-center gap-1">
              {getStatusIcon(currentSubscription.status)}
              {getStatusText(currentSubscription.status)}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                Iniciada em
              </div>
              <p className="font-medium">
                {format(new Date(currentSubscription.started_at), 'PPP', { locale: ptBR })}
              </p>
            </div>

            {currentSubscription.next_charge_at && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CreditCard className="w-4 h-4" />
                  Próxima cobrança
                </div>
                <p className="font-medium">
                  {format(new Date(currentSubscription.next_charge_at), 'PPP', { locale: ptBR })}
                </p>
              </div>
            )}

            {currentSubscription.cancelled_at && (
              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <XCircle className="w-4 h-4" />
                  Cancelada em
                </div>
                <p className="font-medium text-red-600">
                  {format(new Date(currentSubscription.cancelled_at), 'PPP', { locale: ptBR })}
                </p>
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              Recursos inclusos
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-3 h-3 text-green-600" />
                Recursos ilimitados
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-3 h-3 text-green-600" />
                Suporte prioritário
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-3 h-3 text-green-600" />
                Relatórios avançados
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-3 h-3 text-green-600" />
                Integração completa
              </div>
            </div>
          </div>

          {currentSubscription.status === 'pending' && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-orange-600 mt-0.5" />
                <div>
                  <p className="font-medium text-orange-800">
                    Pagamento em processamento
                  </p>
                  <p className="text-sm text-orange-700 mt-1">
                    Aguardando confirmação do pagamento. Isso pode levar alguns minutos.
                  </p>
                </div>
              </div>
            </div>
          )}

          {(currentSubscription.status === 'cancelled' || currentSubscription.status === 'rejected') && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800">
                    Assinatura inativa
                  </p>
                  <p className="text-sm text-red-700 mt-1">
                    Para regularizar sua assinatura, clique no botão abaixo.
                  </p>
                  <Button size="sm" className="mt-2" onClick={() => window.location.href = '/cadastro'}>
                    Regularizar assinatura
                  </Button>
                </div>
              </div>
            </div>
          )}

          {isActiveSubscription && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => setShowCancelDialog(true)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Settings className="w-4 h-4 mr-2" />
                Cancelar assinatura
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDeleteDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        onConfirm={handleCancelSubscription}
        title="Cancelar assinatura"
        message="Tem certeza que deseja cancelar sua assinatura? Você perderá acesso aos recursos premium."
      />
    </div>
  );
};