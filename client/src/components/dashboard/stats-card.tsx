import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  color?: string;
  "data-testid"?: string;
}

export default function StatsCard({ title, value, icon, color = "primary", "data-testid": testId }: StatsCardProps) {
  const colorClasses = {
    primary: "bg-primary/10 dark:bg-primary/20 text-primary",
    green: "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
    blue: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
    orange: "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400",
    red: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",
    accent: "bg-accent/10 dark:bg-accent/20 text-accent",
  };

  const valueColorClasses = {
    primary: "text-neutral-900 dark:text-white",
    green: "text-neutral-900 dark:text-white",
    blue: "text-neutral-900 dark:text-white",
    orange: "text-neutral-900 dark:text-white",
    red: "text-red-600 dark:text-red-400",
    accent: "text-neutral-900 dark:text-white",
  };

  return (
    <Card data-testid={testId}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">{title}</p>
            <p className={`text-3xl font-bold ${valueColorClasses[color as keyof typeof valueColorClasses]}`}>{value}</p>
          </div>
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[color as keyof typeof colorClasses]}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
