
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface ChartData {
  mes: string;
  receita: number;
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
          case 'receita':
            return 'Faturamento';
          case 'despesas':
            return 'Despesas';
          case 'lucro':
            return 'Lucro';
          default:
            return dataKey;
        }
      };

      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-foreground font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
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
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="mes" 
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            tickFormatter={(value) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="receita" fill="hsl(var(--chart-faturamento))" radius={[4, 4, 0, 0]} />
          <Bar dataKey="despesas" fill="hsl(var(--chart-despesas))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis 
          dataKey="mes" 
          axisLine={false}
          tickLine={false}
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
        />
        <YAxis 
          axisLine={false}
          tickLine={false}
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
          tickFormatter={(value) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Line 
          type="monotone" 
          dataKey="receita" 
          stroke="hsl(var(--chart-faturamento))" 
          strokeWidth={3}
          dot={{ fill: 'hsl(var(--chart-faturamento))', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, stroke: 'hsl(var(--chart-faturamento))', strokeWidth: 2 }}
        />
        <Line 
          type="monotone" 
          dataKey="despesas" 
          stroke="hsl(var(--chart-despesas))" 
          strokeWidth={3}
          dot={{ fill: 'hsl(var(--chart-despesas))', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, stroke: 'hsl(var(--chart-despesas))', strokeWidth: 2 }}
        />
        <Line 
          type="monotone" 
          dataKey="lucro" 
          stroke="hsl(var(--chart-lucro))" 
          strokeWidth={3}
          dot={{ fill: 'hsl(var(--chart-lucro))', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, stroke: 'hsl(var(--chart-lucro))', strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
