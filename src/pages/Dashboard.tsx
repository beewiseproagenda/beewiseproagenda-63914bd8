
import { DollarSign, TrendingUp, Calendar, Users, Target, PiggyBank, ChevronLeft, ChevronRight, Clock, BarChart3 } from "lucide-react";
import { DashboardCard } from "@/components/DashboardCard";
import { FinancialChart } from "@/components/FinancialChart";
import { DayAppointmentsModal } from "@/components/DayAppointmentsModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { isPastClient, effectiveStatus, getStatusLabel, getStatusBadgeVariant } from "@/lib/appointments/time";

export default function Dashboard() {
  const navigate = useNavigate();
  const { 
    atendimentos, 
    clientes, 
    calcularDadosFinanceiros,
    materializeRecurringAppointments
  } = useSupabaseData();
  const dadosFinanceiros = calcularDadosFinanceiros();
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedAppointments, setSelectedAppointments] = useState<any[]>([]);

  // Materialize recurring appointments on mount
  useEffect(() => {
    materializeRecurringAppointments();
  }, []);

  const handleEditAppointment = (appointmentId: string) => {
    console.info('[BW][DASHBOARD] Edit appointment', { appointmentId });
    // Navegar para a página de Agenda e abrir o modal de edição
    navigate(`/agenda#edit-${appointmentId}`);
  };

  const handleNewAppointment = useCallback((dateISO: string) => {
    console.info('[BW][DASHBOARD][OPEN_CREATE]', { dateISO });
    // Fechar o modal do dia
    setSelectedDate(null);
    // Navegar para Agenda com data inicial
    navigate('/agenda', { state: { initialDate: dateISO } });
  }, [navigate]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    const signal = value > 0 ? '+' : '';
    return `${signal}${value.toFixed(1)}%`;
  };

  // Preparar dados para o gráfico
  const chartData = dadosFinanceiros.historicoMensal.map(item => ({
    ...item,
    lucro: item.faturamento - item.despesas
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
      .map(a => a.cliente_id)
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
      const atendimentoDate = new Date(a.data + 'T00:00:00'); // Force local timezone
      const compareDate = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
      const compareAtendimento = new Date(atendimentoDate.getFullYear(), atendimentoDate.getMonth(), atendimentoDate.getDate());
      return compareAtendimento.getTime() === compareDate.getTime();
    })
    .map(a => {
      const cliente = clientes.find(c => c.id === a.cliente_id);
      return {
        ...a,
        clienteNome: cliente?.nome || 'Cliente não encontrado'
      };
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
      const atendimentoDate = new Date(a.data + 'T00:00:00'); // Force local timezone
      const compareDate = new Date(data.getFullYear(), data.getMonth(), data.getDate());
      const compareAtendimento = new Date(atendimentoDate.getFullYear(), atendimentoDate.getMonth(), atendimentoDate.getDate());
      return compareAtendimento.getTime() === compareDate.getTime();
    }).map(a => {
      const cliente = clientes.find(c => c.id === a.cliente_id);
      return {
        ...a,
        clienteNome: cliente?.nome || 'Cliente não encontrado'
      };
    }).sort((a, b) => a.hora.localeCompare(b.hora));
  };

  // Verificar se um dia é passado
  const isDiaPassed = (data: Date) => {
    return data < hoje;
  };

  // Função para abrir modal de agendamentos do dia
  const handleDayClick = (date: Date, appointments: any[]) => {
    setSelectedDate(date);
    setSelectedAppointments(appointments);
  };

  return (
    <div className="space-y-4 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-0">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Bem-vindo ao seu painel de controle
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-xs sm:text-sm text-muted-foreground">
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
                <div 
                  key={agendamento.id} 
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    effectiveStatus(agendamento) === 'realizado'
                      ? 'bg-green-50 border-green-200'
                      : effectiveStatus(agendamento) === 'cancelado'
                      ? 'bg-red-50 border-red-200'
                      : 'bg-primary/5 border-primary/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-primary">
                      <Clock className="h-4 w-4" />
                      <div>
                          <span className="font-medium">{agendamento.hora.slice(0, 5)} - {agendamento.clienteNome}</span>
                    <p className="text-sm text-muted-foreground">{agendamento.servico}</p>
                         {agendamento.observacoes && (
                           <p className="text-xs text-muted-foreground">{agendamento.observacoes}</p>
                         )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 mb-1">
                      <Badge variant={getStatusBadgeVariant(effectiveStatus(agendamento))}>
                        {getStatusLabel(effectiveStatus(agendamento))}
                      </Badge>
                      {isPastClient(agendamento) && (
                        <span className="text-xs text-muted-foreground">(auto)</span>
                      )}
                    </div>
                     <p className="font-medium text-foreground">{formatCurrency(Number(agendamento.valor))}</p>
                     <p className="text-xs text-muted-foreground">{agendamento.forma_pagamento}</p>
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
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {weekDays.map((day, index) => {
              const agendamentosDoDia = getAgendamentosDoDia(day);
              const isToday = day.toDateString() === hoje.toDateString();
              const isPast = isDiaPassed(day) && !isToday;
              
              return (
                 <div
                   key={day.toISOString()}
                   className={`p-2 sm:p-3 rounded-lg border min-h-[100px] sm:min-h-[120px] cursor-pointer transition-all hover:shadow-sm ${
                     isToday 
                       ? 'bg-primary/10 border-primary/20' 
                       : isPast
                       ? 'calendar-day-box border-muted/30'
                       : 'calendar-day-box border-border hover:bg-muted/20'
                   }`}
                   onClick={() => handleDayClick(day, agendamentosDoDia)}
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
                     {agendamentosDoDia.slice(0, 1).map((agendamento) => {
                       const isPast = isPastClient(agendamento);
                       const status = effectiveStatus(agendamento);
                       
                       return (
                         <div
                           key={agendamento.id}
                           className={`text-xs p-1 rounded truncate ${
                             isPast 
                               ? 'bg-muted/30 text-muted-foreground' 
                               : status === 'realizado'
                               ? 'bg-green-100 text-foreground'
                               : status === 'cancelado'
                               ? 'bg-red-100 text-foreground'
                               : 'bg-secondary text-foreground'
                           }`}
                           title={`${agendamento.hora.slice(0, 5)} - ${agendamento.clienteNome} - ${agendamento.servico} - ${status}`}
                         >
                           <div className="font-medium text-foreground">{agendamento.hora.slice(0, 5)}</div>
                           <div className="truncate text-foreground">{agendamento.clienteNome}</div>
                         </div>
                       );
                     })}
                     {agendamentosDoDia.length > 1 && (
                       <div className="text-xs text-muted-foreground text-center">
                         ...
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
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <DashboardCard
          title="Clientes Ativos"
          value={clientesAtivosNoMes.toString()}
          icon={Users}
          description="Clientes com agendamentos no mês"
        />
        
        <DashboardCard
          title="Agendamentos Realizados"
          value={atendimentosRealizados.toString()}
          icon={Calendar}
          description="Agendamentos realizados no mês"
        />
        
        <DashboardCard
          title="Agendamentos"
          value={proximosAgendamentos.toString()}
          icon={Target}
          description="Próximos agendamentos do mês"
        />
      </div>

      {/* Cards de métricas - Segunda linha - Layout do Financeiro */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturamento do Mês</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatCurrency(dadosFinanceiros.faturamentoMesAtual)}
            </div>
            <p className={`text-xs mt-1 ${dadosFinanceiros.variacaoFaturamento >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatPercentage(dadosFinanceiros.variacaoFaturamento)} vs mês anterior
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesas do Mês</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatCurrency(dadosFinanceiros.totalDespesas)}
            </div>
            <p className={`text-xs mt-1 ${dadosFinanceiros.variacaoDespesas >= 0 ? 'text-red-500' : 'text-green-500'}`}>
              {formatPercentage(dadosFinanceiros.variacaoDespesas)} vs mês anterior
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lucro Líquido</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${dadosFinanceiros.lucroLiquido >= 0 ? 'text-foreground' : 'text-red-500'}`}>
              {formatCurrency(dadosFinanceiros.lucroLiquido)}
            </div>
            <p className={`text-xs mt-1 ${dadosFinanceiros.variacaoLucro >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatPercentage(dadosFinanceiros.variacaoLucro)} vs mês anterior
            </p>
          </CardContent>
        </Card>
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
            <div className="financial-chart-container">
              <FinancialChart data={chartData} type="line" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de agendamentos do dia */}
      <DayAppointmentsModal
        open={selectedDate !== null}
        onOpenChange={(open) => !open && setSelectedDate(null)}
        date={selectedDate || new Date()}
        appointments={selectedAppointments}
        onEdit={handleEditAppointment}
        onNewAppointment={handleNewAppointment}
      />
    </div>
  );
}
