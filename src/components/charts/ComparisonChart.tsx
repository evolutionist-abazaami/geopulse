import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface ComparisonChartProps {
  data: Array<{ name: string; before: number; after: number }>;
  title: string;
  color1?: string;
  color2?: string;
}

export const ComparisonChart = ({ 
  data, 
  title, 
  color1 = "hsl(var(--primary))",
  color2 = "hsl(var(--secondary))"
}: ComparisonChartProps) => {
  const chartConfig = {
    before: {
      label: "Before",
      color: color1,
    },
    after: {
      label: "After",
      color: color2,
    },
  };

  return (
    <Card className="p-4">
      <h3 className="text-sm font-medium mb-4">{title}</h3>
      <ChartContainer config={chartConfig} className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="name" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tickLine={false}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Legend />
            <Bar dataKey="before" fill={color1} radius={[4, 4, 0, 0]} />
            <Bar dataKey="after" fill={color2} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </Card>
  );
};
