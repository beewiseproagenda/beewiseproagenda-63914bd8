import { useState } from "react";
import { Plus, Calendar as CalendarIcon, Clock, User, Pencil, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useMobData } from "@/hooks/useMobData";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { FormaPagamento } from "@/types";

const atendimentoSchema = z.object({
  data: z.date(),
  hora: z.string().min(1, "Hora é obrigatória"),
  clienteId: z.string().min(1, "Cliente é obrigatório"),
  clienteNome: z.string().min(1, "Nome do cliente é obrigatório"),
  servico: z.string().min(1, "Serviço é obrigatório"),
  valor: z.number().min(0, "Valor deve ser positivo"),
  formaPagamento: z.enum(['dinheiro', 'pix', 'cartao_debito', 'cartao_credito', 'transferencia', 'outro'] as const),
  status: z.enum(['agendado', 'realizado', 'cancelado'] as const),
  observacoes: z.string().optional(),
});

export default function Agenda() {
  const { atendimentos, clientes, adicionarAtendimento, atualizarAtendimento, removerAtendimento } = useMobData();
  const [openDialog, setOpenDialog] = useState(false);
  const [editingAtendimento, setEditingAtendimento] = useState<string | null>(null);
  const [busca, setBusca] = useState("");

  const form = useForm<z.infer<typeof atendimentoSchema>>({
    resolver: zodResolver(atendimentoSchema),
    defaultValues: {
      data: new Date(),
      hora: "",
      clienteId: "",
      clienteNome: "",
      servico: "",
      valor: 0,
      formaPagamento: "pix" as FormaPagamento,
      status: "agendado" as const,
      observacoes: "",
    },
  });

  const clienteSelecionado = form.watch("clienteId");

  // Atualizar nome do cliente quando um cliente é selecionado
  const handleClienteChange = (clienteId: string) => {
    const cliente = clientes.find(c => c.id === clienteId);
    if (cliente) {
      form.setValue("clienteNome", cliente.nome);
    }
    form.setValue("clienteId", clienteId);
  };

  const onSubmit = (data: z.infer<typeof atendimentoSchema>) => {
    const atendimentoData = {
      data: data.data,
      hora: data.hora,
      clienteId: data.clienteId,
      clienteNome: data.clienteNome,
      servico: data.servico,
      valor: data.valor,
      formaPagamento: data.formaPagamento,
      status: data.status,
      observacoes: data.observacoes || "",
    };

    if (editingAtendimento) {
      atualizarAtendimento(editingAtendimento, atendimentoData);
      setEditingAtendimento(null);
    } else {
      adicionarAtendimento(atendimentoData);
    }
    form.reset();
    setOpenDialog(false);
  };

  const editarAtendimento = (atendimento: any) => {
    setEditingAtendimento(atendimento.id);
    form.reset({
      data: new Date(atendimento.data),
      hora: atendimento.hora,
      clienteId: atendimento.clienteId,
      clienteNome: atendimento.clienteNome,
      servico: atendimento.servico,
      valor: atendimento.valor,
      formaPagamento: atendimento.formaPagamento,
      status: atendimento.status,
      observacoes: atendimento.observacoes || "",
    });
    setOpenDialog(true);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'agendado': return 'text-blue-500';
      case 'realizado': return 'text-green-500';
      case 'cancelado': return 'text-red-500';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'agendado': return 'Agendado';
      case 'realizado': return 'Realizado';
      case 'cancelado': return 'Cancelado';
      default: return status;
    }
  };

  const getFormaPagamentoLabel = (forma: FormaPagamento) => {
    const labels = {
      dinheiro: 'Dinheiro',
      pix: 'PIX',
      cartao_debito: 'Cartão Débito',
      cartao_credito: 'Cartão Crédito',
      transferencia: 'Transferência',
      outro: 'Outro'
    };
    return labels[forma] || forma;
  };

  const atendimentosFiltrados = atendimentos.filter(atendimento =>
    atendimento.clienteNome.toLowerCase().includes(busca.toLowerCase()) ||
    atendimento.servico.toLowerCase().includes(busca.toLowerCase())
  );

  const atendimentosOrdenados = atendimentosFiltrados.sort((a, b) => 
    new Date(b.data).getTime() - new Date(a.data).getTime()
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Agenda</h1>
          <p className="text-muted-foreground">
            Gerencie seus atendimentos e compromissos
          </p>
        </div>
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Atendimento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingAtendimento ? 'Editar Atendimento' : 'Novo Atendimento'}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
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
                                format(field.value, "PPP", { locale: undefined })
                              ) : (
                                <span>Selecione uma data</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
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
                  control={form.control}
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
                  control={form.control}
                  name="clienteId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cliente</FormLabel>
                      <Select onValueChange={handleClienteChange} value={field.value}>
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
                  control={form.control}
                  name="servico"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Serviço</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ex: Consulta, Terapia..." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
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
                  control={form.control}
                  name="formaPagamento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Forma de Pagamento</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
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
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
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

                <FormField
                  control={form.control}
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

                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    {editingAtendimento ? 'Atualizar' : 'Agendar'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setOpenDialog(false);
                      setEditingAtendimento(null);
                      form.reset();
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

      {/* Busca */}
      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar por cliente ou serviço..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista de Atendimentos */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Atendimentos</h2>
        {atendimentosOrdenados.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="flex flex-col items-center justify-center py-8">
              <CalendarIcon className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                {busca ? 'Nenhum atendimento encontrado' : 'Nenhum atendimento agendado'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {atendimentosOrdenados.map((atendimento) => (
              <Card key={atendimento.id} className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {new Date(atendimento.data).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{atendimento.hora}</span>
                        </div>
                        <span className={`text-sm font-medium ${getStatusColor(atendimento.status)}`}>
                          {getStatusLabel(atendimento.status)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{atendimento.clienteNome}</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            {atendimento.servico} • {getFormaPagamentoLabel(atendimento.formaPagamento)}
                          </p>
                          {atendimento.observacoes && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {atendimento.observacoes}
                            </p>
                          )}
                        </div>
                        <span className="font-bold text-lg">
                          {formatCurrency(atendimento.valor)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => editarAtendimento(atendimento)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removerAtendimento(atendimento.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
