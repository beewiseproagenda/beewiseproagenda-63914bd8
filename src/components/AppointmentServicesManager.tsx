import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ServicoPacote } from "@/hooks/useSupabaseData";

export interface AppointmentService {
  id?: string;
  servico_id: string;
  descricao?: string;
  valor: number;
  quantidade: number;
}

interface AppointmentServicesManagerProps {
  servicos: AppointmentService[];
  onChange: (servicos: AppointmentService[]) => void;
  servicosPacotes: ServicoPacote[];
}

export function AppointmentServicesManager({ 
  servicos, 
  onChange, 
  servicosPacotes 
}: AppointmentServicesManagerProps) {
  const [tempServices, setTempServices] = useState<AppointmentService[]>(servicos);

  const handleAddService = () => {
    const newService: AppointmentService = {
      servico_id: "",
      valor: 0,
      quantidade: 1,
      descricao: ""
    };
    const updated = [...tempServices, newService];
    setTempServices(updated);
    onChange(updated);
  };

  const handleRemoveService = (index: number) => {
    const updated = tempServices.filter((_, i) => i !== index);
    setTempServices(updated);
    onChange(updated);
  };

  const handleServiceChange = (index: number, field: keyof AppointmentService, value: any) => {
    const updated = [...tempServices];
    updated[index] = { ...updated[index], [field]: value };
    
    // Auto-fill valor when servico is selected
    if (field === 'servico_id' && value) {
      const selectedServico = servicosPacotes.find(s => s.id === value);
      if (selectedServico) {
        updated[index].valor = Number(selectedServico.valor);
      }
    }
    
    setTempServices(updated);
    onChange(updated);
  };

  const calculateTotal = () => {
    return tempServices.reduce((sum, service) => {
      return sum + (service.valor * service.quantidade);
    }, 0);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Serviços</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddService}
        >
          <Plus className="h-4 w-4 mr-1" />
          Adicionar Serviço
        </Button>
      </div>

      {tempServices.length === 0 && (
        <div className="text-sm text-muted-foreground border border-dashed rounded-md p-4 text-center">
          Nenhum serviço adicionado. Clique em "Adicionar Serviço" para começar.
        </div>
      )}

      {tempServices.map((service, index) => (
        <div key={index} className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Serviço {index + 1}</span>
            {tempServices.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveService(index)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <Label htmlFor={`servico-${index}`}>Serviço/Pacote *</Label>
              <Select
                value={service.servico_id}
                onValueChange={(value) => handleServiceChange(index, 'servico_id', value)}
              >
                <SelectTrigger id={`servico-${index}`}>
                  <SelectValue placeholder="Selecione um serviço" />
                </SelectTrigger>
                <SelectContent>
                  {servicosPacotes.map((sp) => (
                    <SelectItem key={sp.id} value={sp.id}>
                      {sp.nome} - {formatCurrency(Number(sp.valor))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor={`quantidade-${index}`}>Quantidade</Label>
                <Input
                  id={`quantidade-${index}`}
                  type="number"
                  min="1"
                  value={service.quantidade}
                  onChange={(e) => handleServiceChange(index, 'quantidade', parseInt(e.target.value) || 1)}
                />
              </div>
              <div>
                <Label htmlFor={`valor-${index}`}>Valor Unitário</Label>
                <Input
                  id={`valor-${index}`}
                  type="number"
                  step="0.01"
                  min="0"
                  value={service.valor}
                  onChange={(e) => handleServiceChange(index, 'valor', parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              Subtotal: {formatCurrency(service.valor * service.quantidade)}
            </div>
          </div>
        </div>
      ))}

      {tempServices.length > 0 && (
        <div className="border-t pt-4">
          <div className="flex items-center justify-between text-lg font-semibold">
            <span>Total:</span>
            <span className="text-primary">{formatCurrency(calculateTotal())}</span>
          </div>
        </div>
      )}
    </div>
  );
}
