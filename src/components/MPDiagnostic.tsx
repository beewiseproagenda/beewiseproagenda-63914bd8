import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function MPDiagnostic() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  const runDiagnostic = async () => {
    setLoading(true);
    setResults(null);

    try {
      // Test mp-methods function
      console.log('Testing mp-methods...');
      const { data: methodsData, error: methodsError } = await supabase.functions.invoke('mp-methods');
      
      if (methodsError) {
        console.error('mp-methods error:', methodsError);
        toast.error('Erro ao verificar métodos de pagamento');
        return;
      }

      console.log('mp-methods result:', methodsData);

      // Test create-subscription for annual plan
      console.log('Testing create-subscription (annual)...');
      const { data: subscriptionData, error: subscriptionError } = await supabase.functions.invoke('create-subscription', {
        body: {
          plan: 'annual',
          userEmail: 'test@beewise.com.br'
        }
      });

      if (subscriptionError) {
        console.error('create-subscription error:', subscriptionError);
      }

      console.log('create-subscription result:', subscriptionData);

      // Get recent subscriptions from database
      const { data: recentSubs } = await supabase
        .from('mp_subscriptions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);

      const diagnosticResults = {
        methods: methodsData,
        subscription: subscriptionData,
        subscriptionError: subscriptionError?.message,
        recentSubs: recentSubs || []
      };

      setResults(diagnosticResults);

      // Check if PIX is disabled
      if (methodsData && !methodsData.pix_available) {
        toast.error('PIX_DESABILITADO_NA_CONTA — o coletor não tem PIX habilitado. Ativar no Mercado Pago: Seu Negócio > Meios de pagamento aceitos > habilitar PIX.');
      } else {
        toast.success('Diagnóstico completo!');
      }

    } catch (error) {
      console.error('Diagnostic error:', error);
      toast.error('Erro no diagnóstico');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Diagnóstico MercadoPago - Plano Anual
          <Button onClick={runDiagnostic} disabled={loading}>
            {loading ? 'Executando...' : 'Executar Diagnóstico'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {results && (
          <>
            {/* Payment Methods Availability */}
            <div>
              <h3 className="font-semibold mb-2">Métodos de Pagamento Disponíveis</h3>
              <div className="flex gap-2 mb-2">
                <Badge variant={results.methods?.pix_available ? 'default' : 'destructive'}>
                  PIX: {results.methods?.pix_available ? 'Habilitado' : 'Desabilitado'}
                </Badge>
                <Badge variant={results.methods?.boleto_available ? 'default' : 'destructive'}>
                  Boleto: {results.methods?.boleto_available ? 'Habilitado' : 'Desabilitado'}
                </Badge>
                <Badge variant={results.methods?.credit_card_available ? 'default' : 'destructive'}>
                  Cartão: {results.methods?.credit_card_available ? 'Habilitado' : 'Desabilitado'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Fonte: {results.methods?.source} | {results.methods?.notes}
              </p>
            </div>

            {/* Subscription Creation Result */}
            <div>
              <h3 className="font-semibold mb-2">Criação de Subscription Anual</h3>
              {results.subscriptionError ? (
                <Badge variant="destructive">Erro: {results.subscriptionError}</Badge>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Badge variant="default">
                      Kind: {results.subscription?.kind || 'N/A'}
                    </Badge>
                    <Badge variant={results.subscription?.saved ? 'default' : 'secondary'}>
                      Saved: {results.subscription?.saved ? 'Sim' : 'Não'}
                    </Badge>
                    {results.subscription?.retried && (
                      <Badge variant="secondary">Retried: Sim</Badge>
                    )}
                  </div>
                  {results.subscription?.init_point && (
                    <div>
                      <p className="text-sm">
                        <strong>Init Point:</strong>{' '}
                        <a 
                          href={results.subscription.init_point} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {results.subscription.init_point.substring(0, 50)}...
                        </a>
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Recent Subscriptions */}
            <div>
              <h3 className="font-semibold mb-2">Subscriptions Recentes</h3>
              <div className="space-y-2">
                {results.recentSubs?.map((sub: any) => (
                  <div key={sub.id} className="text-sm p-2 border rounded">
                    <div className="flex gap-2">
                      <Badge variant="outline">{sub.plan}</Badge>
                      <Badge variant={sub.status === 'pending' ? 'secondary' : 'default'}>
                        {sub.status}
                      </Badge>
                    </div>
                    <p>External Ref: {sub.external_reference}</p>
                    {sub.mp_preference_id && (
                      <p>Preference ID: {sub.mp_preference_id}</p>
                    )}
                    {sub.mp_preapproval_id && (
                      <p>Preapproval ID: {sub.mp_preapproval_id}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Raw JSON Response */}
            <div>
              <h3 className="font-semibold mb-2">Dados Completos (JSON)</h3>
              <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-64">
                {JSON.stringify(results, null, 2)}
              </pre>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}