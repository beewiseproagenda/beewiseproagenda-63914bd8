
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Atendimento, Cliente } from '@/types';

interface MonthlyCalendarProps {
  atendimentos: Atendimento[];
  clientes: Cliente[];
  onDayClick?: (date: Date, atendimentos: any[]) => void;
}

export function MonthlyCalendar({ atendimentos, clientes, onDayClick }: MonthlyCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Adicionar dias vazios do início
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Adicionar todos os dias do mês
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const getAtendimentosForDay = (date: Date) => {
    return atendimentos.filter(a => {
      const atendimentoDate = new Date(a.data);
      return atendimentoDate.toDateString() === date.toDateString();
    }).map(a => {
      const cliente = clientes.find(c => c.id === a.clienteId);
      return {
        ...a,
        clienteNome: cliente?.nome || 'Cliente não encontrado'
      };
    }).sort((a, b) => a.hora.localeCompare(b.hora));
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const days = getDaysInMonth(currentDate);
  const today = new Date();
  const monthYear = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg capitalize">{monthYear}</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={previousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-7 gap-2 mb-2">
          {diasSemana.map((dia) => (
            <div key={dia} className="text-center text-sm font-medium text-muted-foreground p-2">
              {dia}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {days.map((day, index) => {
            if (!day) {
              return <div key={index} className="h-20"></div>;
            }

            const dayAtendimentos = getAtendimentosForDay(day);
            const isToday = day.toDateString() === today.toDateString();
            const isPast = day < today && !isToday;

            return (
              <div
                key={day.toISOString()}
                className={`h-20 p-2 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${
                  isToday 
                    ? 'bg-primary/10 border-primary/20' 
                    : isPast
                    ? 'calendar-day-box border-muted/30'
                    : 'calendar-day-box border-border hover:bg-muted/20'
                }`}
                onClick={() => onDayClick?.(day, dayAtendimentos)}
              >
                <div className="text-center mb-1">
                  <span className={`text-sm font-medium ${
                    isToday ? 'text-primary' : isPast ? 'text-muted-foreground' : 'text-foreground'
                  }`}>
                    {day.getDate()}
                  </span>
                </div>
                <div className="space-y-1">
                  {dayAtendimentos.map((atendimento) => (
                      <div
                        key={atendimento.id}
                        className={`text-xs p-1 rounded truncate ${
                          isPast 
                            ? 'bg-muted/30 text-muted-foreground' 
                            : atendimento.status === 'realizado'
                            ? 'bg-green-100 text-foreground'
                            : atendimento.status === 'cancelado'
                            ? 'bg-red-100 text-foreground'
                            : 'bg-secondary text-foreground'
                        }`}
                        title={`${atendimento.hora} - ${atendimento.clienteNome} - ${atendimento.servico}`}
                      >
                        <div className="font-medium text-foreground">{atendimento.hora}</div>
                        <div className="truncate text-foreground">{atendimento.clienteNome}</div>
                      </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
