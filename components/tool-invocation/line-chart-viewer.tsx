"use client";

import { useMemo } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart as RechartsLineChart,
  XAxis,
  YAxis,
  Legend,
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

export interface LineChartViewerProps {
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

export function LineChartViewer({ title, data, description, yAxisLabel }: LineChartViewerProps) {
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
        label: item.xAxisLabel,
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
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Line Chart · {title}</CardTitle>
            {description ? <CardDescription>{description}</CardDescription> : null}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="uppercase text-[10px] tracking-wide">Line</Badge>
            <JsonViewPopup data={{ title, data, description, yAxisLabel }} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-[16/10]">
          <RechartsLineChart data={chartData}>
            <CartesianGrid strokeDasharray="4 4" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
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
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Legend />
            {seriesNames.map((seriesName, index) => (
              <Line
                key={seriesName}
                type="monotone"
                name={seriesName}
                dataKey={sanitizeCssVariableName(seriesName)}
                stroke={`var(--color-${sanitizeCssVariableName(seriesName)})`}
                strokeWidth={2}
                dot={false}
                animationDuration={700 + index * 100}
              />
            ))}
          </RechartsLineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
