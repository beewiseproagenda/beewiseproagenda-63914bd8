import { useMemo } from 'react';
import { toUtcISO, getBrowserTz } from '@/lib/dateUtils';

export interface ConflictingAppointment {
  id: string;
  clienteNome: string;
  data: string;
  hora: string;
  start_at_utc: string;
  end_at?: string;
}

export interface ConflictCheckParams {
  dateStr: string;
  timeStr: string;
  currentAppointmentId?: string;
  userId: string;
  timezone?: string;
}

/**
 * Hook para detectar conflitos de horário entre agendamentos
 * Verifica sobreposição de intervalos para o mesmo usuário
 */
export function useAppointmentConflicts(appointments: any[]) {
  
  /**
   * Verifica se dois intervalos de tempo se sobrepõem
   */
  const checkOverlap = (
    start1: Date,
    end1: Date,
    start2: Date,
    end2: Date
  ): boolean => {
    return start1 < end2 && start2 < end1;
  };

  /**
   * Detecta conflitos de horário para um agendamento
   * @returns Array de agendamentos conflitantes
   */
  const detectConflicts = ({
    dateStr,
    timeStr,
    currentAppointmentId,
    timezone
  }: ConflictCheckParams): ConflictingAppointment[] => {
    
    const tz = timezone || getBrowserTz();
    
    // Calcular start e end do novo agendamento (60 min)
    const newStartUtcISO = toUtcISO(dateStr, timeStr, tz);
    const newStart = new Date(newStartUtcISO);
    const newEnd = new Date(newStart);
    newEnd.setHours(newEnd.getHours() + 1);

    // Filtrar agendamentos que se sobrepõem
    const conflicts = appointments.filter(apt => {
      // Ignorar o próprio agendamento em caso de edição
      if (currentAppointmentId && apt.id === currentAppointmentId) {
        return false;
      }

      // Calcular start e end do agendamento existente
      const existingStart = apt.start_at_utc 
        ? new Date(apt.start_at_utc)
        : new Date(`${apt.data}T${apt.hora}:00`);
      
      const existingEnd = apt.end_at
        ? new Date(apt.end_at)
        : new Date(existingStart.getTime() + 60 * 60 * 1000);

      // Verificar sobreposição
      return checkOverlap(newStart, newEnd, existingStart, existingEnd);
    });

    // Mapear para formato de retorno
    return conflicts.map(apt => ({
      id: apt.id,
      clienteNome: apt.clienteNome || apt.cliente?.nome || 'Cliente desconhecido',
      data: apt.data,
      hora: apt.hora,
      start_at_utc: apt.start_at_utc,
      end_at: apt.end_at
    }));
  };

  return {
    detectConflicts,
    checkOverlap
  };
}
