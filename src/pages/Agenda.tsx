
import { useState } from "react";
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

const atendimentoSchema = z.object({
  data: z.date(),
  hora: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato de hora inválido (HH:MM)"),
  clienteId: z.string().min(1, "Selecione um cliente"),
  servicoId: z.string().min(1, "Selecione um serviço"),
  valor: z.number().min(0.01, "Valor deve ser maior que zero"),
  formaPagamento: z.enum(['dinheiro', 'pix', 'cartao_debito', 'cartao_credito', 'transferencia', 'outro']),
  observacoes: z.string().optional(),
  status: z.enum(['agendado', 'realizado', 'cancelado']),
});

export default function Agenda() {
  const { atendimentos, clientes, servicosPacotes, adicionarAtendimento, atualizarAtendimento, removerAtendimento } = useSupabaseData();
  const [openDialog, setOpenDialog] = useState(false);
  const [editingAtendimento, setEditingAtendimento] = useState<string | null>(null);
  const [dayDetailDialog, setDayDetailDialog] = useState(false);
  const [selectedDayData, setSelectedDayData] = useState<{date: Date, atendimentos: any[]} | null>(null);

  const atendimentoForm = useForm<z.infer<typeof atendimentoSchema>>({
    resolver: zodResolver(atendimentoSchema),
    defaultValues: {
      data: new Date(),
      hora: "08:00",
      clienteId: "",
      servicoId: "",
      valor: 0,
      formaPagamento: "pix",
      observacoes: "",
      status: "agendado",
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const onSubmit = (data: z.infer<typeof atendimentoSchema>) => {
    const servicoSelecionado = servicosPacotes.find(s => s.id === data.servicoId);
    const atendimentoData = {
      data: data.data.toISOString().split('T')[0], // Convert to YYYY-MM-DD
      hora: data.hora,
      cliente_id: data.clienteId,
      servico: servicoSelecionado?.nome || "",
      valor: data.valor,
      forma_pagamento: data.formaPagamento,
      observacoes: data.observacoes || "",
      status: data.status,
    };

    if (editingAtendimento) {
      atualizarAtendimento(editingAtendimento, atendimentoData);
      setEditingAtendimento(null);
    } else {
      adicionarAtendimento(atendimentoData);
    }
    atendimentoForm.reset();
    setOpenDialog(false);
  };

  const editAtendimento = (atendimento: any) => {
    setEditingAtendimento(atendimento.id);
    const servicoOriginal = servicosPacotes.find(s => s.nome === atendimento.servico);
    atendimentoForm.reset({
      data: new Date(atendimento.data),
      hora: atendimento.hora,
      clienteId: atendimento.cliente_id,
      servicoId: servicoOriginal?.id || "",
      valor: Number(atendimento.valor),
      formaPagamento: atendimento.forma_pagamento,
      observacoes: atendimento.observacoes || "",
      status: atendimento.status,
    });
    setOpenDialog(true);
  };

  const handleDayClick = (date: Date, atendimentos: any[]) => {
    setSelectedDayData({ date, atendimentos });
    setDayDetailDialog(true);
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
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Atendimento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingAtendimento ? 'Editar Atendimento' : 'Novo Atendimento'}</DialogTitle>
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
                  name="servicoId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Serviço</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          const servicoSelecionado = servicosPacotes.find(s => s.id === value);
                          if (servicoSelecionado) {
                            atendimentoForm.setValue('valor', servicoSelecionado.valor);
                          }
                        }} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um serviço ou pacote" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {servicosPacotes.map((servico) => (
                            <SelectItem key={servico.id} value={servico.id}>
                              {servico.nome} - R$ {servico.valor.toFixed(2)}
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
                  name="valor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor (R$)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
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

                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    {editingAtendimento ? 'Atualizar' : 'Adicionar'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setOpenDialog(false);
                      setEditingAtendimento(null);
                      atendimentoForm.reset();
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
