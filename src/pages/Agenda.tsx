
import React, { useState } from 'react';
import { Calendar, Clock, Plus, User, DollarSign, CreditCard, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useMobData } from '@/hooks/useMobData';
import { Atendimento, FormaPagamento } from '@/types';
import { toast } from "sonner";

const formasPagamento: { value: FormaPagamento; label: string }[] = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'pix', label: 'PIX' },
  { value: 'cartao_debito', label: 'Cartão de Débito' },
  { value: 'cartao_credito', label: 'Cartão de Crédito' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'outro', label: 'Outro' },
];

export default function Agenda() {
  const { atendimentos, clientes, adicionarAtendimento, atualizarAtendimento } = useMobData();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAtendimento, setEditingAtendimento] = useState<Atendimento | null>(null);

  const [formData, setFormData] = useState({
    data: new Date().toISOString().split('T')[0],
    hora: '',
    clienteId: '',
    clienteNome: '',
    servico: '',
    valor: '',
    formaPagamento: '' as FormaPagamento,
    observacoes: '',
    status: 'agendado' as const,
  });

  const resetForm = () => {
    setFormData({
      data: new Date().toISOString().split('T')[0],
      hora: '',
      clienteId: '',
      clienteNome: '',
      servico: '',
      valor: '',
      formaPagamento: '' as FormaPagamento,
      observacoes: '',
      status: 'agendado',
    });
    setEditingAtendimento(null);
    setIsFormOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.data || !formData.hora || !formData.clienteNome || !formData.servico || !formData.valor) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const novoAtendimento = {
      data: new Date(formData.data),
      hora: formData.hora,
      clienteId: formData.clienteId || Date.now().toString(),
      clienteNome: formData.clienteNome,
      servico: formData.servico,
      valor: parseFloat(formData.valor),
      formaPagamento: formData.formaPagamento,
      observacoes: formData.observacoes,
      status: formData.status,
    };

    if (editingAtendimento) {
      atualizarAtendimento(editingAtendimento.id, novoAtendimento);
      toast.success("Atendimento atualizado com sucesso!");
    } else {
      adicionarAtendimento(novoAtendimento);
      toast.success("Atendimento agendado com sucesso!");
    }

    resetForm();
  };

  const editarAtendimento = (atendimento: Atendimento) => {
    setEditingAtendimento(atendimento);
    setFormData({
      data: new Date(atendimento.data).toISOString().split('T')[0],
      hora: atendimento.hora,
      clienteId: atendimento.clienteId,
      clienteNome: atendimento.clienteNome,
      servico: atendimento.servico,
      valor: atendimento.valor.toString(),
      formaPagamento: atendimento.formaPagamento,
      observacoes: atendimento.observacoes || '',
      status: atendimento.status,
    });
    setIsFormOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'realizado': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelado': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const atendimentosOrdenados = [...atendimentos].sort((a, b) => {
    const dataA = new Date(`${a.data} ${a.hora}`).getTime();
    const dataB = new Date(`${b.data} ${b.hora}`).getTime();
    return dataB - dataA;
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Agenda</h1>
          <p className="text-muted-foreground">Gerencie seus atendimentos e compromissos</p>
        </div>
        <Button 
          onClick={() => setIsFormOpen(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Novo Atendimento
        </Button>
      </div>

      <Tabs defaultValue="lista" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="lista">Lista de Atendimentos</TabsTrigger>
          <TabsTrigger value="calendario">Calendário</TabsTrigger>
        </TabsList>

        <TabsContent value="lista" className="space-y-4">
          {atendimentosOrdenados.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">Nenhum atendimento agendado</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Comece criando seu primeiro atendimento
                </p>
                <Button onClick={() => setIsFormOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Atendimento
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {atendimentosOrdenados.map((atendimento) => (
                <Card key={atendimento.id} className="hover:bg-card/80 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {new Date(atendimento.data).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>{atendimento.hora}</span>
                          </div>
                          <Badge className={getStatusColor(atendimento.status)}>
                            {atendimento.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{atendimento.clienteNome}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-muted-foreground">{atendimento.servico}</span>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            <span className="font-bold text-green-600">
                              R$ {atendimento.valor.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => editarAtendimento(atendimento)}
                      >
                        Editar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="calendario">
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">Calendário em desenvolvimento</h3>
                <p className="text-muted-foreground">
                  A visualização em calendário estará disponível em breve
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {editingAtendimento ? 'Editar Atendimento' : 'Novo Atendimento'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="data">Data *</Label>
                    <Input
                      id="data"
                      type="date"
                      value={formData.data}
                      onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="hora">Hora *</Label>
                    <Input
                      id="hora"
                      type="time"
                      value={formData.hora}
                      onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="clienteNome">Nome do Cliente *</Label>
                  <Input
                    id="clienteNome"
                    value={formData.clienteNome}
                    onChange={(e) => setFormData({ ...formData, clienteNome: e.target.value })}
                    placeholder="Digite o nome do cliente"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="servico">Serviço *</Label>
                  <Input
                    id="servico"
                    value={formData.servico}
                    onChange={(e) => setFormData({ ...formData, servico: e.target.value })}
                    placeholder="Ex: Consulta, Terapia, Treinamento..."
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="valor">Valor *</Label>
                    <Input
                      id="valor"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.valor}
                      onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                      placeholder="0,00"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="formaPagamento">Forma de Pagamento</Label>
                    <Select
                      value={formData.formaPagamento}
                      onValueChange={(value: FormaPagamento) => 
                        setFormData({ ...formData, formaPagamento: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {formasPagamento.map((forma) => (
                          <SelectItem key={forma.value} value={forma.value}>
                            {forma.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: 'agendado' | 'realizado' | 'cancelado') => 
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agendado">Agendado</SelectItem>
                      <SelectItem value="realizado">Realizado</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="observacoes">Observações</Label>
                  <Textarea
                    id="observacoes"
                    value={formData.observacoes}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    placeholder="Observações adicionais..."
                    rows={3}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1">
                    {editingAtendimento ? 'Atualizar' : 'Agendar'}
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
