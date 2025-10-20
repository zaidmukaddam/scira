"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/admin/orcish/ui/chart";
import { ChartCard } from "./chart-card";

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function TopModelsChart({
  data,
}: {
  data: Array<{ model: string; count: number }>;
}) {
  const chartData = data.map((d) => ({ name: d.model, value: d.count }));
  const isEmpty = chartData.length === 0;

  return (
    <ChartCard
      title="Top Modèles utilisés"
      description="Les modèles d'IA les plus sollicités"
      isEmpty={isEmpty}
      emptyMessage="Aucun modèle utilisé"
      emptyDescription="Les statistiques d'utilisation apparaîtront ici"
    >
      <ChartContainer
        config={{
          value: {
            label: "Requêtes",
            color: "hsl(var(--chart-1))",
          },
        }}
        className="aspect-auto h-[300px] w-full"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ left: 10 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              horizontal={false}
              stroke="hsl(var(--border))"
              opacity={0.3}
            />
            <XAxis type="number" hide />
            <YAxis
              dataKey="name"
              type="category"
              width={140}
              tick={{ fontSize: 12 }}
              stroke="hsl(var(--muted-foreground))"
            />
            <ChartTooltip
              content={<ChartTooltipContent />}
              cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} animationDuration={800}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </ChartCard>
  );
}

export function TopUsersActivityChart({
  data,
}: {
  data: Array<{ userId: string; count: number }>;
}) {
  const chartData = data.map((d) => ({ name: d.userId, value: d.count }));
  const isEmpty = chartData.length === 0;

  return (
    <ChartCard
      title="Top Utilisateurs — Activité"
      description="Les utilisateurs les plus actifs"
      isEmpty={isEmpty}
      emptyMessage="Aucune activité"
      emptyDescription="L'activité des utilisateurs apparaîtra ici"
    >
      <ChartContainer
        config={{
          value: {
            label: "Messages",
            color: "hsl(var(--chart-2))",
          },
        }}
        className="aspect-auto h-[300px] w-full"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ bottom: 5 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="hsl(var(--border))"
              opacity={0.3}
            />
            <XAxis
              dataKey="name"
              hide
              stroke="hsl(var(--muted-foreground))"
            />
            <YAxis
              tick={{ fontSize: 12 }}
              stroke="hsl(var(--muted-foreground))"
            />
            <ChartTooltip
              content={<ChartTooltipContent />}
              cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} animationDuration={800}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </ChartCard>
  );
}

export function TopUsersCostChart({
  data,
}: {
  data: Array<{ userId: string; cost: number }>;
}) {
  const chartData = data.map((d) => ({
    name: d.userId,
    value: Number(d.cost.toFixed(2)),
  }));
  const isEmpty = chartData.length === 0;

  return (
    <ChartCard
      title="Top Utilisateurs — Coût"
      description="Les utilisateurs avec les coûts les plus élevés (USD)"
      isEmpty={isEmpty}
      emptyMessage="Aucun coût enregistré"
      emptyDescription="Les statistiques de coût apparaîtront ici"
    >
      <ChartContainer
        config={{
          value: {
            label: "Coût ($)",
            color: "hsl(var(--chart-3))",
          },
        }}
        className="aspect-auto h-[300px] w-full"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ left: 10 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              horizontal={false}
              stroke="hsl(var(--border))"
              opacity={0.3}
            />
            <XAxis
              type="number"
              tick={{ fontSize: 12 }}
              stroke="hsl(var(--muted-foreground))"
              tickFormatter={(value) => `$${value.toFixed(2)}`}
            />
            <YAxis
              dataKey="name"
              type="category"
              width={140}
              tick={{ fontSize: 12 }}
              stroke="hsl(var(--muted-foreground))"
            />
            <ChartTooltip
              content={<ChartTooltipContent />}
              cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} animationDuration={800}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </ChartCard>
  );
}
