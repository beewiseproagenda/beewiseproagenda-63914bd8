
import { useState, useEffect } from "react";
import { Plus, Calendar, Clock, User, MapPin, Phone, Edit, Trash2, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  
  const { run: updateStatus, loading: isUpdatingStatus } = useUpdateAppointmentStatus({
    onSuccess: async () => {
      await materializeRecurringAppointments();
      setOpenDialog(false);
      setEditingAtendimento(null);
      setOriginalStatus(null);
    }
  });

  // Materialize recurring appointments on mount
  useEffect(() => {
    materializeRecurringAppointments();
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
    setIsSubmitting(true);
    
    try {
      // Se estamos editando e APENAS o status mudou, usar a RPC segura
      if (editingAtendimento && originalStatus !== data.status) {
        const currentAtendimento = atendimentos.find(a => a.id === editingAtendimento);
        
        // Verificar se apenas o status foi alterado
        const onlyStatusChanged = currentAtendimento && (
          format(new Date(data.data), 'yyyy-MM-dd') === format(new Date(currentAtendimento.data), 'yyyy-MM-dd') &&
          data.hora === currentAtendimento.hora &&
          data.clienteId === currentAtendimento.cliente_id &&
          data.formaPagamento === currentAtendimento.forma_pagamento &&
          (data.observacoes || '') === (currentAtendimento.observacoes || '')
        );
        
        if (onlyStatusChanged) {
          console.info('[BW][FORM][submit] Status-only update detected', { 
            id: editingAtendimento, 
            from: originalStatus, 
            to: data.status 
          });
          await updateStatus({ id: editingAtendimento, status: data.status });
          setIsSubmitting(false);
          return;
        }
      }
      
      // Fluxo normal para outras alterações
      // Calcular valor total
      const valorTotal = data.servicos.reduce((sum, s) => sum + (s.valor * s.quantidade), 0);
      
      // Usar helpers centralizados para conversão de data/hora
      const localDate = new Date(data.data.getTime() - data.data.getTimezoneOffset() * 60000);
      const dateStr = localDate.toISOString().split('T')[0];
      const userTz = getBrowserTz();
      
      // Normalizar hora antes de converter
      const normalizedTime = normalizeTime(data.hora);
      
      // Converter para UTC usando helper
      const startAtUtcISO = toUtcISO(dateStr, normalizedTime, userTz);
      const startAtUtc = new Date(startAtUtcISO);
      const endAt = new Date(startAtUtc);
      endAt.setHours(endAt.getHours() + 1);
      
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
        valor: valorTotal, // Usar valor total para retrocompatibilidade
        valor_total: valorTotal,
        forma_pagamento: data.formaPagamento,
        observacoes: data.observacoes || "",
        status: data.status,
        start_at_utc: startAtUtcISO,
        end_at: endAt.toISOString(),
        tz: userTz,
        occurrence_date: null,
        recurring_rule_id: null,
        rule_id: null,
        competencia_date: dateStr,
        recebimento_previsto: dateStr,
        servicos: data.servicos // Passar serviços para serem salvos
      };

      if (editingAtendimento) {
        await atualizarAtendimento(editingAtendimento, atendimentoData);
        setEditingAtendimento(null);
        setOriginalStatus(null);
      } else {
        await adicionarAtendimento(atendimentoData);
      }
      
      // Comportamento "Salvar e novo" - manter contexto
      if (saveAndNew) {
        setSaveAndNew(false);
        const nextSlot = contextSlot ? {
          date: contextSlot.date,
          time: addMinutesToTime(contextSlot.time, 60)
        } : null;
        setContextSlot(nextSlot);
        atendimentoForm.reset(getDefaultFormValues());
      } else {
        atendimentoForm.reset(getDefaultFormValues());
        setContextSlot(null);
        setOpenDialog(false);
      }
    } catch (error) {
      console.error('Erro ao salvar agendamento:', error);
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
    
    atendimentoForm.reset({
      data: new Date(localParts.date + 'T00:00:00'),
      hora: localParts.time,
      clienteId: atendimento.cliente_id,
      servicos: servicos,
      formaPagamento: atendimento.forma_pagamento,
      observacoes: atendimento.observacoes || "",
      status: atendimento.status,
    });
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
            atendimentoForm.reset(getDefaultFormValues());
          }
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              handleNewAppointmentClick();
              setOriginalStatus(null);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Atendimento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingAtendimento ? 'Editar Atendimento' : 'Novo Atendimento'}
                {contextSlot && !editingAtendimento && (
                  <p className="text-sm text-muted-foreground font-normal mt-1">
                    Criando para {format(contextSlot.date, "EEE, dd/MM", { locale: ptBR })} às {contextSlot.time}
                  </p>
                )}
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

                <FormField
                  control={atendimentoForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
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
                    </FormItem>
                  )}
                />

                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <Button 
                      type="submit" 
                      className="flex-1"
                      disabled={(isSubmitting || isUpdatingStatus) || (!atendimentoForm.formState.isDirty && atendimentoForm.watch('status') === originalStatus)}
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
                .filter(atendimento => new Date(atendimento.data) < new Date())
                .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
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
                          {new Date(atendimento.data).toLocaleDateString('pt-BR')}
                        </div>
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

        {/* Próximos Atendimentos */}
        <Card className="bg-card border-border">
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Próximos Atendimentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {atendimentos
                .filter(atendimento => new Date(atendimento.data) >= new Date())
                .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())
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
                          {new Date(atendimento.data).toLocaleDateString('pt-BR')}
                        </div>
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
