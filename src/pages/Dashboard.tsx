import { DollarSign, TrendingUp, Calendar, Users, Target, PiggyBank, ChevronLeft, ChevronRight, Clock, BarChart3 } from "lucide-react";
import { DashboardCard } from "@/components/DashboardCard";
import { FinancialChart } from "@/components/FinancialChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

  // Cálculos para as métricas do Dashboard
  const agora = new Date();
  const mesAtual = agora.getMonth();
  const anoAtual = agora.getFullYear();

  // Clientes ativos (que possuem agendamentos no mês)
  const clientesAtivosNoMes = new Set(
    atendimentos
      .filter(a => {
        const dataAtendimento = new Date(a.data);
        return dataAtendimento.getMonth() === mesAtual && 
               dataAtendimento.getFullYear() === anoAtual;
      })
      .map(a => a.clienteId)
  ).size;

  // Atendimentos realizados no mês
  const atendimentosRealizados = atendimentos.filter(a => {
    const dataAtendimento = new Date(a.data);
    return dataAtendimento.getMonth() === mesAtual && 
           dataAtendimento.getFullYear() === anoAtual &&
           a.status === 'realizado';
  }).length;

  // Próximos agendamentos do mês
  const proximosAgendamentos = atendimentos.filter(a => {
    const dataAtendimento = new Date(a.data);
    return dataAtendimento.getMonth() === mesAtual && 
           dataAtendimento.getFullYear() === anoAtual &&
           a.status === 'agendado';
  }).length;

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
      return dataAtendimento.toDateString() === data.toDateString();
    }).sort((a, b) => a.hora.localeCompare(b.hora));
  };

  // Verificar se um dia é passado
  const isDiaPassed = (data: Date) => {
    return data < hoje;
  };

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
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
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-primary" />
            Agendamentos de Hoje
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            {agendamentosHoje.length > 0 ? (
              agendamentosHoje.map((agendamento) => (
                <div key={agendamento.id} className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/10">
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
              <div className="text-center py-6">
                <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhum agendamento para hoje</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Calendário Semanal */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-primary" />
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
        <CardContent className="pt-0">
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day, index) => {
              const agendamentosDoDia = getAgendamentosDoDia(day);
              const isToday = day.toDateString() === hoje.toDateString();
              const isPast = isDiaPassed(day) && !isToday;
              
              return (
                <div
                  key={day.toISOString()}
                  className={`p-3 rounded-lg border min-h-[120px] cursor-pointer transition-all hover:shadow-sm ${
                    isToday 
                      ? 'bg-primary/10 border-primary/20' 
                      : isPast
                      ? 'calendar-day-box border-muted/30'
                      : 'calendar-day-box border-border hover:bg-muted/20'
                  }`}
                >
                  <div className="text-center mb-2">
                    <p className="text-xs text-muted-foreground">{diasSemana[index]}</p>
                    <p className={`text-sm font-medium ${
                      isToday ? 'text-primary' : isPast ? 'text-muted-foreground' : 'text-foreground'
                    }`}>
                      {day.getDate()}
                    </p>
                  </div>
                  <div className="space-y-1">
                    {agendamentosDoDia.slice(0, 3).map((agendamento) => (
                      <div
                        key={agendamento.id}
                        className={`text-xs p-1 rounded truncate ${
                          isPast 
                            ? 'bg-muted/30 text-muted-foreground' 
                            : agendamento.status === 'realizado'
                            ? 'bg-green-100 text-green-700'
                            : agendamento.status === 'cancelado'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-primary/20 text-primary'
                        }`}
                        title={`${agendamento.hora} - ${agendamento.clienteNome} - ${agendamento.servico} - ${agendamento.status}`}
                      >
                        <div className="font-medium">{agendamento.hora}</div>
                        <div className="truncate">{agendamento.clienteNome}</div>
                        {isPast && (
                          <Badge variant="outline" className="text-xs h-4">
                            {agendamento.status}
                          </Badge>
                        )}
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

      {/* Cards de métricas - Primeira linha */}
      <div className="grid gap-3 md:grid-cols-3">
        <DashboardCard
          title="Clientes Ativos"
          value={clientesAtivosNoMes.toString()}
          icon={Users}
          description="Clientes com agendamentos no mês"
        />
        
        <DashboardCard
          title="Atendimentos"
          value={atendimentosRealizados.toString()}
          icon={Calendar}
          description="Atendimentos realizados no mês"
        />
        
        <DashboardCard
          title="Agendamentos"
          value={proximosAgendamentos.toString()}
          icon={Target}
          description="Próximos agendamentos do mês"
        />
      </div>

      {/* Cards de métricas - Segunda linha */}
      <div className="grid gap-3 md:grid-cols-3">
        <div className="text-center p-4 bg-teal-pastel rounded-lg border border-teal-200">
          <div className="text-2xl font-bold text-teal-600 mb-1">
            {formatCurrency(dadosFinanceiros.receitaMesAtual)}
          </div>
          <p className="text-sm text-muted-foreground">Faturamento do Mês</p>
        </div>
        
        <div className="text-center p-4 bg-salmon-pastel rounded-lg border border-salmon-200">
          <div className="text-2xl font-bold text-salmon-600 mb-1">
            {formatCurrency(dadosFinanceiros.totalDespesas)}
          </div>
          <p className="text-sm text-muted-foreground">Despesas do Mês</p>
        </div>
        
        <div className="text-center p-4 bg-green-pastel rounded-lg border border-green-200">
          <div className="text-2xl font-bold text-green-700 mb-1">
            {formatCurrency(dadosFinanceiros.lucroLiquido)}
          </div>
          <p className="text-sm text-muted-foreground">Lucro Líquido</p>
        </div>
      </div>

      {/* Gráfico financeiro */}
      <div className="w-full">
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-primary" />
              Evolução Financeira
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <FinancialChart data={chartData} type="line" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
