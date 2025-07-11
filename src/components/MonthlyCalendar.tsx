
import { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Atendimento } from "@/types";

interface MonthlyCalendarProps {
  atendimentos: Atendimento[];
}

export function MonthlyCalendar({ atendimentos }: MonthlyCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Adicionar dias vazios do mês anterior
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Adicionar os dias do mês atual
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const getAtendimentosDoDia = (data: Date) => {
    return atendimentos.filter(a => {
      const dataAtendimento = new Date(a.data);
      return dataAtendimento.toDateString() === data.toDateString();
    }).sort((a, b) => a.hora.localeCompare(b.hora));
  };

  const isToday = (data: Date) => {
    const hoje = new Date();
    return data.toDateString() === hoje.toDateString();
  };

  const isPast = (data: Date) => {
    const hoje = new Date();
    return data < hoje;
  };

  const days = getDaysInMonth(currentMonth);
  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-primary" />
            Calendário Mensal
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[120px] text-center">
              {currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </span>
            <Button variant="outline" size="sm" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {diasSemana.map((dia) => (
            <div key={dia} className="text-center text-sm font-medium text-muted-foreground p-2">
              {dia}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => {
            if (!day) {
              return <div key={index} className="h-24"></div>;
            }

            const agendamentosDoDia = getAtendimentosDoDia(day);
            const isHoje = isToday(day);
            const isPassed = isPast(day) && !isHoje;

            return (
              <div
                key={day.toISOString()}
                className={`h-24 p-2 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${
                  isHoje 
                    ? 'bg-primary/10 border-primary/20' 
                    : isPassed
                    ? 'calendar-day-box border-muted/30'
                    : 'calendar-day-box border-border hover:bg-muted/20'
                }`}
              >
                <div className="text-center mb-1">
                  <p className={`text-sm font-medium ${
                    isHoje ? 'text-primary' : isPassed ? 'text-muted-foreground' : 'text-foreground'
                  }`}>
                    {day.getDate()}
                  </p>
                </div>
                <div className="space-y-1">
                  {agendamentosDoDia.slice(0, 2).map((agendamento) => (
                    <div
                      key={agendamento.id}
                      className={`text-xs p-1 rounded truncate ${
                        isPassed 
                          ? 'bg-muted/30 text-muted-foreground' 
                          : agendamento.status === 'realizado'
                          ? 'bg-green-100 text-green-700'
                          : agendamento.status === 'cancelado'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-primary/20 text-primary'
                      }`}
                      title={`${agendamento.hora} - ${agendamento.clienteNome} - ${agendamento.servico}`}
                    >
                      <div className="font-medium">{agendamento.hora}</div>
                      <div className="truncate">{agendamento.clienteNome}</div>
                    </div>
                  ))}
                  {agendamentosDoDia.length > 2 && (
                    <div className="text-xs text-muted-foreground text-center">
                      +{agendamentosDoDia.length - 2}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
