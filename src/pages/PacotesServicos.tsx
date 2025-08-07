
import React, { useState } from 'react';
import { Package, Plus, Edit, Trash2, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useSupabaseData } from '@/hooks/useSupabaseData';
import type { ServicoPacote } from '@/hooks/useSupabaseData';
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { toast } from "sonner";

export default function PacotesServicos() {
  const { servicosPacotes, adicionarServicoPacote, atualizarServicoPacote, removerServicoPacote } = useSupabaseData();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ServicoPacote | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; item: ServicoPacote | null }>({ open: false, item: null });

  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    valor: '',
  });

  const resetForm = () => {
    setFormData({
      nome: '',
      descricao: '',
      valor: '',
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

    const valor = parseFloat(formData.valor.toString());
    if (isNaN(valor) || valor <= 0) {
      toast.error("Valor deve ser maior que zero");
      return;
    }

    const servicoPacoteData = {
      ...formData,
      valor,
      tipo: 'servico' as const
    };

    if (editingItem) {
      atualizarServicoPacote(editingItem.id, servicoPacoteData);
      toast.success("Item atualizado com sucesso!");
    } else {
      adicionarServicoPacote(servicoPacoteData);
      toast.success("Item cadastrado com sucesso!");
    }

    resetForm();
  };

  const editarItem = (item: ServicoPacote) => {
    setEditingItem(item);
    setFormData({
      nome: item.nome,
      descricao: item.descricao || '',
      valor: '',
    });
    setIsFormOpen(true);
  };

  const excluirItem = (item: ServicoPacote) => {
    setDeleteDialog({ open: true, item });
  };

  const confirmarExclusao = () => {
    if (deleteDialog.item) {
      removerServicoPacote(deleteDialog.item.id);
      toast.success("Item excluído com sucesso!");
      setDeleteDialog({ open: false, item: null });
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

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Pacotes e Serviços</h1>
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
              placeholder="Buscar pacotes e serviços..."
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
                    <Badge variant="outline" className="text-xs">
                      {formatCurrency(item.valor)}
                    </Badge>
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
                  <Label htmlFor="descricao">Descrição *</Label>
                  <Textarea
                    id="descricao"
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    placeholder="Descreva o serviço ou pacote"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="valor">Valor (R$) *</Label>
                  <Input
                    id="valor"
                    type="number"
                    step="0.01"
                    value={formData.valor}
                    onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                    placeholder="Digite o valor"
                    required
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1">
                    {editingItem ? 'Atualizar' : 'Salvar'}
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

      <ConfirmDeleteDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, item: null })}
        onConfirm={confirmarExclusao}
        title="Confirmar exclusão"
        message={`Tem certeza que deseja excluir ${deleteDialog.item?.nome || 'este item'}? Essa ação não poderá ser desfeita.`}
      />
    </div>
  );
}
