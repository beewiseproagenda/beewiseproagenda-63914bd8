
import { DollarSign, TrendingUp, Calendar, Users, Target, PiggyBank } from "lucide-react";
import { DashboardCard } from "@/components/DashboardCard";
import { FinancialChart } from "@/components/FinancialChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMobData } from "@/hooks/useMobData";

export default function Dashboard() {
  const { dadosFinanceiros, atendimentos, clientes } = useMobData();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Preparar dados para o gráfico
  const chartData = dadosFinanceiros.historicoMensal.map(item => ({
    ...item,
    lucro: item.receita - item.despesas
  }));

  // Atendimentos do mês atual
  const agora = new Date();
  const atendimentosMesAtual = atendimentos.filter(a => {
    const dataAtendimento = new Date(a.data);
    return dataAtendimento.getMonth() === agora.getMonth() && 
           dataAtendimento.getFullYear() === agora.getFullYear();
  }).length;

  // Próximos atendimentos (próximos 7 dias)
  const proximosSete = new Date();
  proximosSete.setDate(proximosSete.getDate() + 7);
  
  const proximosAtendimentos = atendimentos
    .filter(a => {
      const dataAtendimento = new Date(a.data);
      return dataAtendimento >= agora && 
             dataAtendimento <= proximosSete && 
             a.status === 'agendado';
    })
    .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-8 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Bem-vindo ao seu painel de controle
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString('pt-BR', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
      </div>

      {/* Cards de métricas principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          title="Receita do Mês"
          value={formatCurrency(dadosFinanceiros.receitaMesAtual)}
          icon={DollarSign}
          description="Receita atual do mês"
          change={{
            value: dadosFinanceiros.receitaMesAtual >= dadosFinanceiros.receitaMediaMensal 
              ? "↗ Acima da média" 
              : "↘ Abaixo da média",
            type: dadosFinanceiros.receitaMesAtual >= dadosFinanceiros.receitaMediaMensal 
              ? 'positive' 
              : 'negative'
          }}
        />
        
        <DashboardCard
          title="Lucro Líquido"
          value={formatCurrency(dadosFinanceiros.lucroLiquido)}
          icon={TrendingUp}
          description="Receita - Despesas"
          change={{
            value: dadosFinanceiros.lucroLiquido > 0 ? "↗ Positivo" : "↘ Negativo",
            type: dadosFinanceiros.lucroLiquido > 0 ? 'positive' : 'negative'
          }}
        />
        
        <DashboardCard
          title="Atendimentos"
          value={atendimentosMesAtual.toString()}
          icon={Calendar}
          description="Atendimentos este mês"
        />
        
        <DashboardCard
          title="Clientes Ativos"
          value={clientes.length.toString()}
          icon={Users}
          description="Total de clientes cadastrados"
        />
      </div>

      {/* Gráfico e próximos atendimentos */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Evolução Financeira
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FinancialChart data={chartData} type="line" />
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Próximos Atendimentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {proximosAtendimentos.length > 0 ? (
                proximosAtendimentos.map((atendimento) => (
                  <div key={atendimento.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{atendimento.clienteNome}</p>
                      <p className="text-xs text-muted-foreground">{atendimento.servico}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium">
                        {new Date(atendimento.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                      </p>
                      <p className="text-xs text-muted-foreground">{atendimento.hora}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhum atendimento agendado</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cards de métricas secundárias */}
      <div className="grid gap-4 md:grid-cols-2">
        <DashboardCard
          title="Média Mensal"
          value={formatCurrency(dadosFinanceiros.receitaMediaMensal)}
          icon={Target}
          description="Receita média dos últimos meses"
        />
        
        <DashboardCard
          title="Projeção Próximo Mês"
          value={formatCurrency(dadosFinanceiros.projecaoProximoMes)}
          icon={PiggyBank}
          description="Baseada nas últimas 4 semanas"
        />
      </div>
    </div>
  );
}
