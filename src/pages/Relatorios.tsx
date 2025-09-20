import { useState } from "react";
import { Calendar as CalendarIcon, Download, FileText, BarChart3, PieChart, Calculator } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useReports } from "@/hooks/useReports";
import { toast } from "sonner";

export default function Relatorios() {
  const { isGenerating, generateExtratoCompleto, generateLucroMensal, generateAnaliticoCategorias, generateRelatorioContador } = useReports();
  
  // Filtros de período
  const [startDate, setStartDate] = useState<Date>(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const handleGenerateReport = async (reportType: string, format: 'excel' | 'pdf') => {
    try {
      switch (reportType) {
        case 'extrato':
          await generateExtratoCompleto(startDate, endDate, format);
          toast.success(`Extrato completo (${format.toUpperCase()}) gerado com sucesso!`);
          break;
        case 'lucro':
          await generateLucroMensal(selectedYear, format);
          toast.success(`Relatório de lucro mensal (${format.toUpperCase()}) gerado com sucesso!`);
          break;
        case 'categorias':
          await generateAnaliticoCategorias(startDate, endDate, format);
          toast.success(`Relatório analítico de categorias (${format.toUpperCase()}) gerado com sucesso!`);
          break;
        case 'contador':
          await generateRelatorioContador(selectedMonth, selectedYear, format);
          toast.success(`Relatório para contador (${format.toUpperCase()}) gerado com sucesso!`);
          break;
      }
    } catch (error) {
      toast.error('Erro ao gerar relatório. Tente novamente.');
    }
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const months = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' }
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Relatórios</h1>
          <p className="text-muted-foreground">
            Gere relatórios detalhados das suas finanças
          </p>
        </div>
      </div>

      {/* Filtros de Período */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">Filtros de Período</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Data Inicial</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "dd/MM/yyyy") : "Selecione..."}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => date && setStartDate(date)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Data Final</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "dd/MM/yyyy") : "Selecione..."}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => date && setEndDate(date)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Mês</Label>
              <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value.toString()}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Ano</Label>
              <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Relatórios Disponíveis */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Extrato Completo */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle>Extrato Completo</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Lista detalhada de todas as receitas e despesas do período selecionado, 
              organizada por data com categorias e valores.
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleGenerateReport('extrato', 'excel')}
                disabled={isGenerating}
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                Excel
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleGenerateReport('extrato', 'pdf')}
                disabled={isGenerating}
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lucro Líquido Mensal */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <CardTitle>Lucro Líquido Mensal</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Comparativo mês a mês das receitas, despesas e lucro líquido 
              do ano selecionado, ideal para análise de desempenho.
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleGenerateReport('lucro', 'excel')}
                disabled={isGenerating}
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                Excel
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleGenerateReport('lucro', 'pdf')}
                disabled={isGenerating}
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Análise por Categorias */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary" />
              <CardTitle>Análise por Categorias</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Relatório detalhado mostrando quanto foi gasto em cada categoria 
              de despesa e recebido em cada categoria de receita.
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleGenerateReport('categorias', 'excel')}
                disabled={isGenerating}
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                Excel
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleGenerateReport('categorias', 'pdf')}
                disabled={isGenerating}
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Relatório para Contador */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              <CardTitle>Relatório para Contador</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Resumo consolidado das receitas e despesas do mês selecionado 
              com totalizadores, formatado para envio ao contador.
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleGenerateReport('contador', 'excel')}
                disabled={isGenerating}
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                Excel
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleGenerateReport('contador', 'pdf')}
                disabled={isGenerating}
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status de Geração */}
      {isGenerating && (
        <Card className="bg-card border-border">
          <CardContent className="py-4">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              Gerando relatório...
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}