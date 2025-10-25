
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
            return 'Receitas';
          case 'agendado':
            return 'Agendados';
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
        {/* Green line - Receitas (confirmed revenues from receitas table) */}
        <Line 
          type="monotone" 
          dataKey="realizado" 
          stroke="hsl(142, 71%, 45%)" 
          strokeWidth={3}
          dot={{ fill: 'hsl(142, 71%, 45%)', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, stroke: 'hsl(142, 71%, 45%)', strokeWidth: 2 }}
        />
        {/* Blue dashed line - Agendados (scheduled appointments by valor_total) */}
        <Line 
          type="monotone" 
          dataKey="agendado" 
          stroke="hsl(221, 83%, 53%)" 
          strokeWidth={3}
          strokeDasharray="5 5"
          strokeOpacity={0.8}
          dot={{ fill: 'hsl(221, 83%, 53%)', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, stroke: 'hsl(221, 83%, 53%)', strokeWidth: 2 }}
        />
        {/* Red line - Despesas */}
        <Line 
          type="monotone" 
          dataKey="despesas" 
          stroke="hsl(0, 84%, 60%)" 
          strokeWidth={3}
          dot={{ fill: 'hsl(0, 84%, 60%)', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, stroke: 'hsl(0, 84%, 60%)', strokeWidth: 2 }}
        />
        {/* Yellow/Orange line - Lucro */}
        <Line 
          type="monotone" 
          dataKey="lucro" 
          stroke="hsl(45, 93%, 47%)" 
          strokeWidth={3}
          strokeDasharray="3 3"
          strokeOpacity={0.7}
          dot={{ fill: 'hsl(45, 93%, 47%)', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, stroke: 'hsl(45, 93%, 47%)', strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
