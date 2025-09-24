import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getFreemiumConfig } from '@/config/freemium';
import { CheckCircle, XCircle } from 'lucide-react';

const FreemiumConfig = () => {
  const config = getFreemiumConfig();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {config.freemium_mode ? (
              <CheckCircle className="w-6 h-6 text-green-600" />
            ) : (
              <XCircle className="w-6 h-6 text-red-600" />
            )}
            Status do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Modo Freemium:</span>
              <Badge variant={config.freemium_mode ? 'default' : 'secondary'}>
                {config.freemium_mode ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Billing desabilitado:</span>
              <Badge variant={config.billing_calls_disabled ? 'default' : 'secondary'}>
                {config.billing_calls_disabled ? 'Sim' : 'Não'}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Redirecionamento /assinar:</span>
              <Badge variant={config.assinar_redirects_to_dashboard ? 'default' : 'secondary'}>
                {config.assinar_redirects_to_dashboard ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Paywall desabilitado:</span>
              <Badge variant={config.paywall_overlay_disabled ? 'default' : 'secondary'}>
                {config.paywall_overlay_disabled ? 'Sim' : 'Não'}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Checks de assinatura ignorados:</span>
              <Badge variant={config.subscription_checks_bypassed ? 'default' : 'secondary'}>
                {config.subscription_checks_bypassed ? 'Sim' : 'Não'}
              </Badge>
            </div>
          </div>
          
          <div className="text-xs text-muted-foreground text-center mt-4">
            Para alterar essas configurações, edite o arquivo src/config/freemium.ts
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FreemiumConfig;