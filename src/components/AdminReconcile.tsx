import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Play, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export const AdminReconcile = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const runReconciliation = async () => {
    setIsRunning(true);
    setResult(null);

    try {
      const adminToken = 'YOUR_ADMIN_SECRET_TOKEN_HERE'; // Replace with actual token
      
      const response = await fetch('https://obdwvgxxunkomacbifry.supabase.co/functions/v1/reconcile-subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Token': adminToken,
        },
        body: JSON.stringify({})
      });

      const data = await response.json();
      
      if (response.ok) {
        setResult(data.result);
        toast({
          title: "Reconciliação concluída",
          description: `${data.result.updated} perfis atualizados, ${data.result.unchanged} inalterados`,
        });
      } else {
        throw new Error(data.error || 'Erro na reconciliação');
      }
    } catch (error: any) {
      console.error('Reconciliation error:', error);
      toast({
        title: "Erro na reconciliação",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="w-5 h-5" />
          Admin: Reconciliação
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Execute uma vez para popular dados de trial e sincronizar status de assinatura.
        </p>
        
        <Button 
          onClick={runReconciliation}
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Executando...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Executar Reconciliação
            </>
          )}
        </Button>

        {result && (
          <div className="space-y-2 p-3 bg-muted rounded-md">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>Total de usuários: {result.total_users}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-blue-600" />
              <span>Atualizados: {result.updated}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-gray-600" />
              <span>Inalterados: {result.unchanged}</span>
            </div>
            {result.errors.length > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span>Erros: {result.errors.length}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};