
import { useState } from "react";
import { Plus, Pencil, Trash2, TrendingUp, DollarSign } from "lucide-react";
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
import { useMobData } from "@/hooks/useMobData";
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
});

const despesaSchema = z.object({
  data: z.date(),
  valor: z.number().min(0.01, "Valor deve ser maior que zero"),
  descricao: z.string().min(1, "Descrição é obrigatória"),
  categoria: z.enum(['aluguel', 'internet', 'marketing', 'equipamentos', 'transporte', 'alimentacao', 'sistema', 'aplicativos', 'servico_contratado', 'outros']),
  tipo: z.enum(['fixa', 'variavel']),
  observacoes: z.string().optional(),
});

export default function Financeiro() {
  const { receitas, despesas, dadosFinanceiros, adicionarReceita, atualizarReceita, removerReceita, adicionarDespesa, atualizarDespesa, removerDespesa } = useMobData();
  const [openReceitaDialog, setOpenReceitaDialog] = useState(false);
  const [openDespesaDialog, setOpenDespesaDialog] = useState(false);
  const [editingReceita, setEditingReceita] = useState<string | null>(null);
  const [editingDespesa, setEditingDespesa] = useState<string | null>(null);

  const receitaForm = useForm<z.infer<typeof receitaSchema>>({
    resolver: zodResolver(receitaSchema),
    defaultValues: {
      data: new Date(),
      valor: 0,
      descricao: "",
      categoria: "servico_prestado",
      formaPagamento: "pix",
      observacoes: "",
    },
  });

  const despesaForm = useForm<z.infer<typeof despesaSchema>>({
    resolver: zodResolver(despesaSchema),
    defaultValues: {
      data: new Date(),
      valor: 0,
      descricao: "",
      categoria: "outros",
      tipo: "variavel",
      observacoes: "",
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
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

  const onSubmitReceita = (data: z.infer<typeof receitaSchema>) => {
    if (editingReceita) {
      atualizarReceita(editingReceita, data);
      setEditingReceita(null);
    } else {
      adicionarReceita(data);
    }
    receitaForm.reset();
    setOpenReceitaDialog(false);
  };

  const onSubmitDespesa = (data: z.infer<typeof despesaSchema>) => {
    if (editingDespesa) {
      atualizarDespesa(editingDespesa, data);
      setEditingDespesa(null);
    } else {
      adicionarDespesa(data);
    }
    despesaForm.reset();
    setOpenDespesaDialog(false);
  };

  const editReceita = (receita: any) => {
    setEditingReceita(receita.id);
    receitaForm.reset({
      data: new Date(receita.data),
      valor: receita.valor,
      descricao: receita.descricao,
      categoria: receita.categoria,
      formaPagamento: receita.formaPagamento,
      observacoes: receita.observacoes || "",
    });
    setOpenReceitaDialog(true);
  };

  const editDespesa = (despesa: any) => {
    setEditingDespesa(despesa.id);
    despesaForm.reset({
      data: new Date(despesa.data),
      valor: despesa.valor,
      descricao: despesa.descricao,
      categoria: despesa.categoria,
      tipo: despesa.tipo,
      observacoes: despesa.observacoes || "",
    });
    setOpenDespesaDialog(true);
  };

  const chartData = dadosFinanceiros.historicoMensal.map(item => ({
    ...item,
    lucro: item.receita - item.despesas
  }));

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Financeiro</h1>
          <p className="text-muted-foreground">
            Controle suas receitas e despesas
          </p>
        </div>
      </div>

      {/* Resumo Financeiro */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita do Mês</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {formatCurrency(dadosFinanceiros.receitaMesAtual)}
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesas do Mês</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {formatCurrency(dadosFinanceiros.totalDespesas)}
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lucro Líquido</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${dadosFinanceiros.lucroLiquido >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatCurrency(dadosFinanceiros.lucroLiquido)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Evolução Financeira
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FinancialChart data={chartData} type="line" />
        </CardContent>
      </Card>

      {/* Tabelas */}
      <div className="grid gap-6 lg:grid-cols-2">
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
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Ações</TableHead>
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
                          {getCategoriaReceitaLabel(receita.categoria)} • {getFormaPagamentoLabel(receita.formaPagamento)}
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
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
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
                        name="tipo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o tipo" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="fixa">Fixa</SelectItem>
                                <SelectItem value="variavel">Variável</SelectItem>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Ações</TableHead>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
