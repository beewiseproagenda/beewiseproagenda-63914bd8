
import React, { useState } from 'react';
import { Package, Plus, Edit, Trash2, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { PieChart } from '@/components/PieChart';
import { toast } from "sonner";

export default function ServicosPacotes() {
  const { servicosPacotes, atendimentos, adicionarServicoPacote, atualizarServicoPacote, removerServicoPacote } = useSupabaseData();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    nome: '',
    tipo: 'servico' as 'servico' | 'pacote',
    valor: '',
    descricao: '',
  });

  const resetForm = () => {
    setFormData({
      nome: '',
      tipo: 'servico',
      valor: '',
      descricao: '',
    });
    setEditingItem(null);
    setIsFormOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    const valorNumerico = typeof formData.valor === 'string' ? parseFloat(formData.valor) : formData.valor;
    if (!valorNumerico || valorNumerico <= 0) {
      toast.error("Valor deve ser maior que zero");
      return;
    }

    const submitData = {
      ...formData,
      valor: valorNumerico
    };

    if (editingItem) {
      atualizarServicoPacote(editingItem.id, submitData);
      toast.success("Item atualizado com sucesso!");
    } else {
      adicionarServicoPacote(submitData);
      toast.success("Item cadastrado com sucesso!");
    }

    resetForm();
  };

  const editarItem = (item: any) => {
    setEditingItem(item);
    setFormData({
      nome: item.nome,
      tipo: item.tipo,
      valor: '',
      descricao: item.descricao || '',
    });
    setIsFormOpen(true);
  };

  const excluirItem = (item: any) => {
    if (confirm(`Tem certeza que deseja excluir ${item.nome}?`)) {
      removerServicoPacote(item.id);
      toast.success("Item excluído com sucesso!");
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const itensFiltrados = servicosPacotes.filter(item =>
    item.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.descricao && item.descricao.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Calcular dados do gráfico de pizza para o mês atual
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();
  
  // Pegar vendas do mês anterior para calcular variação
  const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear;

  const vendasMesAtual = servicosPacotes.map(item => {
    const vendasAtual = atendimentos.filter(a => {
      const atendimentoDate = new Date(a.data);
      const atendimentoMonth = atendimentoDate.getMonth() + 1;
      const atendimentoYear = atendimentoDate.getFullYear();
      return a.servico === item.nome && atendimentoMonth === currentMonth && atendimentoYear === currentYear && a.status === 'realizado';
    }).length;

    const vendasAnterior = atendimentos.filter(a => {
      const atendimentoDate = new Date(a.data);
      const atendimentoMonth = atendimentoDate.getMonth() + 1;
      const atendimentoYear = atendimentoDate.getFullYear();
      return a.servico === item.nome && atendimentoMonth === previousMonth && atendimentoYear === previousYear && a.status === 'realizado';
    }).length;

    const variacao = vendasAnterior > 0 ? ((vendasAtual - vendasAnterior) / vendasAnterior) * 100 : vendasAtual > 0 ? 100 : 0;

    return {
      name: item.nome,
      value: vendasAtual,
      color: item.tipo === 'servico' ? 'hsl(var(--chart-faturamento))' : 'hsl(var(--chart-agendado))',
      change: variacao
    };
  }).filter(item => item.value > 0);

  const chartData = vendasMesAtual.length > 0 ? vendasMesAtual : [
    { name: 'Nenhuma venda', value: 1, color: 'hsl(var(--muted))', change: 0 }
  ];

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Serviços e Pacotes</h1>
          <p className="text-muted-foreground">Gerencie seus serviços e pacotes</p>
        </div>
        <Button 
          onClick={() => setIsFormOpen(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Novo Item
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar serviços e pacotes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 max-w-md"
            />
          </div>
        </div>
        <Badge variant="secondary" className="px-3 py-1">
          {itensFiltrados.length} {itensFiltrados.length === 1 ? 'item' : 'itens'}
        </Badge>
      </div>

      {itensFiltrados.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {searchTerm ? 'Nenhum item encontrado' : 'Nenhum item cadastrado'}
            </h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchTerm 
                ? 'Tente ajustar os termos da sua busca' 
                : 'Comece cadastrando seu primeiro serviço ou pacote'
              }
            </p>
            {!searchTerm && (
              <Button onClick={() => setIsFormOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Item
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {itensFiltrados.map((item) => (
            <Card key={item.id} className="hover:bg-card/80 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{item.nome}</CardTitle>
                    <div className="flex gap-2">
                      <Badge variant={item.tipo === 'servico' ? 'default' : 'secondary'} className="text-xs">
                        {item.tipo === 'servico' ? 'Serviço' : 'Pacote'}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {formatCurrency(item.valor)}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => editarItem(item)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => excluirItem(item)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {item.descricao && (
                  <p className="text-sm text-muted-foreground">{item.descricao}</p>
                )}
                <div className="pt-1 text-xs text-muted-foreground">
                  Cadastrado em {new Date(item.criado_em).toLocaleDateString('pt-BR')}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de formulário */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                {editingItem ? 'Editar Item' : 'Novo Item'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Digite o nome do serviço ou pacote"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="tipo">Tipo *</Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(value: 'servico' | 'pacote') => 
                      setFormData({ ...formData, tipo: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="servico">Serviço</SelectItem>
                      <SelectItem value="pacote">Pacote</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="valor">Valor (R$) *</Label>
                    <Input
                      id="valor"
                      type="number"
                      step="0.01"
                      value={formData.valor}
                      onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                      placeholder="0,00"
                      required
                    />
                </div>

                <div>
                  <Label htmlFor="descricao">Descrição</Label>
                  <Textarea
                    id="descricao"
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    placeholder="Descreva o serviço ou pacote"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1">
                    {editingItem ? 'Atualizar' : 'Cadastrar'}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Gráfico de Pizza - Vendas do Mês */}
      <div className="mt-6">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="lg:col-span-2">
            <div className="bg-card rounded-lg border p-6">
              <PieChart 
                data={chartData}
                title={`Distribuição de Vendas - ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
