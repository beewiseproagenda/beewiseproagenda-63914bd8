import { useState } from "react";
import { Plus, Pencil, Trash2, TrendingUp, DollarSign } from "lucide-react";
import { RecurrenceFields } from "@/components/RecurrenceFields";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { FinancialChart } from "@/components/FinancialChart";
import { Checkbox } from "@/components/ui/checkbox";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const receitaSchema = z.object({
  data: z.date(),
  valor: z.number().min(0.01, "Valor deve ser maior que zero"),
  descricao: z.string().min(1, "Descrição é obrigatória"),
  categoria: z.enum(['servico_prestado', 'atendimento', 'consultoria', 'curso', 'produto', 'outros']),
  formaPagamento: z.enum(['dinheiro', 'pix', 'cartao_debito', 'cartao_credito', 'transferencia', 'outro']),
  observacoes: z.string().optional(),
  recorrente: z.boolean().optional(),
  recorrencia: z.object({
    tipo: z.enum(['diaria', 'semanal', 'mensal']),
    // Campos comuns
    startDate: z.date().optional(),
    endDate: z.date().optional(),
    // Campos para recorrência semanal
    weekdays: z.array(z.number()).optional(),
    intervalWeeks: z.number().min(1).optional(),
    // Campos para recorrência mensal
    dayOfMonth: z.number().min(1).max(31).optional(),
    intervalMonths: z.number().min(1).optional(),
  }).optional(),
});

const despesaSchema = z.object({
  data: z.date(),
  valor: z.number().min(0.01, "Valor deve ser maior que zero"),
  descricao: z.string().min(1, "Descrição é obrigatória"),
  categoria: z.enum(['aluguel', 'internet', 'marketing', 'equipamentos', 'transporte', 'alimentacao', 'sistema', 'aplicativos', 'servico_contratado', 'outros']),
  observacoes: z.string().optional(),
  recorrente: z.boolean().optional(),
  recorrencia: z.object({
    tipo: z.enum(['diaria', 'semanal', 'mensal']),
    // Campos comuns
    startDate: z.date().optional(),
    endDate: z.date().optional(),
    // Campos para recorrência semanal
    weekdays: z.array(z.number()).optional(),
    intervalWeeks: z.number().min(1).optional(),
    // Campos para recorrência mensal
    dayOfMonth: z.number().min(1).max(31).optional(),
    intervalMonths: z.number().min(1).optional(),
  }).optional(),
});

export default function Financeiro() {
  const { receitas, despesas, calcularDadosFinanceiros, adicionarDespesa, atualizarDespesa, removerDespesa, adicionarReceita, atualizarReceita, removerReceita } = useSupabaseData();
  const dadosFinanceiros = calcularDadosFinanceiros();
  const [openReceitaDialog, setOpenReceitaDialog] = useState(false);
  const [openDespesaDialog, setOpenDespesaDialog] = useState(false);
  const [editingReceita, setEditingReceita] = useState<string | null>(null);
  const [editingDespesa, setEditingDespesa] = useState<string | null>(null);

  const receitaForm = useForm<z.infer<typeof receitaSchema>>({
    resolver: zodResolver(receitaSchema),
    defaultValues: {
      data: new Date(),
      valor: undefined,
      descricao: "",
      categoria: "servico_prestado",
      formaPagamento: "pix",
      observacoes: "",
      recorrente: false,
    },
  });

  const despesaForm = useForm<z.infer<typeof despesaSchema>>({
    resolver: zodResolver(despesaSchema),
    defaultValues: {
      data: new Date(),
      valor: undefined,
      descricao: "",
      categoria: "outros",
      observacoes: "",
      recorrente: false,
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    const signal = value > 0 ? '+' : '';
    return `${signal}${value.toFixed(1)}%`;
  };

  const getCategoriaReceitaLabel = (categoria: string) => {
    const labels = {
      servico_prestado: 'Serviço Prestado',
      atendimento: 'Atendimento',
      consultoria: 'Consultoria',
      curso: 'Curso',
      produto: 'Produto',
      outros: 'Outros'
    };
    return labels[categoria as keyof typeof labels] || categoria;
  };

  const getCategoriaDespesaLabel = (categoria: string) => {
    const labels = {
      aluguel: 'Aluguel',
      internet: 'Internet',
      marketing: 'Marketing',
      equipamentos: 'Equipamentos',
      transporte: 'Transporte',
      alimentacao: 'Alimentação',
      sistema: 'Sistema',
      aplicativos: 'Aplicativos',
      servico_contratado: 'Serviço Contratado',
      outros: 'Outros'
    };
    return labels[categoria as keyof typeof labels] || categoria;
  };

  const getFormaPagamentoLabel = (forma: string) => {
    const labels = {
      dinheiro: 'Dinheiro',
      pix: 'PIX',
      cartao_debito: 'Cartão Débito',
      cartao_credito: 'Cartão Crédito',
      transferencia: 'Transferência',
      outro: 'Outro'
    };
    return labels[forma as keyof typeof labels] || forma;
  };

  const onSubmitReceita = async (data: z.infer<typeof receitaSchema>) => {
    try {
      // FIX: Use local date format to prevent timezone shift (-1 day bug)
      const year = data.data.getFullYear();
      const month = String(data.data.getMonth() + 1).padStart(2, '0');
      const day = String(data.data.getDate()).padStart(2, '0');
      const localDateStr = `${year}-${month}-${day}`;
      
      console.log('[BW][FIN_DATES] Saving receita with local date:', { original: data.data, localDateStr });
      
      // Process recorrencia to include date strings if applicable
      let recorrenciaData = null;
      if (data.recorrente && data.recorrencia) {
        recorrenciaData = {
          tipo: data.recorrencia.tipo,
          // Convert dates to strings
          startDate: data.recorrencia.startDate 
            ? `${data.recorrencia.startDate.getFullYear()}-${String(data.recorrencia.startDate.getMonth() + 1).padStart(2, '0')}-${String(data.recorrencia.startDate.getDate()).padStart(2, '0')}`
            : localDateStr,
          endDate: data.recorrencia.endDate 
            ? `${data.recorrencia.endDate.getFullYear()}-${String(data.recorrencia.endDate.getMonth() + 1).padStart(2, '0')}-${String(data.recorrencia.endDate.getDate()).padStart(2, '0')}`
            : null,
          // Type-specific fields
          ...(data.recorrencia.tipo === 'semanal' && {
            weekdays: data.recorrencia.weekdays || [],
            intervalWeeks: data.recorrencia.intervalWeeks || 1,
          }),
          ...(data.recorrencia.tipo === 'mensal' && {
            dayOfMonth: data.recorrencia.dayOfMonth || 1,
            intervalMonths: data.recorrencia.intervalMonths || 1,
          }),
        };
      }
      
      const receitaData = {
        data: localDateStr,
        valor: data.valor,
        descricao: data.descricao,
        categoria: data.categoria,
        forma_pagamento: data.formaPagamento,
        tipo: data.recorrente ? 'fixa' : 'variavel', // Recorrente = fixa, Único = variavel
        observacoes: data.observacoes || "",
        recorrente: data.recorrente || false,
        recorrencia: recorrenciaData,
      };

      if (editingReceita) {
        await atualizarReceita(editingReceita, receitaData);
        setEditingReceita(null);
      } else {
        await adicionarReceita(receitaData);
      }
      
      receitaForm.reset();
      setOpenReceitaDialog(false);
    } catch (error) {
      console.error('Erro ao salvar receita:', error);
    }
  };

  const onSubmitDespesa = async (data: z.infer<typeof despesaSchema>) => {
    try {
      // FIX: Use local date format to prevent timezone shift (-1 day bug)
      const year = data.data.getFullYear();
      const month = String(data.data.getMonth() + 1).padStart(2, '0');
      const day = String(data.data.getDate()).padStart(2, '0');
      const localDateStr = `${year}-${month}-${day}`;
      
      console.log('[BW][FIN_DATES] Saving despesa with local date:', { original: data.data, localDateStr });
      
      // Process recorrencia to include date strings if applicable
      let recorrenciaData = null;
      if (data.recorrente && data.recorrencia) {
        recorrenciaData = {
          tipo: data.recorrencia.tipo,
          // Convert dates to strings
          startDate: data.recorrencia.startDate 
            ? `${data.recorrencia.startDate.getFullYear()}-${String(data.recorrencia.startDate.getMonth() + 1).padStart(2, '0')}-${String(data.recorrencia.startDate.getDate()).padStart(2, '0')}`
            : localDateStr,
          endDate: data.recorrencia.endDate 
            ? `${data.recorrencia.endDate.getFullYear()}-${String(data.recorrencia.endDate.getMonth() + 1).padStart(2, '0')}-${String(data.recorrencia.endDate.getDate()).padStart(2, '0')}`
            : null,
          // Type-specific fields
          ...(data.recorrencia.tipo === 'semanal' && {
            weekdays: data.recorrencia.weekdays || [],
            intervalWeeks: data.recorrencia.intervalWeeks || 1,
          }),
          ...(data.recorrencia.tipo === 'mensal' && {
            dayOfMonth: data.recorrencia.dayOfMonth || 1,
            intervalMonths: data.recorrencia.intervalMonths || 1,
          }),
        };
      }
      
      const despesaData = {
        data: localDateStr,
        valor: data.valor,
        descricao: data.descricao,
        categoria: data.categoria,
        tipo: data.recorrente ? 'fixa' : 'variavel', // Recorrente = fixa, Único = variavel
        observacoes: data.observacoes || "",
        recorrente: data.recorrente || false,
        recorrencia: recorrenciaData,
      };

      if (editingDespesa) {
        await atualizarDespesa(editingDespesa, despesaData);
        setEditingDespesa(null);
      } else {
        await adicionarDespesa(despesaData);
      }
      
      despesaForm.reset();
      setOpenDespesaDialog(false);
    } catch (error) {
      console.error('Erro ao salvar despesa:', error);
    }
  };

  const editReceita = (receita: any) => {
    setEditingReceita(receita.id);
    
    // Process recorrencia to convert date strings back to Date objects
    let recorrenciaData = receita.recorrencia;
    if (recorrenciaData) {
      recorrenciaData = {
        ...recorrenciaData,
        startDate: recorrenciaData.startDate ? new Date(recorrenciaData.startDate) : undefined,
        endDate: recorrenciaData.endDate ? new Date(recorrenciaData.endDate) : undefined,
      };
    }
    
    receitaForm.reset({
      data: new Date(receita.data),
      valor: receita.valor,
      descricao: receita.descricao,
      categoria: receita.categoria,
      formaPagamento: receita.forma_pagamento,
      observacoes: receita.observacoes || "",
      recorrente: receita.recorrente || false,
      recorrencia: recorrenciaData || undefined,
    });
    setOpenReceitaDialog(true);
  };

  const editDespesa = (despesa: any) => {
    setEditingDespesa(despesa.id);
    
    // Process recorrencia to convert date strings back to Date objects
    let recorrenciaData = despesa.recorrencia;
    if (recorrenciaData) {
      recorrenciaData = {
        ...recorrenciaData,
        startDate: recorrenciaData.startDate ? new Date(recorrenciaData.startDate) : undefined,
        endDate: recorrenciaData.endDate ? new Date(recorrenciaData.endDate) : undefined,
      };
    }
    
    despesaForm.reset({
      data: new Date(despesa.data),
      valor: despesa.valor,
      descricao: despesa.descricao,
      categoria: despesa.categoria,
      observacoes: despesa.observacoes || "",
      recorrente: despesa.recorrente || false,
      recorrencia: recorrenciaData || undefined,
    });
    setOpenDespesaDialog(true);
  };

  // Preparar dados para Gráfico 1 (Evolução - Últimos 4 meses)
  const chartData = dadosFinanceiros.historicoMensal.map(item => ({
    mes: item.mes,
    faturamento: item.realizado,
    realizado: item.realizado,
    agendado: item.agendado,
    despesas: item.despesas,
    lucro: item.realizado - item.despesas
  }));

  // Preparar dados para Gráfico 2 (Projeções - Próximos 4 meses)
  const projecaoData = dadosFinanceiros.projecaoMensal.map(item => ({
    mes: item.mes,
    faturamento: item.receitas,
    realizado: item.receitas,
    agendado: item.agendados,
    despesas: item.despesas,
    lucro: item.lucro
  }));

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-0">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Financeiro</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Controle suas receitas e despesas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="month-filter" className="text-sm">Mês:</Label>
          <Select defaultValue={new Date().getMonth().toString()}>
            <SelectTrigger className="w-[140px] sm:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({length: 12}, (_, i) => (
                <SelectItem key={i} value={i.toString()}>
                  {new Date(2024, i, 1).toLocaleDateString('pt-BR', { month: 'long' })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabelas - Primeiro na página */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Receitas */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Receitas</CardTitle>
              <Dialog open={openReceitaDialog} onOpenChange={setOpenReceitaDialog}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Receita
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {editingReceita ? 'Editar Receita' : 'Nova Receita'}
                    </DialogTitle>
                  </DialogHeader>
                  <Form {...receitaForm}>
                    <form onSubmit={receitaForm.handleSubmit(onSubmitReceita)} className="space-y-4">
                      <FormField
                        control={receitaForm.control}
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
                        control={receitaForm.control}
                        name="valor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Valor (R$)</FormLabel>
                            <FormControl>
                               <Input
                                 type="number"
                                 step="0.01"
                                 placeholder="Digite o valor"
                                 {...field}
                                 onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                               />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={receitaForm.control}
                        name="descricao"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Descrição</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={receitaForm.control}
                        name="categoria"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Categoria</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione uma categoria" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="servico_prestado">Serviço Prestado</SelectItem>
                                <SelectItem value="atendimento">Atendimento</SelectItem>
                                <SelectItem value="consultoria">Consultoria</SelectItem>
                                <SelectItem value="curso">Curso</SelectItem>
                                <SelectItem value="produto">Produto</SelectItem>
                                <SelectItem value="outros">Outros</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={receitaForm.control}
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
                        control={receitaForm.control}
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
                        control={receitaForm.control}
                        name="recorrente"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>
                                Lançamento recorrente
                              </FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />

                      {receitaForm.watch("recorrente") && (
                        <>
                          <FormField
                            control={receitaForm.control}
                            name="recorrencia.tipo"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Tipo de Recorrência</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Selecione o tipo" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="diaria">Diária</SelectItem>
                                    <SelectItem value="semanal">Semanal</SelectItem>
                                    <SelectItem value="mensal">Mensal</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <RecurrenceFields 
                            form={receitaForm} 
                            recurrenceType={receitaForm.watch("recorrencia.tipo")}
                          />
                        </>
                      )}

                      <div className="flex gap-2">
                        <Button type="submit" className="flex-1">
                          {editingReceita ? 'Atualizar' : 'Adicionar'}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setOpenReceitaDialog(false);
                            setEditingReceita(null);
                            receitaForm.reset();
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
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Data</TableHead>
                    <TableHead className="min-w-[200px]">Descrição</TableHead>
                    <TableHead className="whitespace-nowrap">Valor</TableHead>
                    <TableHead className="whitespace-nowrap">Ações</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {receitas.map((receita) => (
                  <TableRow key={receita.id}>
                    <TableCell>
                      {new Date(receita.data).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{receita.descricao}</p>
                        <p className="text-sm text-muted-foreground">
                          {getCategoriaReceitaLabel(receita.categoria)} • {getFormaPagamentoLabel(receita.forma_pagamento)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-green-600 font-medium">
                      {formatCurrency(receita.valor)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => editReceita(receita)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removerReceita(receita.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Despesas */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Despesas</CardTitle>
              <Dialog open={openDespesaDialog} onOpenChange={setOpenDespesaDialog}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Despesa
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {editingDespesa ? 'Editar Despesa' : 'Nova Despesa'}
                    </DialogTitle>
                  </DialogHeader>
                  <Form {...despesaForm}>
                    <form onSubmit={despesaForm.handleSubmit(onSubmitDespesa)} className="space-y-4">
                      <FormField
                        control={despesaForm.control}
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
                        control={despesaForm.control}
                        name="valor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Valor (R$)</FormLabel>
                            <FormControl>
                               <Input
                                 type="number"
                                 step="0.01"
                                 placeholder="Digite o valor"
                                 {...field}
                                 onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                               />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={despesaForm.control}
                        name="descricao"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Descrição</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={despesaForm.control}
                        name="categoria"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Categoria</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione uma categoria" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="aluguel">Aluguel</SelectItem>
                                <SelectItem value="internet">Internet</SelectItem>
                                <SelectItem value="marketing">Marketing</SelectItem>
                                <SelectItem value="equipamentos">Equipamentos</SelectItem>
                                <SelectItem value="transporte">Transporte</SelectItem>
                                <SelectItem value="alimentacao">Alimentação</SelectItem>
                                <SelectItem value="sistema">Sistema</SelectItem>
                                <SelectItem value="aplicativos">Aplicativos</SelectItem>
                                <SelectItem value="servico_contratado">Serviço Contratado</SelectItem>
                                <SelectItem value="outros">Outros</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={despesaForm.control}
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
                        control={despesaForm.control}
                        name="recorrente"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>
                                Lançamento recorrente
                              </FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />

                      {despesaForm.watch("recorrente") && (
                        <>
                          <FormField
                            control={despesaForm.control}
                            name="recorrencia.tipo"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Tipo de Recorrência</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Selecione o tipo" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="diaria">Diária</SelectItem>
                                    <SelectItem value="semanal">Semanal</SelectItem>
                                    <SelectItem value="mensal">Mensal</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <RecurrenceFields 
                            form={despesaForm} 
                            recurrenceType={despesaForm.watch("recorrencia.tipo")}
                          />
                        </>
                      )}

                      <div className="flex gap-2">
                        <Button type="submit" className="flex-1">
                          {editingDespesa ? 'Atualizar' : 'Adicionar'}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setOpenDespesaDialog(false);
                            setEditingDespesa(null);
                            despesaForm.reset();
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
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Data</TableHead>
                    <TableHead className="min-w-[200px]">Descrição</TableHead>
                    <TableHead className="whitespace-nowrap">Valor</TableHead>
                    <TableHead className="whitespace-nowrap">Ações</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {despesas.map((despesa) => (
                  <TableRow key={despesa.id}>
                    <TableCell>
                      {new Date(despesa.data).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{despesa.descricao}</p>
                        <p className="text-sm text-muted-foreground">
                          {getCategoriaDespesaLabel(despesa.categoria)} • {despesa.tipo === 'fixa' ? 'Fixa' : 'Variável'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-red-600 font-medium">
                      {formatCurrency(despesa.valor)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => editDespesa(despesa)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removerDespesa(despesa.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumo Financeiro com variações */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturamento do Mês</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-foreground break-words">
              {formatCurrency(dadosFinanceiros.faturamentoMesAtual)}
            </div>
            <p className={`text-xs mt-1 ${dadosFinanceiros.variacaoFaturamento >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatPercentage(dadosFinanceiros.variacaoFaturamento)} vs mês anterior
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesas do Mês</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-foreground break-words">
              {formatCurrency(dadosFinanceiros.totalDespesas)}
            </div>
            <p className={`text-xs mt-1 ${dadosFinanceiros.variacaoDespesas >= 0 ? 'text-red-500' : 'text-green-500'}`}>
              {formatPercentage(dadosFinanceiros.variacaoDespesas)} vs mês anterior
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lucro Líquido</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-lg sm:text-2xl font-bold break-words ${dadosFinanceiros.lucroLiquido >= 0 ? 'text-foreground' : 'text-red-500'}`}>
              {formatCurrency(dadosFinanceiros.lucroLiquido)}
            </div>
            <p className={`text-xs mt-1 ${dadosFinanceiros.variacaoLucro >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatPercentage(dadosFinanceiros.variacaoLucro)} vs mês anterior
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Evolução - Apenas dados confirmados dos últimos 4 meses */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Evolução Financeira (Últimos 4 Meses)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FinancialChart data={chartData.slice(-4)} type="line" />
        </CardContent>
      </Card>

      {/* Gráfico de Projeções - Próximos 4 meses incluindo atual */}
      {projecaoData.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Projeções (Próximos 4 Meses)
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Mês corrente: valores reais (iguais ao Gráfico 1). Meses futuros: valores esperados.
            </p>
          </CardHeader>
          <CardContent>
            <FinancialChart data={projecaoData} type="line" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
