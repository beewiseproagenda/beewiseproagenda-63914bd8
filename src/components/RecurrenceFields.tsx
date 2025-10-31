import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface RecurrenceFieldsProps {
  form: any;
  recurrenceType: string;
}

const WEEKDAYS = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
];

export function RecurrenceFields({ form, recurrenceType }: RecurrenceFieldsProps) {
  if (!recurrenceType) return null;

  return (
    <div className="space-y-4 border border-border rounded-lg p-4 bg-muted/20">
      <h4 className="font-medium text-sm">Configuração de Recorrência</h4>
      
      {recurrenceType === 'semanal' && (
        <>
          <FormField
            control={form.control}
            name="recorrencia.weekdays"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dias da Semana</FormLabel>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map((day) => (
                    <label
                      key={day.value}
                      className="flex items-center space-x-2 cursor-pointer"
                    >
                      <Checkbox
                        checked={field.value?.includes(day.value)}
                        onCheckedChange={(checked) => {
                          const current = field.value || [];
                          if (checked) {
                            field.onChange([...current, day.value].sort());
                          } else {
                            field.onChange(current.filter((v: number) => v !== day.value));
                          }
                        }}
                      />
                      <span className="text-sm">{day.label}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Selecione os dias em que a recorrência ocorre
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="recorrencia.intervalWeeks"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Intervalo (semanas)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="1"
                    max="52"
                    placeholder="Ex: 1 = toda semana, 2 = a cada 2 semanas"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  1 = toda semana, 2 = a cada 2 semanas, etc.
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
        </>
      )}

      {recurrenceType === 'mensal' && (
        <>
          <FormField
            control={form.control}
            name="recorrencia.dayOfMonth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dia do Mês</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    placeholder="Ex: 10 = dia 10 de cada mês"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  Dia do mês em que a recorrência ocorre (1-31)
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="recorrencia.intervalMonths"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Intervalo (meses)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="1"
                    max="12"
                    placeholder="Ex: 1 = todo mês, 2 = a cada 2 meses"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  1 = todo mês, 2 = a cada 2 meses, etc.
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
        </>
      )}

      <FormField
        control={form.control}
        name="recorrencia.startDate"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>Data Início</FormLabel>
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
                      <span>Selecione a data de início</span>
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
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              Data a partir da qual a recorrência começa
            </p>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="recorrencia.endDate"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>Data Fim (opcional)</FormLabel>
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
                      <span>Sem data fim (contínua)</span>
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
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              Se não definir, a recorrência continuará ativa por 180 dias
            </p>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
