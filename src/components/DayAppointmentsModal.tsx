import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Pencil, Trash2, Plus, AlertCircle } from 'lucide-react';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { isPastClient, effectiveStatus, getStatusLabel, getStatusBadgeVariant } from '@/lib/appointments/time';

interface DayAppointmentsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date;
  appointments: any[];
  onEdit?: (appointmentId: string) => void;
  onNewAppointment?: (dateISO: string) => void;
}

export function DayAppointmentsModal({ open, onOpenChange, date, appointments, onEdit, onNewAppointment }: DayAppointmentsModalProps) {
  const { removerAtendimento } = useSupabaseData();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleEdit = (appointmentId: string) => {
    if (onEdit) {
      onEdit(appointmentId);
      onOpenChange(false); // Fecha o modal de listagem
    }
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
            appointments.map((appointment) => {
              const isPast = isPastClient(appointment);
              const status = effectiveStatus(appointment);
              
              return (
                <div
                  key={appointment.id}
                  className={`p-4 rounded-lg border ${
                    status === 'realizado'
                      ? 'bg-green-50 border-green-200'
                      : status === 'cancelado'
                      ? 'bg-red-50 border-red-200'
                      : 'bg-primary/5 border-primary/10'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4 text-primary" />
                        <span className="font-medium text-lg">{appointment.hora}</span>
                        <Badge variant={getStatusBadgeVariant(status)}>
                          {getStatusLabel(status)}
                        </Badge>
                        {isPast && (
                          <span className="text-xs text-muted-foreground">(automático)</span>
                        )}
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
                      {!isPast ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(appointment.id)}
                          title="Editar agendamento"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      ) : (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <AlertCircle className="h-4 w-4" />
                          <span>Status automático</span>
                        </div>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteAppointment(appointment.id)}
                        title={isPast ? "Excluir agendamento passado" : "Excluir agendamento"}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhum agendamento para este dia</p>
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button 
            type="button"
            variant="outline" 
            onClick={() => onOpenChange(false)}
          >
            Fechar
          </Button>
          <Button 
            type="button"
            onClick={() => {
              const dateISO = date.toISOString().split('T')[0];
              console.info('[BW][DAY_MODAL] Novo Agendamento click', { dateISO });
              if (onNewAppointment) {
                onNewAppointment(dateISO);
              }
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Agendamento
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
