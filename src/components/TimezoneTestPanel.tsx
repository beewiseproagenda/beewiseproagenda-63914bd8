// Test panel for timezone functionality - remove in production
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { browserTz, toUTCFromLocal, fmt, utcToViewer } from '@/utils/datetime';
import { useSupabaseData } from '@/hooks/useSupabaseData';

export function TimezoneTestPanel() {
  const [testDate, setTestDate] = useState('2025-09-23');
  const [testTime, setTestTime] = useState('13:00');
  const [results, setResults] = useState<any>(null);
  const { adicionarAtendimento, clientes, servicosPacotes } = useSupabaseData();

  const runTest = () => {
    const userTz = browserTz();
    const utcDate = toUTCFromLocal(testDate, testTime, userTz);
    const backToViewer = utcToViewer(utcDate, userTz);
    
    setResults({
      inputDate: testDate,
      inputTime: testTime,
      userTz,
      utcDate: utcDate.toISOString(),
      backToViewer: {
        date: fmt(backToViewer, userTz, 'DATE'),
        time: fmt(backToViewer, userTz, 'TIME'),
        datetime: fmt(backToViewer, userTz, 'DATETIME')
      }
    });
  };

  const createTestAppointment = async () => {
    if (clientes.length === 0 || servicosPacotes.length === 0) {
      alert('Precisa ter pelo menos 1 cliente e 1 serviço cadastrado para testar');
      return;
    }

    try {
      const userTz = browserTz();
      const utcDate = toUTCFromLocal(testDate, testTime, userTz);
      const endAt = new Date(utcDate);
      endAt.setHours(endAt.getHours() + 1);

      const testData = {
        data: testDate,
        hora: testTime,
        cliente_id: clientes[0].id,
        servico: servicosPacotes[0].nome,
        valor: servicosPacotes[0].valor,
        valor_total: servicosPacotes[0].valor,
        forma_pagamento: 'pix' as const,
        observacoes: 'Teste de timezone',
        status: 'agendado' as const,
        start_at_utc: utcDate.toISOString(),
        end_at: endAt.toISOString(),
        tz: userTz,
        occurrence_date: null,
        recurring_rule_id: null,
        rule_id: null,
        // Campos de competência/recebimento
        competencia_date: testDate,
        recebimento_previsto: testDate
      };

      await adicionarAtendimento(testData);
      alert('Agendamento de teste criado com sucesso!');
    } catch (error) {
      console.error('Erro ao criar agendamento de teste:', error);
      alert('Erro ao criar agendamento de teste');
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Teste de Timezone - Development Only</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="testDate">Data</Label>
            <Input
              id="testDate"
              type="date"
              value={testDate}
              onChange={(e) => setTestDate(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="testTime">Hora</Label>
            <Input
              id="testTime"
              type="time"
              value={testTime}
              onChange={(e) => setTestTime(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={runTest}>Testar Conversão</Button>
          <Button onClick={createTestAppointment} variant="outline">
            Criar Agendamento Teste
          </Button>
        </div>

        {results && (
          <div className="bg-muted p-4 rounded-md">
            <h4 className="font-medium mb-2">Resultados:</h4>
            <pre className="text-sm">{JSON.stringify(results, null, 2)}</pre>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          Timezone atual: {browserTz()}
        </div>
      </CardContent>
    </Card>
  );
}