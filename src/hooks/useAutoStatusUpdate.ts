import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface Appointment {
  id: string;
  start_at_utc?: string;
  end_at?: string;
  data: string;
  hora: string;
  status: string;
  tz?: string;
}

/**
 * Hook para atualizar automaticamente status de agendamentos
 * agendado → realizado quando o horário passa
 */
export function useAutoStatusUpdate(
  appointments: Appointment[],
  onUpdate: () => void
) {
  const { user } = useAuth();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const updatePastAppointments = async () => {
    if (!user || !appointments.length) return;

    console.log('[BW][AUTO_STATUS] Checking for past appointments...');
    
    const now = new Date();
    const pastAppointments = appointments.filter(apt => {
      // Skip if already completed or cancelled
      if (apt.status === 'realizado' || apt.status === 'cancelado') {
        return false;
      }

      // Use end_at if available, otherwise add 1 hour to start
      let endTime: Date;
      if (apt.end_at) {
        endTime = new Date(apt.end_at);
      } else if (apt.start_at_utc) {
        endTime = new Date(apt.start_at_utc);
        endTime.setHours(endTime.getHours() + 1);
      } else {
        // Fallback to data/hora
        const localDateTime = new Date(`${apt.data}T${apt.hora}:00`);
        endTime = new Date(localDateTime);
        endTime.setHours(endTime.getHours() + 1);
      }

      return endTime <= now;
    });

    if (pastAppointments.length === 0) {
      console.log('[BW][AUTO_STATUS] No appointments to update');
      return;
    }

    console.log('[BW][AUTO_STATUS] Found past appointments:', pastAppointments.length);

    // Update in batch
    for (const apt of pastAppointments) {
      try {
        const { error } = await supabase
          .from('atendimentos')
          .update({ status: 'realizado' })
          .eq('id', apt.id)
          .eq('user_id', user.id);

        if (error) {
          console.error('[BW][AUTO_STATUS] Error updating appointment:', apt.id, error);
        } else {
          console.log('[BW][AUTO_STATUS] Updated appointment to realizado:', apt.id);
        }
      } catch (err) {
        console.error('[BW][AUTO_STATUS] Exception updating appointment:', err);
      }
    }

    // Trigger refresh
    if (pastAppointments.length > 0) {
      console.log('[BW][AUTO_STATUS] Triggering data refresh...');
      onUpdate();
    }
  };

  useEffect(() => {
    // Run immediately on mount
    updatePastAppointments();

    // Run every 5 minutes
    timerRef.current = setInterval(() => {
      updatePastAppointments();
    }, 5 * 60 * 1000); // 5 minutes

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [appointments, user]);

  return { updatePastAppointments };
}
