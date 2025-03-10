<<<<<<< HEAD
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

=======
import React, { useMemo } from 'react';
import ReactECharts, { EChartsOption } from 'echarts-for-react';
import { Badge } from "@/components/ui/badge";
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

const CHART_COLORS = [
  { line: '#22c55e', area: 'rgba(34, 197, 94, 0.15)' },   // green
  { line: '#3b82f6', area: 'rgba(59, 130, 246, 0.15)' },  // blue
  { line: '#f59e0b', area: 'rgba(245, 158, 11, 0.15)' },  // amber
  { line: '#8b5cf6', area: 'rgba(139, 92, 246, 0.15)' },  // purple
  { line: '#ec4899', area: 'rgba(236, 72, 153, 0.15)' },  // pink
  { line: '#06b6d4', area: 'rgba(6, 182, 212, 0.15)' },   // cyan
  { line: '#ef4444', area: 'rgba(239, 68, 68, 0.15)' },   // red
  { line: '#84cc16', area: 'rgba(132, 204, 22, 0.15)' },  // lime
];

const getSeriesColor = (index: number) => {
  return CHART_COLORS[index % CHART_COLORS.length];
};

interface StockChartProps {
  title: string;
  data: any[];
  stock_symbols: string[];
  interval: '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '2y' | '5y' | '10y' | 'ytd' | 'max';
  chart: {
    type: string;
    x_label: string;
    y_label: string;
    x_scale: string;
    x_ticks?: string[];
    x_tick_labels?: string[];
    elements: Array<{ label: string; points: Array<[string, number]> }>;
  };
}

const formatStockSymbol = (symbol: string) => {
  // Common stock suffixes to remove
  const suffixes = ['.US', '.NYSE', '.NASDAQ'];
  let formatted = symbol;
  
  // Remove any known suffix
  suffixes.forEach(suffix => {
    formatted = formatted.replace(suffix, '');
  });

  // If it's a crypto pair, format it nicely
  if (formatted.endsWith('USD')) {
    formatted = formatted.replace('USD', '');
    return `${formatted} / USD`;
  }

  return formatted;
};

// Add a helper function to determine date format based on interval
const getDateFormat = (interval: StockChartProps['interval'], date: Date) => {
  const formats: Record<string, Intl.DateTimeFormatOptions> = {
    '1d': { hour: 'numeric' },
    '5d': { weekday: 'short', hour: 'numeric' },
    '1mo': { month: 'short', day: 'numeric' },
    '3mo': { month: 'short', day: 'numeric' },
    '6mo': { month: 'short', day: 'numeric' },
    '1y': { month: 'short', day: 'numeric' },
    '2y': { month: 'short', year: '2-digit' },
    '5y': { month: 'short', year: '2-digit' },
    '10y': { month: 'short', year: '2-digit' },
    'ytd': { month: 'short', day: 'numeric' },
    'max': { month: 'short', year: '2-digit' }
  };

  return date.toLocaleDateString('en-US', formats[interval]);
};

export function InteractiveStockChart({ title, data, stock_symbols, interval, chart }: StockChartProps) {
  const { theme } = useTheme();
  const textColor = theme === 'dark' ? '#e5e5e5' : '#171717';
  const gridColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
  const tooltipBg = theme === 'dark' ? '#171717' : '#ffffff';

  // Process the chart data
  const processedData = useMemo(() => {
    return chart.elements.map((element, index) => {
      const points = element.points.map(([dateStr, price]) => {
        const date = new Date(dateStr);
        return {
          date,
          value: Number(price),
          label: stock_symbols[index]
        };
      }).sort((a, b) => a.date.getTime() - b.date.getTime());

      const firstPrice = points[0]?.value || 0;
      const lastPrice = points[points.length - 1]?.value || 0;
      const priceChange = lastPrice - firstPrice;
      const percentChange = ((priceChange / firstPrice) * 100).toFixed(2);

      // Use the dynamic color generator instead of hardcoded colors
      const seriesColor = getSeriesColor(index);

      return {
        label: formatStockSymbol(stock_symbols[index]),
        points,
        firstPrice,
        lastPrice,
        priceChange,
        percentChange,
        color: seriesColor
      };
    });
  }, [chart.elements, stock_symbols]);

  // Prepare chart options
  const options: EChartsOption = {
    backgroundColor: 'transparent',
    grid: {
      top: 20,
      right: 35,
      bottom: 25,
      left: 8,
      containLabel: true
    },
    tooltip: {
      trigger: 'axis',
      borderWidth: 0,
      backgroundColor: tooltipBg,
      padding: 0,
      className: 'echarts-tooltip',
      textStyle: { color: textColor },
      formatter: (params: any[]) => {
        if (!Array.isArray(params) || params.length === 0) return '';

        const date = new Date(params[0].value[0]);
        const formattedDate = getDateFormat(interval, date);

        let tooltipHtml = `
          <div style="
            padding: 6px 10px;
            border-radius: 5px;
            border: 1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'};
            font-family: system-ui, -apple-system, sans-serif;
            background: ${tooltipBg};
          ">
            <div style="font-size: 13px; color: ${theme === 'dark' ? '#9ca3af' : '#6b7280'};">
              ${formattedDate}
            </div>
        `;

        params.forEach((param) => {
          if (!param.value || param.value.length < 2) return;

          const currentPrice = param.value[1];
          const seriesName = param.seriesName;
          const series = processedData.find(d => d.label === seriesName);
          const lineColor = series?.color.line || '#888';
          
          // Find previous point for percentage calculation
          const dataIndex = param.dataIndex;
          const seriesData = param.data;
          let prevPrice = currentPrice;
          let change = 0;
          let changePercent = 0;

          if (dataIndex > 0) {
            const prevPoint = series?.points[dataIndex - 1];
            if (prevPoint) {
              prevPrice = prevPoint.value;
              change = currentPrice - prevPrice;
              changePercent = (change / prevPrice) * 100;
            }
          }

          const isPositive = change >= 0;
          const changeColor = isPositive ? '#22c55e' : '#ef4444';
          
          tooltipHtml += `
            <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
              <div style="
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background-color: ${lineColor};
                flex-shrink: 0;
              "></div>
              <span style="
                font-size: 13px;
                font-weight: 500;
                color: ${theme === 'dark' ? '#f3f4f6' : '#111827'};
              ">${seriesName}: $${currentPrice.toFixed(2)}</span>
              ${dataIndex > 0 ? `
                <span style="
                  font-size: 13px;
                  font-weight: 500;
                  color: ${changeColor};
                  display: flex;
                  align-items: center;
                  gap: 2px;
                ">${isPositive ? '↑' : '↓'}${Math.abs(changePercent).toFixed(2)}%</span>
              ` : ''}
            </div>
          `;
        });

        tooltipHtml += `</div>`;
        return tooltipHtml;
      }
    },
    xAxis: {
      type: 'time',
      axisLine: { 
        show: true, 
        lineStyle: { color: gridColor } 
      },
      axisTick: { show: false },
      axisLabel: {
        color: textColor,
        formatter: (value: number) => {
          const date = new Date(value);
          return getDateFormat(interval, date);
        },
        margin: 8,
        fontSize: 11,
        hideOverlap: true,
        interval: interval === '1d' ? 3 : 'auto', // Show fewer labels for intraday
        rotate: interval === '1d' ? 45 : 0, // Rotate labels for intraday
        padding: [4, 0],
        align: 'center',
      },
      splitLine: { show: false }
    },
    yAxis: {
      type: 'value',
      position: 'right',
      axisLine: { 
        show: true, 
        lineStyle: { color: gridColor }
      },
      axisTick: { show: false },
      axisLabel: {
        formatter: (value: number) => `$${value.toFixed(0)}`,
        color: textColor,
        margin: 8,
        padding: [0, 0, 0, 0]
      },
      splitLine: { show: false },
      min: (value: { min: number; max: number }) => {
        const range = value.max - value.min;
        return value.min - (range * 0.05); // Start 5% below the minimum
      },
      max: (value: { min: number; max: number }) => {
        const range = value.max - value.min;
        return value.max + (range * 0.05); // End 5% above the maximum
      }
    },
    series: processedData.map(series => ({
      name: series.label,
      type: 'line',
      smooth: true,
      showSymbol: false,
      data: series.points.map(point => ([
        point.date.getTime(),
        point.value
      ])),
      lineStyle: {
        color: series.color.line,
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
              color: series.color.area
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
      <div className="p-2 sm:p-4">
        <h3 className="text-base sm:text-lg lg:text-xl font-bold text-neutral-800 dark:text-neutral-200 mb-2 sm:mb-4 px-2">
          {title}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3 mb-2 sm:mb-4 px-2">
          {processedData.map(series => (
            <div 
              key={series.label} 
              className="flex flex-col gap-1 p-2 sm:p-3 rounded-lg"
              style={{
                backgroundColor: theme === 'dark' 
                  ? `${series.color.line}15`
                  : `${series.color.line}40`,
              }}
            >
              <div className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 truncate">
                {series.label}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base sm:text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  ${series.lastPrice.toFixed(2)}
                </span>
                <Badge
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] leading-none whitespace-nowrap",
                    series.priceChange >= 0
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                  )}
                >
                  <span className="inline-flex items-center">
                    {series.priceChange >= 0 ? '↑' : '↓'}
                    <span className="ml-0.5">
                      {Math.abs(series.priceChange).toFixed(2)} ({series.percentChange}%)
                    </span>
                  </span>
                </Badge>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-lg overflow-hidden">
          <ReactECharts
            option={options}
            style={{ 
              height: window.innerWidth < 640 ? '250px' : '400px',
              width: '100%' 
            }}
            theme={theme === 'dark' ? 'dark' : undefined}
            notMerge={true}
          />
        </div>
      </div>
    </div>
  );
}

>>>>>>> 4ddfb4a4ec51d3e32e0714867e9be0b0bca911c7
export default InteractiveStockChart;