
import { DollarSign, TrendingUp, Calendar, Users, Target, PiggyBank, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { DashboardCard } from "@/components/DashboardCard";
import { FinancialChart } from "@/components/FinancialChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMobData } from "@/hooks/useMobData";
import { useState } from "react";

export default function Dashboard() {
  const { dadosFinanceiros, atendimentos, clientes } = useMobData();
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Preparar dados para o gráfico
  const chartData = dadosFinanceiros.historicoMensal.map(item => ({
    ...item,
    lucro: item.receita - item.despesas
  }));

  // Atendimentos do mês atual
  const agora = new Date();
  const atendimentosMesAtual = atendimentos.filter(a => {
    const dataAtendimento = new Date(a.data);
    return dataAtendimento.getMonth() === agora.getMonth() && 
           dataAtendimento.getFullYear() === agora.getFullYear();
  }).length;

  // Próximos atendimentos (próximos 7 dias)
  const proximosSete = new Date();
  proximosSete.setDate(proximosSete.getDate() + 7);
  
  const proximosAtendimentos = atendimentos
    .filter(a => {
      const dataAtendimento = new Date(a.data);
      return dataAtendimento >= agora && 
             dataAtendimento <= proximosSete && 
             a.status === 'agendado';
    })
    .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())
    .slice(0, 5);

  // Agendamentos do dia atual
  const hoje = new Date();
  const agendamentosHoje = atendimentos
    .filter(a => {
      const dataAtendimento = new Date(a.data);
      return dataAtendimento.toDateString() === hoje.toDateString() && 
             a.status === 'agendado';
    })
    .sort((a, b) => a.hora.localeCompare(b.hora));

  // Função para obter semana atual com offset
  const getWeekDays = (offset: number) => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + (offset * 7));
    
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      weekDays.push(day);
    }
    return weekDays;
  };

  const weekDays = getWeekDays(currentWeekOffset);
  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // Função para obter agendamentos de um dia específico
  const getAgendamentosDoDia = (data: Date) => {
    return atendimentos.filter(a => {
      const dataAtendimento = new Date(a.data);
      return dataAtendimento.toDateString() === data.toDateString() && 
             a.status === 'agendado';
    }).sort((a, b) => a.hora.localeCompare(b.hora));
  };

  return (
    <div className="space-y-8 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Bem-vindo ao seu painel de controle
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString('pt-BR', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
      </div>

      {/* Agendamentos do Dia Atual */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Agendamentos de Hoje
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {agendamentosHoje.length > 0 ? (
              agendamentosHoje.map((agendamento) => (
                <div key={agendamento.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-primary">
                      <Clock className="h-4 w-4" />
                      <span className="font-medium">{agendamento.hora}</span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{agendamento.clienteNome}</p>
                      <p className="text-sm text-muted-foreground">{agendamento.servico}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-foreground">{formatCurrency(agendamento.valor)}</p>
                    <p className="text-xs text-muted-foreground">{agendamento.formaPagamento}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum agendamento para hoje</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Calendário Semanal */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Calendário Semanal
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentWeekOffset(currentWeekOffset - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[120px] text-center">
                {weekDays[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} - {weekDays[6].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentWeekOffset(currentWeekOffset + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day, index) => {
              const agendamentosDoDia = getAgendamentosDoDia(day);
              const isToday = day.toDateString() === hoje.toDateString();
              
              return (
                <div
                  key={day.toISOString()}
                  className={`p-3 rounded-lg border min-h-[120px] ${
                    isToday 
                      ? 'bg-primary/10 border-primary/20' 
                      : 'bg-muted/20 border-border'
                  }`}
                >
                  <div className="text-center mb-2">
                    <p className="text-xs text-muted-foreground">{diasSemana[index]}</p>
                    <p className={`text-sm font-medium ${isToday ? 'text-primary' : 'text-foreground'}`}>
                      {day.getDate()}
                    </p>
                  </div>
                  <div className="space-y-1">
                    {agendamentosDoDia.slice(0, 3).map((agendamento) => (
                      <div
                        key={agendamento.id}
                        className="text-xs p-1 bg-primary/20 rounded text-primary-foreground truncate"
                        title={`${agendamento.hora} - ${agendamento.clienteNome} - ${agendamento.servico}`}
                      >
                        <div className="font-medium">{agendamento.hora}</div>
                        <div className="truncate">{agendamento.clienteNome}</div>
                      </div>
                    ))}
                    {agendamentosDoDia.length > 3 && (
                      <div className="text-xs text-muted-foreground text-center">
                        +{agendamentosDoDia.length - 3} mais
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Cards de métricas principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          title="Receita do Mês"
          value={formatCurrency(dadosFinanceiros.receitaMesAtual)}
          icon={DollarSign}
          description="Receita atual do mês"
          change={{
            value: dadosFinanceiros.receitaMesAtual >= dadosFinanceiros.receitaMediaMensal 
              ? "↗ Acima da média" 
              : "↘ Abaixo da média",
            type: dadosFinanceiros.receitaMesAtual >= dadosFinanceiros.receitaMediaMensal 
              ? 'positive' 
              : 'negative'
          }}
        />
        
        <DashboardCard
          title="Lucro Líquido"
          value={formatCurrency(dadosFinanceiros.lucroLiquido)}
          icon={TrendingUp}
          description="Receita - Despesas"
          change={{
            value: dadosFinanceiros.lucroLiquido > 0 ? "↗ Positivo" : "↘ Negativo",
            type: dadosFinanceiros.lucroLiquido > 0 ? 'positive' : 'negative'
          }}
        />
        
        <DashboardCard
          title="Atendimentos"
          value={atendimentosMesAtual.toString()}
          icon={Calendar}
          description="Atendimentos este mês"
        />
        
        <DashboardCard
          title="Clientes Ativos"
          value={clientes.length.toString()}
          icon={Users}
          description="Total de clientes cadastrados"
        />
      </div>

      {/* Gráfico e próximos atendimentos */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Evolução Financeira
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FinancialChart data={chartData} type="line" />
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Próximos Atendimentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {proximosAtendimentos.length > 0 ? (
                proximosAtendimentos.map((atendimento) => (
                  <div key={atendimento.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{atendimento.clienteNome}</p>
                      <p className="text-xs text-muted-foreground">{atendimento.servico}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium">
                        {new Date(atendimento.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                      </p>
                      <p className="text-xs text-muted-foreground">{atendimento.hora}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhum atendimento agendado</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cards de métricas secundárias */}
      <div className="grid gap-4 md:grid-cols-2">
        <DashboardCard
          title="Média Mensal"
          value={formatCurrency(dadosFinanceiros.receitaMediaMensal)}
          icon={Target}
          description="Receita média dos últimos meses"
        />
        
        <DashboardCard
          title="Projeção Próximo Mês"
          value={formatCurrency(dadosFinanceiros.projecaoProximoMes)}
          icon={PiggyBank}
          description="Baseada nas últimas 4 semanas"
        />
      </div>
    </div>
  );
}
