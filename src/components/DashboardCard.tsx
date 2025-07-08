
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface DashboardCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  description?: string;
  change?: {
    value: string;
    type: 'positive' | 'negative' | 'neutral';
  };
}

export function DashboardCard({ title, value, icon: Icon, description, change }: DashboardCardProps) {
  const changeColor = {
    positive: 'text-green-500',
    negative: 'text-red-500',
    neutral: 'text-muted-foreground'
  }[change?.type || 'neutral'];

  return (
    <Card className="bg-card border-border hover:bg-card/80 transition-colors duration-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">
            {description}
          </p>
        )}
        {change && (
          <p className={`text-xs mt-1 ${changeColor}`}>
            {change.value}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
