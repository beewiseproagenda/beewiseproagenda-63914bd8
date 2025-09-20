import { useState } from "react";
import { Users, Plus, Search, Phone, Mail, Calendar, Edit, Trash2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import type { Cliente } from "@/hooks/useSupabaseData";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { toast } from "sonner";

export default function Clientes() {
  const { clientes, servicosPacotes, atendimentos, adicionarCliente, atualizarCliente, removerCliente } = useSupabaseData();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; cliente: Cliente | null }>({ open: false, cliente: null });

  const buscarEnderecoPorCep = async (cep: string) => {
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          endereco: {
            ...prev.endereco,
            rua: data.logradouro || prev.endereco.rua,
            bairro: data.bairro || prev.endereco.bairro,
            cidade: data.localidade || prev.endereco.cidade,
            estado: data.uf || prev.endereco.estado,
          }
        }));
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    }
  };

  const [formData, setFormData] = useState({
    nome: "",
    telefone: "",
    email: "",
    tipoPessoa: "cpf" as "cpf" | "cnpj",
    cpfCnpj: "",
    endereco: {
      cep: "",
      rua: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      estado: "",
    },
    recorrente: false,
    recorrencia: "semanal" as "diaria" | "semanal" | "mensal",
    agendamentoFixo: {
      dia: "",
      hora: "",
    },
    pacoteId: "",
    tipoCobranca: "variavel" as "pacote" | "variavel",
  });

  const resetForm = () => {
    setFormData({
      nome: "",
      telefone: "",
      email: "",
      tipoPessoa: "cpf",
      cpfCnpj: "",
      endereco: {
        cep: "",
        rua: "",
        numero: "",
        complemento: "",
        bairro: "",
        cidade: "",
        estado: "",
      },
      recorrente: false,
      recorrencia: "semanal",
      agendamentoFixo: {
        dia: "",
        hora: "",
      },
      pacoteId: "",
      tipoCobranca: "variavel",
    });
    setEditingCliente(null);
    setIsDialogOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    if (!formData.telefone.trim()) {
      toast.error("Telefone é obrigatório");
      return;
    }


    const clienteData = {
      nome: formData.nome,
      telefone: formData.telefone,
      email: formData.email,
      tipo_pessoa: formData.tipoPessoa,
      cpf_cnpj: formData.cpfCnpj,
      endereco: formData.endereco,
      recorrente: formData.recorrente,
      recorrencia: formData.recorrente ? formData.recorrencia : null,
      agendamento_fixo: formData.recorrente && formData.agendamentoFixo.dia && formData.agendamentoFixo.hora 
        ? formData.agendamentoFixo 
        : null,
      pacote_id: formData.pacoteId || null,
      tipo_cobranca: formData.tipoCobranca,
      ultimo_atendimento: null,
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
      email: cliente.email || "",
      tipoPessoa: (cliente.tipo_pessoa as "cpf" | "cnpj") || "cpf",
      cpfCnpj: cliente.cpf_cnpj || "",
      endereco: (typeof cliente.endereco === 'object' && cliente.endereco && !Array.isArray(cliente.endereco)) ? cliente.endereco as any : {
        cep: "",
        rua: "",
        numero: "",
        complemento: "",
        bairro: "",
        cidade: "",
        estado: "",
      },
      recorrente: cliente.recorrente || false,
      recorrencia: (cliente.recorrencia as "diaria" | "semanal" | "mensal") || "semanal",
      agendamentoFixo: (typeof cliente.agendamento_fixo === 'object' && cliente.agendamento_fixo && !Array.isArray(cliente.agendamento_fixo)) ? cliente.agendamento_fixo as any : { dia: "", hora: "" },
      pacoteId: cliente.pacote_id || "",
      tipoCobranca: (cliente.tipo_cobranca as "pacote" | "variavel") || "variavel",
    });
    setIsDialogOpen(true);
  };

  const excluirCliente = (cliente: Cliente) => {
    setDeleteDialog({ open: true, cliente });
  };

  const confirmarExclusao = async () => {
    if (deleteDialog.cliente) {
      try {
        await removerCliente(deleteDialog.cliente.id);
        toast.success("Cliente excluído com sucesso!");
        setDeleteDialog({ open: false, cliente: null });
      } catch (error) {
        console.error('Erro ao excluir cliente:', error);
        toast.error("Erro ao excluir cliente");
      }
    }
  };

  const clientesFiltrados = clientes.filter(cliente =>
    cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.telefone.includes(searchTerm) ||
    (cliente.email && cliente.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Clientes</h1>
          <p className="text-muted-foreground">Gerencie sua base de clientes</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {editingCliente ? 'Editar Cliente' : 'Novo Cliente'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Digite o nome completo"
                  required
                />
              </div>

              <div>
                <Label htmlFor="telefone">Telefone *</Label>
                <Input
                  id="telefone"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  placeholder="(11) 99999-9999"
                  required
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Tipo de Pessoa</Label>
                  <RadioGroup
                    value={formData.tipoPessoa}
                    onValueChange={(value: "cpf" | "cnpj") => {
                      setFormData({ ...formData, tipoPessoa: value, cpfCnpj: "" });
                    }}
                    className="flex gap-6 mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="cpf" id="cpf" />
                      <Label htmlFor="cpf">CPF</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="cnpj" id="cnpj" />
                      <Label htmlFor="cnpj">CNPJ</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div>
                  <Label htmlFor="cpfCnpj">{formData.tipoPessoa.toUpperCase()}</Label>
                  <Input
                    id="cpfCnpj"
                    value={formData.cpfCnpj}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      const maxLength = formData.tipoPessoa === 'cpf' ? 11 : 14;
                      setFormData({ ...formData, cpfCnpj: value.slice(0, maxLength) });
                    }}
                    placeholder={formData.tipoPessoa === 'cpf' ? '000.000.000-00' : '00.000.000/0000-00'}
                    maxLength={formData.tipoPessoa === 'cpf' ? 11 : 14}
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-lg font-medium mb-4">Endereço</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label htmlFor="cep">CEP</Label>
                    <Input
                      id="cep"
                      value={formData.endereco.cep}
                      onChange={(e) => {
                        const cep = e.target.value.replace(/\D/g, '').slice(0, 8);
                        setFormData({ 
                          ...formData, 
                          endereco: { ...formData.endereco, cep: cep }
                        });
                        
                        if (cep.length === 8) {
                          buscarEnderecoPorCep(cep);
                        }
                      }}
                      placeholder="00000-000"
                      maxLength={8}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="numero">Número</Label>
                    <Input
                      id="numero"
                      value={formData.endereco.numero}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        endereco: { ...formData.endereco, numero: e.target.value }
                      })}
                      placeholder="123"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <Label htmlFor="rua">Rua</Label>
                  <Input
                    id="rua"
                    value={formData.endereco.rua}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      endereco: { ...formData.endereco, rua: e.target.value }
                    })}
                    placeholder="Rua das Flores"
                  />
                </div>

                <div className="mb-4">
                  <Label htmlFor="complemento">Complemento</Label>
                  <Input
                    id="complemento"
                    value={formData.endereco.complemento}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      endereco: { ...formData.endereco, complemento: e.target.value }
                    })}
                    placeholder="Apto 101, Bloco A"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label htmlFor="bairro">Bairro</Label>
                    <Input
                      id="bairro"
                      value={formData.endereco.bairro}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        endereco: { ...formData.endereco, bairro: e.target.value }
                      })}
                      placeholder="Centro"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="estado">Estado</Label>
                    <Input
                      id="estado"
                      value={formData.endereco.estado}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        endereco: { ...formData.endereco, estado: e.target.value }
                      })}
                      placeholder="SP"
                      maxLength={2}
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input
                    id="cidade"
                    value={formData.endereco.cidade}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      endereco: { ...formData.endereco, cidade: e.target.value }
                    })}
                    placeholder="São Paulo"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="recorrente"
                  checked={formData.recorrente}
                  onCheckedChange={(checked) => setFormData({ ...formData, recorrente: !!checked })}
                />
                <Label htmlFor="recorrente">Cliente recorrente</Label>
              </div>

              {formData.recorrente && (
                <>
                  <div>
                    <Label htmlFor="recorrencia">Recorrência</Label>
                    <Select
                      value={formData.recorrencia}
                      onValueChange={(value: "diaria" | "semanal" | "mensal") => 
                        setFormData({ ...formData, recorrencia: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="diaria">Diária</SelectItem>
                        <SelectItem value="semanal">Semanal</SelectItem>
                        <SelectItem value="mensal">Mensal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="dia">Dia</Label>
                      <Input
                        id="dia"
                        value={formData.agendamentoFixo.dia}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          agendamentoFixo: { ...formData.agendamentoFixo, dia: e.target.value }
                        })}
                        placeholder="Segunda"
                      />
                    </div>
                    <div>
                      <Label htmlFor="hora">Hora</Label>
                      <Input
                        id="hora"
                        type="time"
                        value={formData.agendamentoFixo.hora}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          agendamentoFixo: { ...formData.agendamentoFixo, hora: e.target.value }
                        })}
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <Label htmlFor="tipoCobranca">Tipo de Cobrança</Label>
                <Select
                  value={formData.tipoCobranca}
                  onValueChange={(value: "pacote" | "variavel") => 
                    setFormData({ ...formData, tipoCobranca: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="variavel">Cobrança Variável</SelectItem>
                    <SelectItem value="pacote">Pacote Fixo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.tipoCobranca === "pacote" && (
                <div>
                  <Label htmlFor="pacoteId">Pacote ou Serviço</Label>
                  <Select
                    value={formData.pacoteId}
                    onValueChange={(value) => setFormData({ ...formData, pacoteId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um pacote ou serviço" />
                    </SelectTrigger>
                    <SelectContent>
                      {servicosPacotes.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.nome} - R$ {item.valor.toFixed(2)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar clientes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 max-w-md"
            />
          </div>
        </div>
        <Badge variant="secondary" className="px-3 py-1">
          {clientesFiltrados.length} {clientesFiltrados.length === 1 ? 'cliente' : 'clientes'}
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
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Cliente
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {clientesFiltrados.map((cliente) => (
            <Card key={cliente.id} className="hover:bg-card/80 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{cliente.nome}</CardTitle>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-xs">
                        <Phone className="h-3 w-3 mr-1" />
                        {cliente.telefone}
                      </Badge>
                      {cliente.email && (
                        <Badge variant="outline" className="text-xs">
                          <Mail className="h-3 w-3 mr-1" />
                          {cliente.email}
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
                {cliente.recorrente && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Recorrência {cliente.recorrencia}
                      {cliente.agendamento_fixo && typeof cliente.agendamento_fixo === 'object' && !Array.isArray(cliente.agendamento_fixo) &&
                        ` - ${(cliente.agendamento_fixo as any).dia} às ${(cliente.agendamento_fixo as any).hora}`
                      }
                    </p>
                  </div>
                )}
                {cliente.tipo_cobranca === "pacote" && cliente.pacote_id && (
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Pacote: {servicosPacotes.find(sp => sp.id === cliente.pacote_id)?.nome}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Estatísticas dos Clientes */}
      <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2 mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Clientes sem Agendamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {clientes
                .filter(cliente => !atendimentos?.some(atendimento => atendimento.cliente_id === cliente.id))
                .slice(0, 5)
                .map(cliente => (
                  <div key={cliente.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <span className="text-sm">{cliente.nome}</span>
                    <Badge variant="outline" className="text-xs">
                      {cliente.telefone}
                    </Badge>
                  </div>
                ))}
              {clientes.filter(cliente => !atendimentos?.some(atendimento => atendimento.cliente_id === cliente.id)).length === 0 && (
                <p className="text-sm text-muted-foreground">Todos os clientes têm agendamentos</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Clientes Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {clientes
                .map(cliente => {
                  const agendamentos = atendimentos?.filter(atendimento => atendimento.cliente_id === cliente.id) || [];
                  const totalFaturamento = agendamentos.reduce((acc, atendimento) => acc + Number(atendimento.valor), 0);
                  return {
                    ...cliente,
                    totalAgendamentos: agendamentos.length,
                    totalFaturamento
                  };
                })
                .filter(cliente => cliente.totalAgendamentos > 0)
                .sort((a, b) => b.totalFaturamento - a.totalFaturamento)
                .slice(0, 5)
                .map(cliente => (
                  <div key={cliente.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{cliente.nome}</span>
                      <span className="text-xs text-muted-foreground">
                        {cliente.totalAgendamentos} agendamentos
                      </span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      R$ {cliente.totalFaturamento.toFixed(2)}
                    </Badge>
                  </div>
                ))}
              {clientes.every(cliente => !atendimentos?.some(atendimento => atendimento.cliente_id === cliente.id)) && (
                <p className="text-sm text-muted-foreground">Nenhum cliente com agendamentos ainda</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top 5 Clientes por Quantidade e Faturamento */}
      <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2 mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top 5 - Quantidade de Consultas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {clientes
                .map(cliente => {
                  const consultasRealizadas = atendimentos?.filter(atendimento => 
                    atendimento.cliente_id === cliente.id && atendimento.status === 'realizado'
                  ) || [];
                  return {
                    ...cliente,
                    totalConsultas: consultasRealizadas.length
                  };
                })
                .filter(cliente => cliente.totalConsultas > 0)
                .sort((a, b) => b.totalConsultas - a.totalConsultas)
                .slice(0, 5)
                .map((cliente, index) => (
                  <div key={cliente.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs w-6 h-6 rounded-full flex items-center justify-center p-0">
                        {index + 1}
                      </Badge>
                      <span className="text-sm font-medium">{cliente.nome}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {cliente.totalConsultas} consultas
                    </Badge>
                  </div>
                ))}
              {clientes.every(cliente => !atendimentos?.some(atendimento => atendimento.cliente_id === cliente.id && atendimento.status === 'realizado')) && (
                <p className="text-sm text-muted-foreground">Nenhuma consulta realizada ainda</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top 5 - Faturamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {clientes
                .map(cliente => {
                  const consultasRealizadas = atendimentos?.filter(atendimento => 
                    atendimento.cliente_id === cliente.id && atendimento.status === 'realizado'
                  ) || [];
                  const totalFaturamento = consultasRealizadas.reduce((acc, atendimento) => acc + Number(atendimento.valor), 0);
                  return {
                    ...cliente,
                    totalFaturamento
                  };
                })
                .filter(cliente => cliente.totalFaturamento > 0)
                .sort((a, b) => b.totalFaturamento - a.totalFaturamento)
                .slice(0, 5)
                .map((cliente, index) => (
                  <div key={cliente.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs w-6 h-6 rounded-full flex items-center justify-center p-0">
                        {index + 1}
                      </Badge>
                      <span className="text-sm font-medium">{cliente.nome}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      R$ {cliente.totalFaturamento.toFixed(2)}
                    </Badge>
                  </div>
                ))}
              {clientes.every(cliente => !atendimentos?.some(atendimento => atendimento.cliente_id === cliente.id && atendimento.status === 'realizado')) && (
                <p className="text-sm text-muted-foreground">Nenhum faturamento registrado ainda</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <ConfirmDeleteDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, cliente: open ? deleteDialog.cliente : null })}
        onConfirm={confirmarExclusao}
        title="Confirmar exclusão"
        message={`Tem certeza que deseja excluir ${deleteDialog.cliente?.nome}? Essa ação não poderá ser desfeita.`}
      />
    </div>
  );
}
