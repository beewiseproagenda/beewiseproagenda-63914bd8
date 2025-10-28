
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Plus, Calendar, Clock, User, MapPin, Phone, Edit, Trash2, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { MonthlyCalendar } from "@/components/MonthlyCalendar";
import { AppointmentServicesManager, AppointmentService } from "@/components/AppointmentServicesManager";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toUtcISO, fromUtcToLocalParts, getBrowserTz, normalizeTime } from "@/lib/dateUtils";
import { supabase } from "@/integrations/supabase/client";
import { useUpdateAppointmentStatus } from "@/hooks/useUpdateAppointmentStatus";
import { isPastClient, effectiveStatus } from "@/lib/appointments/time";
import { fmtAptDate, fmtAptTime } from "@/lib/appointments/format";
import { useAppointmentConflicts } from "@/hooks/useAppointmentConflicts";
import { AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTimezoneDetection } from "@/hooks/useTimezoneDetection";
import { useAutoStatusUpdate } from "@/hooks/useAutoStatusUpdate";

const atendimentoSchema = z.object({
  data: z.date(),
  hora: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato de hora inválido (HH:MM)"),
  clienteId: z.string().min(1, "Selecione um cliente"),
  servicos: z.array(z.object({
    id: z.string().optional(),
    servico_id: z.string().min(1, "Selecione um serviço"),
    descricao: z.string().optional(),
    valor: z.number().min(0.01, "Valor deve ser maior que zero"),
    quantidade: z.number().int().min(1, "Quantidade deve ser no mínimo 1"),
  })).min(1, "Adicione pelo menos um serviço"),
  formaPagamento: z.enum(['dinheiro', 'pix', 'cartao_debito', 'cartao_credito', 'transferencia', 'outro']),
  observacoes: z.string().optional(),
  status: z.enum(['agendado', 'realizado', 'cancelado']),
});

export default function Agenda() {
  const location = useLocation();
  const { 
    atendimentos, 
    clientes, 
    servicosPacotes, 
    adicionarAtendimento, 
    atualizarAtendimento, 
    removerAtendimento,
    materializeRecurringAppointments
  } = useSupabaseData();
  const [openDialog, setOpenDialog] = useState(false);
  const [editingAtendimento, setEditingAtendimento] = useState<string | null>(null);
  const [dayDetailDialog, setDayDetailDialog] = useState(false);
  const [selectedDayData, setSelectedDayData] = useState<{date: Date, atendimentos: any[]} | null>(null);
  const [contextSlot, setContextSlot] = useState<{date: Date, time: string} | null>(null);
  const [saveAndNew, setSaveAndNew] = useState(false);
  const [originalStatus, setOriginalStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [initialFormValues, setInitialFormValues] = useState<z.infer<typeof atendimentoSchema> | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  
  const { detectConflicts } = useAppointmentConflicts(atendimentos);
  const { toast } = useToast();
  
  // Timezone detection
  const timezoneInfo = useTimezoneDetection();
  
  // Auto status update hook
  const { updatePastAppointments } = useAutoStatusUpdate(atendimentos, async () => {
    console.log('[BW][AGENDA] Auto-update triggered, refreshing data...');
    await materializeRecurringAppointments();
  });
  
  const { run: updateStatus, loading: isUpdatingStatus } = useUpdateAppointmentStatus({
    onSuccess: async () => {
      await materializeRecurringAppointments();
      setOpenDialog(false);
      setEditingAtendimento(null);
      setOriginalStatus(null);
    }
  });

  // Materialize recurring appointments on mount + run auto-update
  useEffect(() => {
    materializeRecurringAppointments();
    updatePastAppointments();
  }, []);

  // Detectar hash na URL para abrir edição automática
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#edit-')) {
      const appointmentId = hash.replace('#edit-', '');
      const atendimento = atendimentos.find(a => a.id === appointmentId);
      if (atendimento) {
        editAtendimento(atendimento);
        // Limpar o hash
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }, [atendimentos]);

  // Detectar data inicial da navegação (do Dashboard)
  useEffect(() => {
    const state = location.state as { initialDate?: string };
    if (state?.initialDate) {
      console.info('[BW][AGENDA] Received initialDate from Dashboard', { initialDate: state.initialDate });
      const initialDate = new Date(state.initialDate + 'T12:00:00');
      setContextSlot({ date: initialDate, time: '08:00' });
      setEditingAtendimento(null);
      setSaveAndNew(false);
      setInitialFormValues(null);
      setHasChanges(true);
      atendimentoForm.reset({
        data: initialDate,
        hora: '08:00',
        clienteId: "",
        servicos: [{ servico_id: "", valor: 0, quantidade: 1, descricao: "" }] as AppointmentService[],
        formaPagamento: "pix" as const,
        observacoes: "",
        status: "agendado" as const,
      });
      setOpenDialog(true);
      // Limpar o state após uso
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Verificar conflitos em tempo real quando data/hora mudam E detectar mudanças
  useEffect(() => {
    const subscription = atendimentoForm.watch((value) => {
      // Detectar conflitos quando data/hora mudam
      const data = value.data;
      const hora = value.hora;
      
      if (data && hora) {
        const localDate = new Date(data.getTime() - data.getTimezoneOffset() * 60000);
        const dateStr = localDate.toISOString().split('T')[0];
        const userTz = getBrowserTz();
        const normalizedTime = normalizeTime(hora);
        
        const conflictingAppointments = detectConflicts({
          dateStr,
          timeStr: normalizedTime,
          currentAppointmentId: editingAtendimento || undefined,
          userId: '',
          timezone: userTz
        });
        
        setConflicts(conflictingAppointments);
      }
      
      // Detectar mudanças nos campos editáveis
      if (editingAtendimento && initialFormValues) {
        const currentValues = value as z.infer<typeof atendimentoSchema>;
        
        // Comparar campos editáveis
        const dataChanged = currentValues.data?.toISOString() !== initialFormValues.data?.toISOString();
        const horaChanged = currentValues.hora !== initialFormValues.hora;
        const clienteChanged = currentValues.clienteId !== initialFormValues.clienteId;
        const formaPagamentoChanged = currentValues.formaPagamento !== initialFormValues.formaPagamento;
        const observacoesChanged = (currentValues.observacoes || '') !== (initialFormValues.observacoes || '');
        
        // Comparar serviços (quantidade, servico_id, valor)
        const servicosChanged = JSON.stringify(currentValues.servicos) !== JSON.stringify(initialFormValues.servicos);
        
        const changed = dataChanged || horaChanged || clienteChanged || formaPagamentoChanged || 
                       observacoesChanged || servicosChanged;
        
        console.info('[BW][EDIT] Change detection', { 
          changed, 
          dataChanged, 
          horaChanged, 
          clienteChanged,
          formaPagamentoChanged,
          observacoesChanged,
          servicosChanged
        });
        
        setHasChanges(changed);
      } else {
        // Novo agendamento - sempre permitir salvar
        setHasChanges(true);
      }
    });
    
    return () => subscription.unsubscribe();
  }, [editingAtendimento, atendimentos, initialFormValues]);

  const getDefaultFormValues = () => {
    // Prioridade: contextSlot > hoje
    if (contextSlot) {
      return {
        data: contextSlot.date,
        hora: contextSlot.time,
        clienteId: "",
        servicos: [{ servico_id: "", valor: 0, quantidade: 1, descricao: "" }] as AppointmentService[],
        formaPagamento: "pix" as const,
        observacoes: "",
        status: "agendado" as const,
      };
    }
    
    return {
      data: new Date(),
      hora: "08:00",
      clienteId: "",
      servicos: [{ servico_id: "", valor: 0, quantidade: 1, descricao: "" }] as AppointmentService[],
      formaPagamento: "pix" as const,
      observacoes: "",
      status: "agendado" as const,
    };
  };

  const atendimentoForm = useForm<z.infer<typeof atendimentoSchema>>({
    resolver: zodResolver(atendimentoSchema),
    defaultValues: getDefaultFormValues(),
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const onSubmit = async (data: z.infer<typeof atendimentoSchema>) => {
    console.info('[BW][EDIT][SUBMIT] Starting submit', { 
      editing: editingAtendimento,
      hasChanges,
      data: {
        clienteId: data.clienteId,
        data: format(data.data, 'yyyy-MM-dd'),
        hora: data.hora,
        servicos: data.servicos.length,
        status: data.status
      }
    });
    
    setIsSubmitting(true);
    
    try {
      // Verificar conflitos antes de salvar
      const localDate = new Date(data.data.getTime() - data.data.getTimezoneOffset() * 60000);
      const dateStr = localDate.toISOString().split('T')[0];
      const userTz = getBrowserTz();
      const normalizedTime = normalizeTime(data.hora);
      
      const conflictingAppointments = detectConflicts({
        dateStr,
        timeStr: normalizedTime,
        currentAppointmentId: editingAtendimento || undefined,
        userId: '', // será filtrado por RLS
        timezone: userTz
      });
      
      if (conflictingAppointments.length > 0) {
        setConflicts(conflictingAppointments);
        toast({
          title: "Conflito de horário",
          description: `Já existe(m) ${conflictingAppointments.length} agendamento(s) neste intervalo. Ajuste a data/hora para continuar.`,
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }
      
      // Limpar conflitos se passou na validação
      setConflicts([]);
      
      // Calcular valor total
      const valorTotal = data.servicos.reduce((sum, s) => sum + (s.valor * s.quantidade), 0);
      
      // Converter para UTC usando helper (já calculado acima na verificação de conflito)
      const startAtUtcISO = toUtcISO(dateStr, normalizedTime, userTz);
      const startAtUtc = new Date(startAtUtcISO);
      const endAt = new Date(startAtUtc);
      endAt.setHours(endAt.getHours() + 1);
      
      // Ajustar status automaticamente baseado em passado/futuro
      let finalStatus = data.status;
      const isPastAppointment = endAt.getTime() < Date.now();
      
      if (isPastAppointment && finalStatus !== 'cancelado') {
        // Se está no passado e não foi cancelado, status = realizado
        finalStatus = 'realizado';
        console.info('[BW][EDIT][SUBMIT] Past appointment, setting status to realizado');
      } else if (!isPastAppointment && originalStatus === 'realizado') {
        // Se estava no passado (realizado) e mudou para futuro, ajustar para agendado
        finalStatus = 'agendado';
        console.info('[BW][EDIT][SUBMIT] Moved to future, setting status to agendado');
      }
      
      // Criar nome do serviço baseado nos serviços selecionados
      const servicosNomes = data.servicos.map(s => {
        const servicoPacote = servicosPacotes.find(sp => sp.id === s.servico_id);
        return servicoPacote?.nome || "Serviço";
      }).join(", ");
      
      const atendimentoData = {
        date: dateStr,
        time: normalizedTime,
        data: dateStr,
        hora: normalizedTime,
        cliente_id: data.clienteId,
        servico: servicosNomes,
        valor: valorTotal,
        valor_total: valorTotal,
        forma_pagamento: data.formaPagamento,
        observacoes: data.observacoes || "",
        status: finalStatus, // Usar status ajustado automaticamente
        start_at_utc: startAtUtcISO,
        end_at: endAt.toISOString(),
        tz: userTz,
        occurrence_date: null,
        recurring_rule_id: null,
        rule_id: null,
        competencia_date: dateStr,
        recebimento_previsto: dateStr,
        servicos: data.servicos
      };

      console.info('[BW][EDIT][SUBMIT] Payload ready', { 
        id: editingAtendimento,
        finalStatus,
        valorTotal,
        isPastAppointment
      });

      if (editingAtendimento) {
        await atualizarAtendimento(editingAtendimento, atendimentoData);
        console.info('[BW][EDIT][SUBMIT] Update successful');
        toast({
          title: "Sucesso",
          description: "Agendamento atualizado com sucesso."
        });
        setEditingAtendimento(null);
        setOriginalStatus(null);
        setInitialFormValues(null);
        setHasChanges(false);
      } else {
        await adicionarAtendimento(atendimentoData);
        console.info('[BW][EDIT][SUBMIT] Creation successful');
        toast({
          title: "Sucesso",
          description: "Agendamento criado com sucesso."
        });
      }
      
      // Comportamento "Salvar e novo" - manter contexto
      if (saveAndNew) {
        setSaveAndNew(false);
        const nextSlot = contextSlot ? {
          date: contextSlot.date,
          time: addMinutesToTime(contextSlot.time, 60)
        } : null;
        setContextSlot(nextSlot);
        setInitialFormValues(null);
        setHasChanges(true);
        atendimentoForm.reset(getDefaultFormValues());
      } else {
        atendimentoForm.reset(getDefaultFormValues());
        setContextSlot(null);
        setInitialFormValues(null);
        setHasChanges(false);
        setConflicts([]);
        setOpenDialog(false);
      }
    } catch (error) {
      console.error('[BW][EDIT][SUBMIT] Error:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper para adicionar minutos a hora
  const addMinutesToTime = (time: string, minutes: number): string => {
    const [hours, mins] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMins = totalMinutes % 60;
    return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
  };

  const editAtendimento = async (atendimento: any) => {
    console.info('[BW][EDIT] Opening edit modal', { id: atendimento.id, status: atendimento.status });
    setEditingAtendimento(atendimento.id);
    setOriginalStatus(atendimento.status);
    
    // Usar helper para converter UTC para local ao editar
    const userTz = getBrowserTz();
    let localParts;
    
    if (atendimento.start_at_utc) {
      localParts = fromUtcToLocalParts(atendimento.start_at_utc, userTz);
    } else {
      // Fallback para campos legados
      localParts = {
        date: atendimento.data,
        time: normalizeTime(atendimento.hora)
      };
    }
    
    // Carregar serviços relacionados do agendamento
    const { data: servicosRelacionados, error } = await supabase
      .from('agendamento_servicos')
      .select('*')
      .eq('agendamento_id', atendimento.id);
    
    let servicos: AppointmentService[] = [];
    
    if (servicosRelacionados && servicosRelacionados.length > 0) {
      // Se tem serviços na tabela relacionada, usar eles
      servicos = servicosRelacionados.map(s => ({
        id: s.id,
        servico_id: s.servico_id,
        descricao: s.descricao || "",
        valor: Number(s.valor),
        quantidade: s.quantidade
      }));
    } else {
      // Retrocompatibilidade: criar serviço único baseado nos campos antigos
      const servicoOriginal = servicosPacotes.find(s => s.nome === atendimento.servico);
      servicos = [{
        servico_id: servicoOriginal?.id || "",
        descricao: "",
        valor: Number(atendimento.valor || 0),
        quantidade: 1
      }];
    }
    
    const formValues = {
      data: new Date(localParts.date + 'T00:00:00'),
      hora: localParts.time,
      clienteId: atendimento.cliente_id,
      servicos: servicos,
      formaPagamento: atendimento.forma_pagamento,
      observacoes: atendimento.observacoes || "",
      status: atendimento.status,
    };
    
    // Salvar snapshot inicial para detectar mudanças
    setInitialFormValues(formValues);
    setHasChanges(false);
    
    atendimentoForm.reset(formValues);
    setContextSlot(null); // Limpar contexto ao editar
    setOpenDialog(true);
  };

  const handleDayClick = (date: Date, atendimentos: any[]) => {
    setSelectedDayData({ date, atendimentos });
    setDayDetailDialog(true);
  };

  const handleNewAppointmentClick = () => {
    setEditingAtendimento(null);
    setSaveAndNew(false);
    setInitialFormValues(null);
    setHasChanges(true); // Novo agendamento sempre permite salvar
    
    // Se há um dia selecionado, usar como contexto
    if (selectedDayData) {
      setContextSlot({
        date: selectedDayData.date,
        time: "08:00" // Hora padrão de início do expediente
      });
    } else {
      setContextSlot(null);
    }
    
    atendimentoForm.reset(getDefaultFormValues());
    setOpenDialog(true);
  };

  const handleSlotClick = (date: Date, time: string) => {
    setEditingAtendimento(null);
    setSaveAndNew(false);
    setInitialFormValues(null);
    setHasChanges(true); // Novo agendamento sempre permite salvar
    setContextSlot({ date, time });
    atendimentoForm.reset(getDefaultFormValues());
    setOpenDialog(true);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Agenda</h1>
          <p className="text-muted-foreground">
            Gerencie seus agendamentos e horários
          </p>
        </div>
        <Dialog open={openDialog} onOpenChange={(open) => {
          setOpenDialog(open);
          if (!open) {
            // Resetar estado ao fechar
            setEditingAtendimento(null);
            setContextSlot(null);
            setSaveAndNew(false);
            setInitialFormValues(null);
            setHasChanges(false);
            setConflicts([]);
            atendimentoForm.reset(getDefaultFormValues());
          }
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              handleNewAppointmentClick();
              setOriginalStatus(null);
              setConflicts([]);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Agendamento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingAtendimento ? 'Editar Atendimento' : 'Novo Agendamento'}
              </DialogTitle>
            </DialogHeader>
            <Form {...atendimentoForm}>
              <form onSubmit={atendimentoForm.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={atendimentoForm.control}
                  name="data"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "dd/MM/yyyy", { locale: ptBR })
                              ) : (
                                <span>Selecione uma data</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={atendimentoForm.control}
                  name="hora"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hora</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={atendimentoForm.control}
                  name="clienteId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cliente</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um cliente" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clientes.map((cliente) => (
                            <SelectItem key={cliente.id} value={cliente.id}>
                              {cliente.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />


                <FormField
                  control={atendimentoForm.control}
                  name="servicos"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <AppointmentServicesManager
                          servicos={(field.value || []) as AppointmentService[]}
                          onChange={field.onChange}
                          servicosPacotes={servicosPacotes}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={atendimentoForm.control}
                  name="formaPagamento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Forma de Pagamento</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a forma de pagamento" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="dinheiro">Dinheiro</SelectItem>
                          <SelectItem value="pix">PIX</SelectItem>
                          <SelectItem value="cartao_debito">Cartão Débito</SelectItem>
                          <SelectItem value="cartao_credito">Cartão Crédito</SelectItem>
                          <SelectItem value="transferencia">Transferência</SelectItem>
                          <SelectItem value="outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={atendimentoForm.control}
                  name="observacoes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Alerta de conflitos */}
                {conflicts.length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Conflito de horário</AlertTitle>
                    <AlertDescription>
                      <p className="mb-2">Já existe(m) agendamento(s) neste intervalo:</p>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {conflicts.map((conflict, idx) => (
                          <li key={idx}>
                            {conflict.hora} - {conflict.clienteNome}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-2 text-sm">Ajuste a data/hora para continuar.</p>
                    </AlertDescription>
                  </Alert>
                )}

                <FormField
                  control={atendimentoForm.control}
                  name="status"
                  render={({ field }) => {
                    const currentAppointment = editingAtendimento 
                      ? atendimentos.find(a => a.id === editingAtendimento)
                      : null;
                    const isPast = isPastClient(currentAppointment);
                    const statusEfetivo = effectiveStatus(currentAppointment);
                    
                    return (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        {isPast ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 p-3 rounded-md bg-muted">
                              <Badge variant="default">{statusEfetivo}</Badge>
                              <span className="text-sm text-muted-foreground">(aplicado automaticamente)</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              ℹ️ Agendamentos passados têm status automático "Realizado". Para cancelados/não realizados, <strong>exclua o agendamento</strong>.
                            </p>
                          </div>
                        ) : (
                          <>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="agendado">Agendado</SelectItem>
                                <SelectItem value="realizado">Realizado</SelectItem>
                                <SelectItem value="cancelado">Cancelado</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </>
                        )}
                      </FormItem>
                    );
                  }}
                />

                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <Button 
                      type="submit" 
                      className="flex-1"
                      disabled={!hasChanges || isSubmitting || isUpdatingStatus || conflicts.length > 0}
                    >
                      {(isSubmitting || isUpdatingStatus) ? 'Salvando...' : editingAtendimento ? 'Atualizar' : 'Salvar'}
                    </Button>
                    {!editingAtendimento && (
                      <>
                        <Button
                          type="submit"
                          variant="secondary"
                          className="flex-1"
                          onClick={() => setSaveAndNew(true)}
                        >
                          Salvar e Novo
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            const currentValues = atendimentoForm.getValues();
                            onSubmit(currentValues);
                            setSaveAndNew(false);
                            setTimeout(() => {
                              atendimentoForm.reset(currentValues);
                              if (contextSlot) {
                                setContextSlot({
                                  date: contextSlot.date,
                                  time: addMinutesToTime(contextSlot.time, 60)
                                });
                              }
                            }, 100);
                          }}
                        >
                          Duplicar
                        </Button>
                      </>
                    )}
                  </div>
                  {editingAtendimento && (
                    <p className="text-[10px] text-muted-foreground text-center opacity-60">
                      🔍 DevTools → Console (filtre por <code>[BW]</code>) | Network (<code>update_appointment_status</code>)
                    </p>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setOpenDialog(false);
                      setEditingAtendimento(null);
                      setContextSlot(null);
                      setSaveAndNew(false);
                      atendimentoForm.reset(getDefaultFormValues());
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Calendário Mensal */}
      <MonthlyCalendar 
        atendimentos={atendimentos}
        clientes={clientes}
        onDayClick={handleDayClick}
      />

      {/* Dialog para visualizar/editar agendamentos do dia */}
      <Dialog open={dayDetailDialog} onOpenChange={setDayDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Agendamentos do dia {selectedDayData?.date.toLocaleDateString('pt-BR')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedDayData?.atendimentos.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nenhum agendamento para este dia
              </p>
            ) : (
              selectedDayData?.atendimentos.map((atendimento) => {
                const cliente = clientes.find(c => c.id === atendimento.cliente_id);
                return (
                  <div key={atendimento.id} className="border rounded-md p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-semibold">
                          {cliente ? cliente.nome : 'Cliente não encontrado'}
                        </h3>
                        <p className="text-sm text-muted-foreground">{atendimento.servico}</p>
                        {cliente && (
                          <div className="flex items-center gap-2 mt-1">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{cliente.telefone}</span>
                          </div>
                        )}
                      </div>
                      <Badge variant="secondary">{atendimento.status}</Badge>
                    </div>
                    <div className="mt-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {atendimento.hora}
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        {formatCurrency(atendimento.valor)}
                      </div>
                    </div>
                    <div className="flex justify-end mt-4 gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => {
                          editAtendimento(atendimento);
                          setDayDetailDialog(false);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        onClick={() => {
                          removerAtendimento(atendimento.id);
                          setDayDetailDialog(false);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agendamentos Passados */}
        <Card className="bg-card border-border">
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Agendamentos Passados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {atendimentos
                .filter(atendimento => isPastClient(atendimento))
                .sort((a, b) => new Date(b.start_at_utc || b.data).getTime() - new Date(a.start_at_utc || a.data).getTime())
                .slice(0, 10)
                .map((atendimento) => {
                  const cliente = clientes.find(c => c.id === atendimento.cliente_id);
                  return (
                    <div key={atendimento.id} className="border rounded-md p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-lg font-semibold">
                            {cliente ? cliente.nome : 'Cliente não encontrado'}
                          </h3>
                          <p className="text-sm text-muted-foreground">{atendimento.servico}</p>
                          {cliente && (
                            <div className="flex items-center gap-2 mt-1">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{cliente.telefone}</span>
                            </div>
                          )}
                        </div>
                        <Badge variant="secondary">{atendimento.status}</Badge>
                      </div>
                      <div className="mt-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {fmtAptDate(atendimento)}
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          {fmtAptTime(atendimento)}
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          {formatCurrency(atendimento.valor)}
                        </div>
                      </div>
                      <div className="flex justify-end mt-4 gap-2">
                        <Button size="sm" variant="outline" onClick={() => editAtendimento(atendimento)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => removerAtendimento(atendimento.id)}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </Button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>

        {/* Próximos Agendamentos */}
        <Card className="bg-card border-border">
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Próximos Agendamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {atendimentos
                .filter(atendimento => !isPastClient(atendimento))
                .sort((a, b) => new Date(a.start_at_utc || a.data).getTime() - new Date(b.start_at_utc || b.data).getTime())
                .slice(0, 10)
                .map((atendimento) => {
                  const cliente = clientes.find(c => c.id === atendimento.cliente_id);
                  return (
                    <div key={atendimento.id} className="border rounded-md p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-lg font-semibold">
                            {cliente ? cliente.nome : 'Cliente não encontrado'}
                          </h3>
                          <p className="text-sm text-muted-foreground">{atendimento.servico}</p>
                          {cliente && (
                            <div className="flex items-center gap-2 mt-1">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{cliente.telefone}</span>
                            </div>
                          )}
                        </div>
                        <Badge variant="secondary">{atendimento.status}</Badge>
                      </div>
                      <div className="mt-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {fmtAptDate(atendimento)}
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          {fmtAptTime(atendimento)}
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          {formatCurrency(atendimento.valor)}
                        </div>
                      </div>
                      <div className="flex justify-end mt-4 gap-2">
                        <Button size="sm" variant="outline" onClick={() => editAtendimento(atendimento)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => removerAtendimento(atendimento.id)}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </Button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
