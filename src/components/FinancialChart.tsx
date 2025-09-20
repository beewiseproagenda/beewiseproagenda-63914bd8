
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface ChartData {
  mes: string;
  faturamento: number;
  realizado?: number;
  agendado?: number;
  despesas: number;
  lucro: number;
}

interface FinancialChartProps {
  data: ChartData[];
  type?: 'line' | 'bar';
}

export function FinancialChart({ data, type = 'line' }: FinancialChartProps) {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const getLabel = (dataKey: string) => {
        switch (dataKey) {
          case 'faturamento':
            return 'Faturamento';
          case 'realizado':
            return 'Realizado';
          case 'agendado':
            return 'Agendado';
          case 'despesas':
            return 'Despesas';
          case 'lucro':
            return 'Lucro';
          default:
            return dataKey;
        }
      };

      return (
        <div className="bg-card border border-border rounded-lg p-2 sm:p-3 shadow-lg max-w-xs">
          <p className="text-foreground font-medium text-sm">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-xs sm:text-sm break-words" style={{ color: entry.color }}>
              {getLabel(entry.dataKey)}: R$ {entry.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (type === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="mes" 
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
            interval={0}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
            tickFormatter={(value) => `${value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="agendado" fill="hsl(var(--chart-agendado))" radius={[4, 4, 0, 0]} />
          <Bar dataKey="despesas" fill="hsl(var(--chart-despesas))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis 
          dataKey="mes" 
          axisLine={false}
          tickLine={false}
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
          interval={0}
        />
        <YAxis 
          axisLine={false}
          tickLine={false}
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
          tickFormatter={(value) => `${value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          width={60}
        />
        <Tooltip content={<CustomTooltip />} />
        <Line 
          type="monotone" 
          dataKey="agendado" 
          stroke="hsl(var(--chart-agendado))" 
          strokeWidth={3}
          strokeDasharray="5 5"
          strokeOpacity={0.8}
          dot={{ fill: 'hsl(var(--chart-agendado))', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, stroke: 'hsl(var(--chart-agendado))', strokeWidth: 2 }}
        />
        <Line 
          type="monotone" 
          dataKey="despesas" 
          stroke="hsl(var(--chart-despesas))" 
          strokeWidth={3}
          strokeDasharray="5 5"
          strokeOpacity={0.8}
          dot={{ fill: 'hsl(var(--chart-despesas))', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, stroke: 'hsl(var(--chart-despesas))', strokeWidth: 2 }}
        />
        <Line 
          type="monotone" 
          dataKey="lucro" 
          stroke="hsl(var(--chart-lucro))" 
          strokeWidth={3}
          strokeDasharray="5 5"
          strokeOpacity={0.8}
          dot={{ fill: 'hsl(var(--chart-lucro))', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, stroke: 'hsl(var(--chart-lucro))', strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
