import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

type UpdateStatusArgs = { 
  id: string; 
  status: string;
};

type Options = { 
  onSuccess?: () => void | Promise<void>; 
  onError?: (msg: string) => void;
};

export function useUpdateAppointmentStatus(opts: Options = {}) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function run({ id, status }: UpdateStatusArgs) {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('update_appointment_status', { 
        p_id: id, 
        p_status: status 
      });
      
      if (error) throw error;
      
      toast({
        title: "Sucesso",
        description: "Status atualizado com sucesso"
      });
      
      if (opts.onSuccess) {
        await opts.onSuccess();
      }
      
      return data;
    } catch (err: any) {
      const msg = err?.message || 'Falha ao atualizar status';
      console.error('Erro ao atualizar status:', err);
      
      toast({
        title: "Erro",
        description: msg,
        variant: "destructive"
      });
      
      opts.onError?.(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  return { run, loading };
}
