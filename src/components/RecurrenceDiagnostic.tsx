import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { formatWeekdays } from '@/utils/weekdays';

export function RecurrenceDiagnostic() {
  const [rules, setRules] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load recurring rules
      const { data: rulesData } = await supabase
        .from('recurring_rules')
        .select('*, clientes(nome)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Load appointments from recurring rules
      const { data: appointmentsData } = await supabase
        .from('atendimentos')
        .select('*')
        .eq('user_id', user.id)
        .not('recurring_rule_id', 'is', null)
        .gte('start_at_utc', new Date().toISOString())
        .order('start_at_utc', { ascending: true })
        .limit(20);

      setRules(rulesData || []);
      setAppointments(appointmentsData || []);
    } catch (error) {
      console.error('Erro ao carregar diagnóstico:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const materializeAll = async () => {
    try {
      const { error } = await supabase.functions.invoke('materialize-recurring');
      if (error) {
        console.error('Erro ao materializar:', error);
      } else {
        await loadData();
      }
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  if (loading) return <div className="p-4">Carregando diagnóstico...</div>;

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Diagnóstico de Recorrência</CardTitle>
            <Button onClick={materializeAll} size="sm" variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Materializar Tudo
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">Regras de Recorrência ({rules.length})</h3>
            {rules.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma regra cadastrada</p>
            ) : (
              <div className="space-y-2">
                {rules.map((rule: any) => (
                  <div key={rule.id} className="border p-3 rounded text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <strong>{rule.title || 'Sem título'}</strong>
                      <Badge variant={rule.active ? 'default' : 'secondary'}>
                        {rule.active ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </div>
                    <div className="text-muted-foreground space-y-1">
                      <p>Cliente: {rule.clientes?.nome || 'N/A'}</p>
                      <p>Dias: {formatWeekdays(rule.weekdays)}</p>
                      <p>Horário: {rule.time_local}</p>
                      <p>Período: {rule.start_date} até {rule.end_date || 'indeterminado'}</p>
                      <p>Intervalo: {rule.interval_weeks} semana(s)</p>
                      <p className="text-xs">ID: {rule.id}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="font-medium mb-2">Agendamentos Recorrentes Futuros ({appointments.length})</h3>
            {appointments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum agendamento recorrente futuro</p>
            ) : (
              <div className="space-y-2">
                {appointments.map((apt: any) => (
                  <div key={apt.id} className="border p-2 rounded text-sm">
                    <div className="flex items-center justify-between">
                      <span>{apt.data} às {apt.hora}</span>
                      <Badge variant="outline">{apt.servico}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Rule ID: {apt.recurring_rule_id?.slice(0, 8)}...
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded p-3">
            <p className="text-sm text-yellow-800 dark:text-yellow-300">
              <strong>Debug Info:</strong><br />
              - Regras ativas: {rules.filter(r => r.active).length}<br />
              - Agendamentos futuros: {appointments.length}<br />
              - Última atualização: {new Date().toLocaleTimeString()}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
