
import React, { useState } from 'react';
import { Users, Plus, Phone, Mail, Calendar, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useMobData } from '@/hooks/useMobData';
import { Cliente } from '@/types';
import { toast } from "sonner";

export default function Clientes() {
  const { clientes, atendimentos, adicionarCliente, atualizarCliente, removerCliente } = useMobData();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    email: '',
  });

  const resetForm = () => {
    setFormData({
      nome: '',
      telefone: '',
      email: '',
    });
    setEditingCliente(null);
    setIsFormOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    if (editingCliente) {
      atualizarCliente(editingCliente.id, formData);
      toast.success("Cliente atualizado com sucesso!");
    } else {
      adicionarCliente(formData);
      toast.success("Cliente cadastrado com sucesso!");
    }

    resetForm();
  };

  const editarCliente = (cliente: Cliente) => {
    setEditingCliente(cliente);
    setFormData({
      nome: cliente.nome,
      telefone: cliente.telefone,
      email: cliente.email,
    });
    setIsFormOpen(true);
  };

  const excluirCliente = (cliente: Cliente) => {
    if (confirm(`Tem certeza que deseja excluir o cliente ${cliente.nome}? Todos os atendimentos associados também serão removidos.`)) {
      removerCliente(cliente.id);
      toast.success("Cliente excluído com sucesso!");
    }
  };

  const getClienteAtendimentos = (clienteId: string) => {
    return atendimentos.filter(a => a.clienteId === clienteId);
  };

  const clientesFiltrados = clientes.filter(cliente =>
    cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.telefone.includes(searchTerm)
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Clientes</h1>
          <p className="text-muted-foreground">Gerencie seu cadastro de clientes</p>
        </div>
        <Button 
          onClick={() => setIsFormOpen(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Novo Cliente
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Input
            placeholder="Buscar clientes por nome, email ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>
        <Badge variant="secondary" className="px-3 py-1">
          {clientesFiltrados.length} cliente{clientesFiltrados.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {clientesFiltrados.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {searchTerm ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
            </h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchTerm 
                ? 'Tente ajustar os termos da sua busca' 
                : 'Comece cadastrando seu primeiro cliente'
              }
            </p>
            {!searchTerm && (
              <Button onClick={() => setIsFormOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Cliente
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clientesFiltrados.map((cliente) => {
            const clienteAtendimentos = getClienteAtendimentos(cliente.id);
            const ultimoAtendimento = clienteAtendimentos
              .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())[0];
            
            return (
              <Card key={cliente.id} className="hover:bg-card/80 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{cliente.nome}</CardTitle>
                      <Badge variant="outline" className="text-xs">
                        {clienteAtendimentos.length} atendimento{clienteAtendimentos.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editarCliente(cliente)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => excluirCliente(cliente)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {cliente.telefone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{cliente.telefone}</span>
                    </div>
                  )}
                  {cliente.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{cliente.email}</span>
                    </div>
                  )}
                  {ultimoAtendimento && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Último: {new Date(ultimoAtendimento.data).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  )}
                  <div className="pt-2 text-xs text-muted-foreground">
                    Cadastrado em {new Date(cliente.criadoEm).toLocaleDateString('pt-BR')}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {editingCliente ? 'Editar Cliente' : 'Novo Cliente'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="nome">Nome Completo *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Digite o nome completo"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    placeholder="(11) 99999-9999"
                  />
                </div>

                <div>
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="cliente@email.com"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1">
                    {editingCliente ? 'Atualizar' : 'Cadastrar'}
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
    </div>
  );
}
