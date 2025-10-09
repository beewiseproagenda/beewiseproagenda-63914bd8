import { useState, useEffect } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { formatWeekdays, WEEKDAY_NAMES_SHORT } from "@/utils/weekdays";
import { browserTz } from "@/utils/datetime";

function RecurrenceDisplay({ clientId }: { clientId: string }) {
  const [rule, setRule] = useState<any>(null);

  useEffect(() => {
    loadRule();
  }, [clientId]);

  const loadRule = async () => {
    try {
      const { data } = await supabase
        .from('recurring_rules')
        .select('*')
        .eq('client_id', clientId)
        .eq('active', true)
        .maybeSingle();
      
      setRule(data);
    } catch (error) {
      console.error('Erro ao carregar regra:', error);
    }
  };

  if (!rule) return null;

  const intervalText = rule.interval_weeks > 1 ? ` (a cada ${rule.interval_weeks} semanas)` : '';
  
  return (
    <div className="flex items-center gap-2">
      <Calendar className="h-4 w-4 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">
        Recorrência semanal - {formatWeekdays(rule.weekdays)} às {rule.time_local}{intervalText}
      </p>
    </div>
  );
}

export default function Clientes() {
  const { clientes, servicosPacotes, atendimentos, adicionarCliente, atualizarCliente, removerCliente } = useSupabaseData();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; cliente: Cliente | null }>({ open: false, cliente: null });

  const buscarEnderecoPorCep = async (cep: string) => {
    // Security: Validate CEP format before making API call
    const cepRegex = /^\d{8}$/;
    if (!cepRegex.test(cep)) {
      toast.error('CEP inválido. Use apenas números (8 dígitos)');
      return;
    }

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      
      // Security: Validate response status
      if (!response.ok) {
        toast.error('Erro ao buscar CEP. Tente novamente.');
        return;
      }

      const data = await response.json();
      
      // Security: Validate response data
      if (data.erro) {
        toast.error('CEP não encontrado');
        return;
      }

      // Security: Only update with validated data
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
      
      toast.success('Endereço encontrado!');
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      toast.error('Erro ao buscar CEP. Verifique sua conexão.');
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

  const [recurringRule, setRecurringRule] = useState<{
    id?: string;
    weekdays: number[];
    time_local: string;
    start_date: string;
    end_date?: string;
    interval_weeks: number;
    title: string;
  } | null>(null);

  useEffect(() => {
    if (editingCliente && editingCliente.id) {
      loadRecurringRule(editingCliente.id);
    } else {
      setRecurringRule(null);
    }
  }, [editingCliente]);

  const loadRecurringRule = async (clientId: string) => {
    try {
      const { data, error } = await supabase
        .from('recurring_rules')
        .select('*')
        .eq('client_id', clientId)
        .eq('active', true)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setRecurringRule({
          id: data.id,
          weekdays: data.weekdays,
          time_local: data.time_local,
          start_date: data.start_date,
          end_date: data.end_date || undefined,
          interval_weeks: data.interval_weeks,
          title: data.title,
        });
      } else {
        setRecurringRule(null);
      }
    } catch (error) {
      console.error('Erro ao carregar regra de recorrência:', error);
    }
  };

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
    setRecurringRule(null);
    setIsDialogOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    if (!formData.telefone.trim()) {
      toast.error("Telefone é obrigatório");
      return;
    }

    if (formData.recorrente && recurringRule) {
      if (recurringRule.weekdays.length === 0) {
        toast.error("Selecione ao menos um dia da semana");
        return;
      }
      if (!recurringRule.time_local) {
        toast.error("Horário é obrigatório");
        return;
      }
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

    try {
      let clientId: string;
      
      if (editingCliente) {
        await atualizarCliente(editingCliente.id, clienteData);
        clientId = editingCliente.id;
        toast.success("Cliente atualizado com sucesso!");
      } else {
        const novoCliente = await adicionarCliente(clienteData);
        clientId = novoCliente?.id;
        if (!clientId) {
          toast.error("Erro ao criar cliente");
          return;
        }
        toast.success("Cliente cadastrado com sucesso!");
      }

      // Salvar regra de recorrência se recorrente
      if (formData.recorrente && recurringRule && recurringRule.weekdays.length > 0) {
        await saveRecurringRule(clientId);
      }

      resetForm();
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      toast.error("Erro ao salvar cliente");
    }
  };

  const saveRecurringRule = async (clientId: string) => {
    if (!recurringRule || recurringRule.weekdays.length === 0) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Usuário não autenticado");
        return;
      }

      const ruleData = {
        user_id: user.id,
        client_id: clientId,
        title: recurringRule.title || 'Recorrência',
        weekdays: recurringRule.weekdays,
        time_local: recurringRule.time_local,
        timezone: browserTz(),
        start_date: recurringRule.start_date || new Date().toISOString().split('T')[0],
        end_date: recurringRule.end_date || null,
        interval_weeks: recurringRule.interval_weeks || 1,
        active: true,
      };

      let ruleId: string;

      if (recurringRule.id) {
        // Atualizar regra existente
        const { data, error } = await supabase
          .from('recurring_rules')
          .update(ruleData)
          .eq('id', recurringRule.id)
          .select()
          .single();

        if (error) throw error;
        ruleId = data.id;
      } else {
        // Criar nova regra
        const { data, error } = await supabase
          .from('recurring_rules')
          .insert(ruleData)
          .select()
          .single();

        if (error) throw error;
        ruleId = data.id;
      }

      // Materializar ocorrências
      const { error: materializeError } = await supabase.functions.invoke('materialize-recurring', {
        body: { rule_id: ruleId }
      });

      if (materializeError) {
        console.error('Erro ao materializar recorrência:', materializeError);
        toast.error("Regra salva, mas erro ao gerar agendamentos automáticos");
      } else {
        toast.success("Recorrência configurada com sucesso!");
      }
    } catch (error) {
      console.error('Erro ao salvar regra de recorrência:', error);
      toast.error("Erro ao configurar recorrência");
    }
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
                  onCheckedChange={(checked) => {
                    setFormData({ ...formData, recorrente: !!checked });
                    if (checked && !recurringRule) {
                      setRecurringRule({
                        weekdays: [],
                        time_local: '',
                        start_date: new Date().toISOString().split('T')[0],
                        interval_weeks: 1,
                        title: 'Recorrência'
                      });
                    }
                  }}
                />
                <Label htmlFor="recorrente">Cliente recorrente (agendamento automático)</Label>
              </div>

              {formData.recorrente && formData.recorrencia === 'semanal' && (
                <div className="border-t pt-4 space-y-4">
                  <h3 className="text-sm font-medium">Configuração de Recorrência Semanal</h3>
                  
                  <div>
                    <Label>Dias da Semana *</Label>
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {WEEKDAY_NAMES_SHORT.map((day, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Checkbox
                            id={`weekday-${index}`}
                            checked={recurringRule?.weekdays.includes(index) || false}
                            onCheckedChange={(checked) => {
                              if (!recurringRule) return;
                              const newWeekdays = checked
                                ? [...recurringRule.weekdays, index].sort((a, b) => a - b)
                                : recurringRule.weekdays.filter(d => d !== index);
                              setRecurringRule({ ...recurringRule, weekdays: newWeekdays });
                            }}
                          />
                          <Label htmlFor={`weekday-${index}`} className="text-sm cursor-pointer">
                            {day}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="time_local">Horário *</Label>
                      <Input
                        id="time_local"
                        type="time"
                        value={recurringRule?.time_local || ''}
                        onChange={(e) => recurringRule && setRecurringRule({ 
                          ...recurringRule, 
                          time_local: e.target.value 
                        })}
                        required={formData.recorrente}
                      />
                    </div>
                    <div>
                      <Label htmlFor="interval_weeks">Intervalo (semanas)</Label>
                      <Input
                        id="interval_weeks"
                        type="number"
                        min="1"
                        value={recurringRule?.interval_weeks || 1}
                        onChange={(e) => recurringRule && setRecurringRule({ 
                          ...recurringRule, 
                          interval_weeks: parseInt(e.target.value) || 1
                        })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="start_date">Data Início</Label>
                      <Input
                        id="start_date"
                        type="date"
                        value={recurringRule?.start_date || ''}
                        onChange={(e) => recurringRule && setRecurringRule({ 
                          ...recurringRule, 
                          start_date: e.target.value 
                        })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="end_date">Data Fim (opcional)</Label>
                      <Input
                        id="end_date"
                        type="date"
                        value={recurringRule?.end_date || ''}
                        onChange={(e) => recurringRule && setRecurringRule({ 
                          ...recurringRule, 
                          end_date: e.target.value || undefined
                        })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="title">Título do Agendamento</Label>
                    <Input
                      id="title"
                      value={recurringRule?.title || ''}
                      onChange={(e) => recurringRule && setRecurringRule({ 
                        ...recurringRule, 
                        title: e.target.value 
                      })}
                      placeholder="Ex: Aulas particulares"
                    />
                  </div>
                </div>
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
                  <RecurrenceDisplay clientId={cliente.id} />
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
