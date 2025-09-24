import { useAuthAndSubscription } from '@/hooks/useAuthAndSubscription';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, XCircle, Calendar } from 'lucide-react';

export const TrialStatus = () => {
  const { loading, user, subscriptionStatus, trial } = useAuthAndSubscription();

  if (loading || !user) return null;

  return (
    <Card className="w-full max-w-md border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Status do Trial
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Assinatura:</span>
          <Badge variant={subscriptionStatus === 'active' ? 'default' : 'secondary'}>
            {subscriptionStatus}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Days Left:</span>
          <span className="text-sm font-mono">{trial.daysLeft}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Trial Expired:</span>
          {trial.expired ? (
            <XCircle className="w-4 h-4 text-red-600" />
          ) : (
            <CheckCircle className="w-4 h-4 text-green-600" />
          )}
        </div>
        
        {trial.expiresAt && (
          <div className="text-xs text-muted-foreground">
            <Calendar className="w-3 h-3 inline mr-1" />
            Expira: {new Date(trial.expiresAt).toLocaleDateString('pt-BR')}
          </div>
        )}
      </CardContent>
    </Card>
  );
};