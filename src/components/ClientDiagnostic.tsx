import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export function ClientDiagnostic() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const runDiagnostic = async () => {
    setLoading(true);
    setResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Não autenticado');
        return;
      }

      const testPayload = {
        cliente: {
          nome: 'Cliente Diagnóstico',
          telefone: '(11) 98765-4321',
          email: 'diagnostico@example.com',
          tipo_pessoa: 'cpf',
          cpf_cnpj: '',
          endereco: {
            cep: '',
            rua: '',
            numero: '',
            complemento: '',
            bairro: '',
            cidade: '',
            estado: ''
          }
        },
        recorrencia: null
      };

      const { data, error } = await supabase.functions.invoke('diag-create-client', {
        body: testPayload,
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        toast.error(`Erro ao executar diagnóstico: ${error.message}`);
        setResult({ ok: false, error: error.message });
        return;
      }

      setResult(data);
      
      if (data.ok) {
        toast.success('Diagnóstico concluído com sucesso!');
      } else {
        toast.error(`Diagnóstico falhou na etapa: ${data.stage}`);
      }
    } catch (error) {
      console.error('Erro no diagnóstico:', error);
      toast.error('Erro ao executar diagnóstico');
      setResult({ ok: false, error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  const runFullTest = async () => {
    setLoading(true);
    setResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Não autenticado');
        return;
      }

      const { data, error } = await supabase.functions.invoke('test-client-create-flow', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        toast.error(`Erro ao executar teste: ${error.message}`);
        setResult({ ok: false, error: error.message });
        return;
      }

      setResult(data);
      
      if (data.ok) {
        toast.success('Todos os testes passaram!');
      } else {
        toast.warning(`${data.results.summary.passed} de ${data.results.summary.total_tests} testes passaram`);
      }
    } catch (error) {
      console.error('Erro no teste:', error);
      toast.error('Erro ao executar teste');
      setResult({ ok: false, error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🔍 Diagnóstico de Cadastro de Clientes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            onClick={runDiagnostic}
            disabled={loading}
            variant="outline"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Teste Simples
          </Button>
          <Button
            onClick={runFullTest}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Teste Completo (3 cenários)
          </Button>
        </div>

        {result && (
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              {result.ok ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <span className="font-medium">
                Status: {result.ok ? 'Sucesso' : 'Falha'}
              </span>
            </div>

            {!result.ok && result.stage && (
              <div>
                <Badge variant="destructive">Etapa: {result.stage}</Badge>
              </div>
            )}

            {result.error && (
              <div className="bg-red-50 dark:bg-red-950/30 p-3 rounded border border-red-200 dark:border-red-800">
                <p className="text-sm font-medium text-red-800 dark:text-red-300">
                  Erro: {result.error.message || result.error}
                </p>
                {result.error.code && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    Código: {result.error.code}
                  </p>
                )}
                {result.error.hint && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    Dica: {result.error.hint}
                  </p>
                )}
              </div>
            )}

            {result.ok && result.cliente_id && (
              <div className="bg-green-50 dark:bg-green-950/30 p-3 rounded border border-green-200 dark:border-green-800">
                <p className="text-sm text-green-800 dark:text-green-300">
                  ✅ Cliente criado: {result.cliente_id}
                </p>
                {result.recurring_rule_id && (
                  <p className="text-sm text-green-800 dark:text-green-300 mt-1">
                    ✅ Regra de recorrência: {result.recurring_rule_id}
                  </p>
                )}
              </div>
            )}

            {result.results && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Resumo dos Testes:</span>
                  <Badge variant={result.ok ? 'default' : 'destructive'}>
                    {result.results.summary.passed}/{result.results.summary.total_tests} passaram
                  </Badge>
                </div>

                {result.results.summary.warnings && result.results.summary.warnings.length > 0 && (
                  <div className="space-y-1">
                    {result.results.summary.warnings.map((warning: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-2 text-sm">
                        <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
                        <span className="text-muted-foreground">{warning}</span>
                      </div>
                    ))}
                  </div>
                )}

                {result.counts && (
                  <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded border border-blue-200 dark:border-blue-800">
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                      Dados criados:
                    </p>
                    <ul className="text-sm text-blue-700 dark:text-blue-400 mt-1 space-y-1">
                      <li>• Dashboard: {result.counts.dashboard_clients} clientes</li>
                      <li>• Agenda: {result.counts.agenda_appointments} agendamentos</li>
                      <li>• Financeiro: {result.counts.financeiro_entries} lançamentos</li>
                    </ul>
                  </div>
                )}
              </div>
            )}

            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                Ver JSON completo
              </summary>
              <pre className="mt-2 p-2 bg-muted rounded overflow-auto max-h-96">
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
