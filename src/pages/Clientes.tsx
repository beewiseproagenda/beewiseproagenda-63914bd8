import React, { useState } from 'react';
import { Users, Plus, Phone, Mail, Calendar, Edit, Trash2, TrendingUp, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useMobData } from '@/hooks/useMobData';
import { Cliente } from '@/types';
import { toast } from "sonner";

export default function Clientes() {
  const { clientes, atendimentos, servicosPacotes, adicionarCliente, atualizarCliente, removerCliente } = useMobData();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    email: '',
    recorrente: false,
    recorrencia: 'semanal' as 'diaria' | 'semanal' | 'mensal',
    pacoteId: '',
    tipoCobranca: 'variavel' as 'pacote' | 'variavel',
  });

  const resetForm = () => {
    setFormData({
      nome: '',
      telefone: '',
      email: '',
      recorrente: false,
      recorrencia: 'semanal',
      pacoteId: '',
      tipoCobranca: 'variavel',
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

    const clienteData = {
      nome: formData.nome,
      telefone: formData.telefone,
      email: formData.email,
      ...(formData.recorrente && {
        recorrente: formData.recorrente,
        recorrencia: formData.recorrencia,
        ...(formData.tipoCobranca === 'pacote' && formData.pacoteId && {
          pacoteId: formData.pacoteId
        }),
        tipoCobranca: formData.tipoCobranca,
      })
    };

    if (editingCliente) {
      atualizarCliente(editingCliente.id, clienteData);
      toast.success("Cliente atualizado com sucesso!");
    } else {
      adicionarCliente(clienteData);
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
      recorrente: cliente.recorrente || false,
      recorrencia: cliente.recorrencia || 'semanal',
      pacoteId: cliente.pacoteId || '',
      tipoCobranca: cliente.tipoCobranca || 'variavel',
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

  const getClienteReceita = (clienteId: string) => {
    return atendimentos
      .filter(a => a.clienteId === clienteId && a.status === 'realizado')
      .reduce((total, a) => total + a.valor, 0);
  };

  const getPacoteNome = (pacoteId: string) => {
    const pacote = servicosPacotes.find(p => p.id === pacoteId);
    return pacote ? pacote.nome : '';
  };

  // Top 5 clientes por receita
  const topClientesPorReceita = clientes
    .map(cliente => ({
      ...cliente,
      receita: getClienteReceita(cliente.id),
      totalAtendimentos: getClienteAtendimentos(cliente.id).length
    }))
    .sort((a, b) => b.receita - a.receita)
    .slice(0, 5);

  // Clientes sem agendamento há muito tempo (60 dias)
  const dataLimite = new Date();
  dataLimite.setDate(dataLimite.getDate() - 60);
  
  const clientesSemAgendamento = clientes.filter(cliente => {
    const ultimosAtendimentos = atendimentos
      .filter(a => a.clienteId === cliente.id)
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    
    if (ultimosAtendimentos.length === 0) return true;
    
    const ultimoAtendimento = new Date(ultimosAtendimentos[0].data);
    return ultimoAtendimento < dataLimite;
  });

  const clientesFiltrados = clientes.filter(cliente =>
    cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.telefone.includes(searchTerm)
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="space-y-4 p-4">
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

      {/* Top 5 Clientes por Receita */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Top 5 Clientes por Receita
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topClientesPorReceita.length > 0 ? (
              topClientesPorReceita.map((cliente, index) => (
                <div key={cliente.id} className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/10">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{cliente.nome}</p>
                      <p className="text-sm text-muted-foreground">{cliente.totalAtendimentos} atendimentos</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">{formatCurrency(cliente.receita)}</p>
                    <p className="text-xs text-muted-foreground">Total gerado</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-4">Nenhum cliente com receita ainda</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Clientes com Potencial Churn */}
      {clientesSemAgendamento.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Clientes sem Agendamento
              <Badge variant="destructive" className="ml-2">
                {clientesSemAgendamento.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {clientesSemAgendamento.slice(0, 6).map((cliente) => (
                <div key={cliente.id} className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="font-medium text-foreground">{cliente.nome}</p>
                  <p className="text-sm text-muted-foreground">{cliente.telefone}</p>
                  <p className="text-xs text-amber-600 mt-1">Sem agendamento há +60 dias</p>
                </div>
              ))}
            </div>
            {clientesSemAgendamento.length > 6 && (
              <p className="text-center text-sm text-muted-foreground mt-2">
                +{clientesSemAgendamento.length - 6} outros clientes
              </p>
            )}
          </CardContent>
        </Card>
      )}

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
          <CardContent className="flex flex-col items-center justify-center py-8">
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
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {clientesFiltrados.map((cliente) => {
            const clienteAtendimentos = getClienteAtendimentos(cliente.id);
            const clienteReceita = getClienteReceita(cliente.id);
            const ultimoAtendimento = clienteAtendimentos
              .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())[0];
            
            return (
              <Card key={cliente.id} className="hover:bg-card/80 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{cliente.nome}</CardTitle>
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {clienteAtendimentos.length} atendimento{clienteAtendimentos.length !== 1 ? 's' : ''}
                        </Badge>
                        {clienteReceita > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {formatCurrency(clienteReceita)}
                          </Badge>
                        )}
                        {cliente.recorrente && (
                          <Badge variant="default" className="text-xs">
                            Recorrente
                          </Badge>
                        )}
                        {cliente.pacoteId && (
                          <Badge variant="outline" className="text-xs">
                            {getPacoteNome(cliente.pacoteId)}
                          </Badge>
                        )}
                      </div>
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
                <CardContent className="space-y-2">
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
                  {cliente.recorrente && (
                    <div className="text-sm text-muted-foreground">
                      Recorrência: {cliente.recorrencia}
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
                  <div className="pt-1 text-xs text-muted-foreground">
                    Cadastrado em {new Date(cliente.criadoEm).toLocaleDateString('pt-BR')}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal de formulário */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
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

                <div>
                  <Label>Cliente recorrente?</Label>
                  <RadioGroup
                    value={formData.recorrente ? 'sim' : 'nao'}
                    onValueChange={(value) => setFormData({ ...formData, recorrente: value === 'sim' })}
                    className="flex gap-4 mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="sim" id="sim" />
                      <Label htmlFor="sim">Sim</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="nao" id="nao" />
                      <Label htmlFor="nao">Não</Label>
                    </div>
                  </RadioGroup>
                </div>

                {formData.recorrente && (
                  <>
                    <div>
                      <Label>Recorrência</Label>
                      <Select
                        value={formData.recorrencia}
                        onValueChange={(value: 'diaria' | 'semanal' | 'mensal') => 
                          setFormData({ ...formData, recorrencia: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a recorrência" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="diaria">Diária</SelectItem>
                          <SelectItem value="semanal">Semanal</SelectItem>
                          <SelectItem value="mensal">Mensal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Tipo de Cobrança</Label>
                      <RadioGroup
                        value={formData.tipoCobranca}
                        onValueChange={(value: 'pacote' | 'variavel') => 
                          setFormData({ ...formData, tipoCobranca: value })
                        }
                        className="mt-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="pacote" id="pacote" />
                          <Label htmlFor="pacote">Pacote fixo</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="variavel" id="variavel" />
                          <Label htmlFor="variavel">Cobrança variável</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {formData.tipoCobranca === 'pacote' && (
                      <div>
                        <Label>Pacote do Cliente</Label>
                        <Select
                          value={formData.pacoteId}
                          onValueChange={(value) => setFormData({ ...formData, pacoteId: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um pacote" />
                          </SelectTrigger>
                          <SelectContent>
                            {servicosPacotes
                              .filter(item => item.tipo === 'pacote')
                              .map((pacote) => (
                                <SelectItem key={pacote.id} value={pacote.id}>
                                  {pacote.nome} - {formatCurrency(pacote.valor)}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </>
                )}

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
