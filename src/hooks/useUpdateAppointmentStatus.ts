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
    const started = Date.now();
    
    try {
      // Log ambiente para diagnóstico
      console.info('[BW][ENV]', {
        supabaseUrl: (supabase as any)?.supabaseUrl || 'unknown',
      });
      console.info('[BW][RPC] POST /rpc/update_appointment_status', { id, status });
      
      const { data, error, status: httpStatus } = await supabase.rpc('update_appointment_status', { 
        p_id: id, 
        p_status: status 
      });
      
      console.info('[BW][RPC][resp]', { httpStatus, data, error });
      
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
      console.error('[BW][RPC][fail]', err);
      
      toast({
        title: "Erro",
        description: msg,
        variant: "destructive"
      });
      
      opts.onError?.(msg);
      throw err;
    } finally {
      console.info('[BW][RPC][ms]', Date.now() - started);
      setLoading(false);
    }
  }

  return { run, loading };
}
