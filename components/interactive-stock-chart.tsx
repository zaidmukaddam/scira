import React, { useMemo } from 'react';
import ReactECharts, { EChartsOption } from 'echarts-for-react';
import { Badge } from "@/components/ui/badge";
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

interface StockChartProps {
  title: string;
  data: any[];
  chart: {
    type: string;
    x_label: string;
    y_label: string;
    x_scale: string;
    elements: Array<{ label: string; points: Array<[number, number]> }>;
  };
}

export function InteractiveStockChart({ title, data, chart }: StockChartProps) {
  const { theme } = useTheme();
  const textColor = theme === 'dark' ? '#e5e5e5' : '#171717';
  const gridColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
  const tooltipBg = theme === 'dark' ? '#171717' : '#ffffff';

  const chartData = useMemo(() => {
    return chart.elements.flatMap(e => {
      return e.points.map(([dateString, price]) => {
        const parsed = Date.parse(String(dateString));
        const validDate = !Number.isNaN(parsed) ? new Date(parsed) : new Date();
        return {
          label: e.label,
          date: validDate,
          value: Number(price) || 0
        };
      });
    });
  }, [chart.elements]);

  const latestPrice = chartData[chartData.length - 1]?.value || 0;
  const firstPrice = chartData[0]?.value || 0;
  const priceChange = latestPrice - firstPrice;
  const percentChange = ((priceChange / firstPrice) * 100).toFixed(2);

  const options: EChartsOption = {
    backgroundColor: 'transparent',
    grid: {
      top: 16,
      right: 16,
      bottom: 24,
      left: 16,
      containLabel: true
    },
    tooltip: {
      trigger: 'axis',
      borderWidth: 0,
      backgroundColor: tooltipBg,
      padding: 0,
      className: 'echarts-tooltip',
      textStyle: { color: textColor },
      formatter: (params: any) => {
        const date = params[0].axisValue;
        const currentPrice = params[0].value;
        const prevPrice = chartData[params[0].dataIndex - 1]?.value || currentPrice;
        const change = currentPrice - prevPrice;
        const changePercent = ((change / prevPrice) * 100).toFixed(2);
        const isPositive = change >= 0;
        const changeColor = isPositive ? '#22c55e' : '#ef4444';
        const bgColor = tooltipBg;

        return `
          <div style="
            padding: 6px 10px;
            border-radius: 5px;
            border: 1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'};
            font-family: system-ui, -apple-system, sans-serif;
            display: flex;
            align-items: center;
            gap: 8px;
            background: ${bgColor};
          ">
            <span style="
              font-size: 13px;
              color: ${theme === 'dark' ? '#9ca3af' : '#6b7280'};
            ">${date}</span>
            <span style="
              font-size: 13px;
              font-weight: 500;
              color: ${theme === 'dark' ? '#f3f4f6' : '#111827'};
            ">$${currentPrice.toFixed(2)}</span>
            <span style="
              font-size: 13px;
              font-weight: 500;
              color: ${changeColor};
              display: flex;
              align-items: center;
              gap: 2px;
            ">${isPositive ? '↑' : '↓'}${changePercent}%</span>
          </div>
        `;
      }
    },
    xAxis: {
      type: 'category',
      data: chartData.map(d => d.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
      axisLine: { show: true, lineStyle: { color: gridColor } },
      axisTick: { show: false },
      axisLabel: {
        color: textColor,
        margin: 8,
        fontSize: 11,
        hideOverlap: true,
        interval: (index: number) => {
          const total = chartData.length;
          return total <= 10 ? true : index % Math.ceil(total / 8) === 0;
        }
      },
      splitLine: {
        show: true,
        lineStyle: { color: gridColor, type: 'dashed' }
      }
    },
    yAxis: {
      type: 'value',
      position: 'right',
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        formatter: (value: number) => `$${value.toFixed(2)}`,
        color: textColor,
        margin: 8
      },
      splitLine: {
        show: true,
        lineStyle: { color: gridColor, type: 'dashed' }
      }
    },
    series: chart.elements.map(e => ({
      name: e.label,
      type: 'line',
      smooth: true,
      showSymbol: false,
      data: chartData.filter(d => d.label === e.label).map(d => d.value),
      lineStyle: {
        color: priceChange >= 0 ? '#22c55e' : '#ef4444',
        width: 2
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            {
              offset: 0,
              color: priceChange >= 0
                ? 'rgba(34, 197, 94, 0.15)'
                : 'rgba(239, 68, 68, 0.15)'
            },
            {
              offset: 1,
              color: theme === 'dark'
                ? 'rgba(23, 23, 23, 0)'
                : 'rgba(255, 255, 255, 0)'
            }
          ]
        }
      }
    }))
  };

  return (
    <div className="w-full bg-neutral-50 dark:bg-neutral-900 rounded-xl">
      <div className="mb-2 sm:mb-4 p-3">
        <h3 className="text-lg sm:text-xl font-bold text-neutral-800 dark:text-neutral-200">
          {title}
        </h3>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-base sm:text-lg font-semibold text-neutral-800 dark:text-neutral-200">
            ${latestPrice.toFixed(2)}
          </span>
          <Badge
            className={cn(
              "rounded-full px-2 py-0.5 text-xs sm:text-sm font-medium shadow-none",
              priceChange >= 0
                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200"
                : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-200"
            )}
          >
            {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)} ({percentChange}%)
          </Badge>
        </div>
      </div>
      <div className="rounded-lg overflow-hidden  p-2 sm:p-4">
        <ReactECharts
          option={options}
          style={{ height: '300px', width: '100%' }}
          theme={theme === 'dark' ? 'dark' : undefined}
          notMerge={true}
        />
      </div>
    </div>
  );
}

export default InteractiveStockChart;