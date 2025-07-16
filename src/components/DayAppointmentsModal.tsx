import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Pencil, Trash2, Plus } from 'lucide-react';
import { useBwData } from '@/hooks/useBwData';

interface DayAppointmentsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date;
  appointments: any[];
}

export function DayAppointmentsModal({ open, onOpenChange, date, appointments }: DayAppointmentsModalProps) {
  const { atualizarAtendimento, removerAtendimento } = useBwData();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'realizado':
        return 'default';
      case 'cancelado':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'realizado':
        return 'Realizado';
      case 'cancelado':
        return 'Cancelado';
      default:
        return 'Agendado';
    }
  };

  const toggleStatus = (appointment: any) => {
    const newStatus = appointment.status === 'agendado' 
      ? 'realizado' 
      : appointment.status === 'realizado' 
      ? 'cancelado' 
      : 'agendado';
    
    atualizarAtendimento(appointment.id, { ...appointment, status: newStatus });
  };

  const deleteAppointment = (appointmentId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este agendamento?')) {
      removerAtendimento(appointmentId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Agendamentos do dia {date.toLocaleDateString('pt-BR')}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {appointments.length > 0 ? (
            appointments.map((appointment) => (
              <div
                key={appointment.id}
                className={`p-4 rounded-lg border ${
                  appointment.status === 'realizado'
                    ? 'bg-green-50 border-green-200'
                    : appointment.status === 'cancelado'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-primary/5 border-primary/10'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <span className="font-medium text-lg">{appointment.hora}</span>
                      <Badge variant={getStatusBadgeVariant(appointment.status)}>
                        {getStatusLabel(appointment.status)}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">
                        {appointment.clienteNome}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Serviço: {appointment.servico}
                      </p>
                      {appointment.observacoes && (
                        <p className="text-sm text-muted-foreground">
                          Descrição: {appointment.observacoes}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-sm">
                        <span className="font-medium">
                          Valor: {formatCurrency(appointment.valor)}
                        </span>
                        <span className="text-muted-foreground">
                          Pagamento: {appointment.formaPagamento}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleStatus(appointment)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteAppointment(appointment.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhum agendamento para este dia</p>
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Novo Agendamento
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}