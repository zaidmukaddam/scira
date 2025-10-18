"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/admin/orcish/ui/chart';

export function TopModelsChart({ data }: { data: Array<{ model: string; count: number }> }) {
  const chartData = data.map((d) => ({ name: d.model, value: d.count }));
  return (
    <Card>
      <CardHeader><CardTitle>Top Modèles utilisés</CardTitle></CardHeader>
      <CardContent>
        <ChartContainer config={{ value: { label: 'Requêtes', color: 'var(--primary)' } }} className="aspect-auto h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" width={120} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="value" fill="var(--primary)" radius={[4,4,4,4]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

export function TopUsersActivityChart({ data }: { data: Array<{ userId: string; count: number }> }) {
  const chartData = data.map((d) => ({ name: d.userId, value: d.count }));
  return (
    <Card>
      <CardHeader><CardTitle>Top Utilisateurs — Activité</CardTitle></CardHeader>
      <CardContent>
        <ChartContainer config={{ value: { label: 'Messages', color: 'var(--primary)' } }} className="aspect-auto h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" hide />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="value" fill="var(--primary)" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

export function TopUsersCostChart({ data }: { data: Array<{ userId: string; cost: number }> }) {
  const chartData = data.map((d) => ({ name: d.userId, value: Number(d.cost.toFixed(2)) }));
  return (
    <Card>
      <CardHeader><CardTitle>Top Utilisateurs — Coût ($)</CardTitle></CardHeader>
      <CardContent>
        <ChartContainer config={{ value: { label: 'Coût ($)', color: 'var(--primary)' } }} className="aspect-auto h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={120} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="value" fill="var(--primary)" radius={[4,4,4,4]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
