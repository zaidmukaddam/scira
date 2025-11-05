"use client";

import { useMemo } from 'react';
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts';

import { JsonViewPopup } from '@/components/json-view-popup';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';

import { sanitizeCssVariableName } from './shared.tool-invocation';

export interface BarChartViewerProps {
  title: string;
  data: Array<{
    xAxisLabel: string;
    series: Array<{
      seriesName: string;
      value: number;
    }>;
  }>;
  description?: string | null;
  yAxisLabel?: string | null;
}

function ensureUniqueLabel(label: string, existing: Set<string>) {
  if (!existing.has(label)) {
    existing.add(label);
    return label;
  }
  let suffix = 2;
  let candidate = `${label} (${suffix})`;
  while (existing.has(candidate)) {
    suffix += 1;
    candidate = `${label} (${suffix})`;
  }
  existing.add(candidate);
  return candidate;
}

const palette = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];

export function BarChartViewer({ title, data, description, yAxisLabel }: BarChartViewerProps) {
  const normalisedData = useMemo(() => {
    const xSet = new Set<string>();
    return data.map((item) => {
      const label = ensureUniqueLabel(item.xAxisLabel, xSet);
      const seriesSet = new Set<string>();
      const series = item.series.map((entry) => ({
        ...entry,
        seriesName: ensureUniqueLabel(entry.seriesName, seriesSet),
      }));
      return {
        xAxisLabel: label,
        series,
      };
    });
  }, [data]);

  const seriesNames = normalisedData[0]?.series.map((item) => item.seriesName) ?? [];

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    seriesNames.forEach((seriesName, index) => {
      const key = sanitizeCssVariableName(seriesName);
      config[key] = {
        label: seriesName,
        color: palette[index % palette.length],
      };
    });
    return config;
  }, [seriesNames]);

  const chartData = useMemo(() => {
    return normalisedData.map((item) => {
      const entry: Record<string, number | string> = {
        name: item.xAxisLabel,
      };
      item.series.forEach(({ seriesName, value }) => {
        entry[sanitizeCssVariableName(seriesName)] = value;
      });
      return entry;
    });
  }, [normalisedData]);

  return (
    <Card className="bg-card">
      <CardHeader className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3 relative">
          <div>
            <CardTitle className="text-base">Bar Chart · {title}</CardTitle>
            {description ? <CardDescription>{description}</CardDescription> : null}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="uppercase text-[10px] tracking-wide">Bar</Badge>
            <JsonViewPopup data={{ title, data, description, yAxisLabel }} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-[16/10]">
          <RechartsBarChart data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              label={
                yAxisLabel
                  ? {
                      value: yAxisLabel,
                      angle: -90,
                      position: 'insideLeft',
                    }
                  : undefined
              }
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dashed" />} />
            {seriesNames.map((seriesName, index) => (
              <Bar
                key={seriesName}
                dataKey={sanitizeCssVariableName(seriesName)}
                fill={`var(--color-${sanitizeCssVariableName(seriesName)})`}
                radius={4}
                barSize={32}
                animationDuration={600 + index * 100}
              />
            ))}
          </RechartsBarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
