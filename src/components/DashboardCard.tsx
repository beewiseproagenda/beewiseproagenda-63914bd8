
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
  titleColor?: string;
}

export function DashboardCard({ title, value, icon: Icon, description, change, titleColor }: DashboardCardProps) {
  const changeColor = {
    positive: 'text-green-500',
    negative: 'text-red-500',
    neutral: 'text-muted-foreground'
  }[change?.type || 'neutral'];

  return (
    <Card className="bg-card border-border hover:bg-card/80 transition-colors duration-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className={`text-xs sm:text-sm font-medium ${titleColor || 'text-muted-foreground'} min-w-0 flex-1 pr-2`}>
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      </CardHeader>
      <CardContent>
        <div className="text-lg sm:text-2xl font-bold text-foreground break-words">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1 break-words">
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
