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
    primary: "bg-primary/10 text-primary",
    green: "bg-green-100 text-green-600",
    blue: "bg-blue-100 text-blue-600",
    orange: "bg-orange-100 text-orange-600",
    red: "bg-red-100 text-red-600",
    accent: "bg-accent/10 text-accent",
  };

  const valueColorClasses = {
    primary: "text-neutral-900",
    green: "text-neutral-900",
    blue: "text-neutral-900",
    orange: "text-neutral-900",
    red: "text-red-600",
    accent: "text-neutral-900",
  };

  return (
    <Card data-testid={testId}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-neutral-600">{title}</p>
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
