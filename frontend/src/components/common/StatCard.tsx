import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  change?: number;
  changeLabel?: string;
  iconColor?: string;
  iconBg?: string;
  className?: string;
}

export default function StatCard({
  title, value, icon: Icon,
  change, changeLabel,
  iconColor = "text-blue-600",
  iconBg = "bg-blue-50",
  className,
}: StatCardProps) {
  const isPositive = change !== undefined && change >= 0;

  return (
    <Card className={cn("hover:shadow-md transition-shadow", className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-1 tracking-tight">{value}</p>
            {change !== undefined && (
              <div className={cn("flex items-center gap-1 mt-2 text-xs font-medium",
                isPositive ? "text-green-600" : "text-red-500"
              )}>
                {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span>{isPositive ? "+" : ""}{change}%</span>
                {changeLabel && <span className="text-muted-foreground font-normal ml-1">{changeLabel}</span>}
              </div>
            )}
          </div>
          <div className={cn("flex items-center justify-center w-12 h-12 rounded-xl flex-shrink-0", iconBg)}>
            <Icon className={cn("w-6 h-6", iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
