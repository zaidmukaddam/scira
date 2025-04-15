import React, { useMemo, useCallback } from 'react';
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
  currency_symbols: string[];
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

// Add currency symbol mapping
const CURRENCY_SYMBOLS = {
  USD: '$',   // US Dollar
  EUR: '€',   // Euro
  GBP: '£',   // British Pound
  JPY: '¥',   // Japanese Yen
  CNY: '¥',   // Chinese Yuan
  INR: '₹',   // Indian Rupee
  RUB: '₽',   // Russian Ruble
  KRW: '₩',   // South Korean Won
  BTC: '₿',   // Bitcoin
  THB: '฿',   // Thai Baht
  BRL: 'R$',  // Brazilian Real
  PHP: '₱',   // Philippine Peso
  ILS: '₪',   // Israeli Shekel
  TRY: '₺',   // Turkish Lira
  NGN: '₦',   // Nigerian Naira
  VND: '₫',   // Vietnamese Dong
  ARS: '$',   // Argentine Peso
  ZAR: 'R',   // South African Rand
  AUD: 'A$',  // Australian Dollar
  CAD: 'C$',  // Canadian Dollar
  SGD: 'S$',  // Singapore Dollar
  HKD: 'HK$', // Hong Kong Dollar
  NZD: 'NZ$', // New Zealand Dollar
  MXN: 'Mex$' // Mexican Peso
} as const;

// Update the formatter to use currency symbols
const formatCurrency = (value: number, currencyCode: string) => {
  const symbol = CURRENCY_SYMBOLS[currencyCode as keyof typeof CURRENCY_SYMBOLS];
  if (!symbol) {
    return `${value.toFixed(2)} ${currencyCode}`;
  }

  // Special formatting for certain currencies
  switch (currencyCode) {
    case 'JPY':
    case 'KRW':
    case 'VND':
      return `${symbol}${value.toFixed(0)}`;  // No decimals for these currencies
    case 'BTC':
      return `${symbol}${value.toFixed(8)}`; // 8 decimals for Bitcoin
    case 'BRL':
    case 'ARS':
      return `${symbol} ${value.toFixed(2)}`; // Space after symbol
    default:
      return `${symbol}${value.toFixed(2)}`;
  }
};

// Memoized stock chart component
export const InteractiveStockChart = React.memo(({ title, data, stock_symbols, currency_symbols, interval, chart }: StockChartProps) => {
  const { resolvedTheme } = useTheme();
  const textColor = resolvedTheme === 'dark' ? '#e5e5e5' : '#171717';
  const gridColor = resolvedTheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
  const tooltipBg = resolvedTheme === 'dark' ? '#171717' : '#ffffff';

  // Process the chart data
  const processedData = useMemo(() => {
    return chart.elements.map((element, index) => {
      const points = element.points.map(([dateStr, price]) => {
        const date = new Date(dateStr);
        return {
          date,
          value: Number(price),
          label: stock_symbols[index],
          currency: currency_symbols[index]
        };
      }).sort((a, b) => a.date.getTime() - b.date.getTime());

      const firstPrice = points[0]?.value || 0;
      const lastPrice = points[points.length - 1]?.value || 0;
      const priceChange = lastPrice - firstPrice;
      const percentChange = ((priceChange / firstPrice) * 100).toFixed(2);
      const seriesColor = getSeriesColor(index);

      return {
        label: formatStockSymbol(stock_symbols[index]),
        points,
        firstPrice,
        lastPrice,
        priceChange,
        percentChange,
        color: seriesColor,
        currency: currency_symbols[index]
      };
    });
  }, [chart.elements, stock_symbols, currency_symbols]);

  // Memoize tooltip formatter
  const getTooltipFormatter = useCallback((params: any[]) => {
    if (!Array.isArray(params) || params.length === 0) return '';

    const date = new Date(params[0].value[0]);
    const formattedDate = getDateFormat(interval, date);

    let tooltipHtml = `
      <div style="
        padding: 6px 10px;
        border-radius: 5px;
        border: 1px solid ${resolvedTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'};
        font-family: system-ui, -apple-system, sans-serif;
        background: ${tooltipBg};
      ">
        <div style="font-size: 13px; color: ${resolvedTheme === 'dark' ? '#9ca3af' : '#6b7280'};">
          ${formattedDate}
        </div>
    `;

    params.forEach((param) => {
      if (!param.value || param.value.length < 2) return;

      const currentPrice = param.value[1];
      const seriesName = param.seriesName;
      const series = processedData.find(d => d.label === seriesName);
      const lineColor = series?.color.line || '#888';
      const currencyCode = series?.currency || 'USD';

      const dataIndex = param.dataIndex;
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
            color: ${resolvedTheme === 'dark' ? '#f3f4f6' : '#111827'};
          ">${seriesName}: ${formatCurrency(currentPrice, currencyCode)}</span>
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
  }, [interval, resolvedTheme, tooltipBg, processedData]);

  // Memoize chart options
  const options = useMemo<EChartsOption>(() => ({
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
      formatter: getTooltipFormatter
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
        formatter: (value: number) => {
          const defaultCurrency = currency_symbols[0] || 'USD';
          return formatCurrency(value, defaultCurrency);
        },
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
              color: resolvedTheme === 'dark'
                ? 'rgba(23, 23, 23, 0)'
                : 'rgba(255, 255, 255, 0)'
            }
          ]
        }
      }
    }))
  }), [processedData, resolvedTheme, textColor, tooltipBg, gridColor, interval, currency_symbols, getTooltipFormatter]);

  // Memoize chart height style
  const chartStyle = useMemo(() => ({
    height: window.innerWidth < 640 ? '250px' : '400px',
    width: '100%'
  }), []);

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
                backgroundColor: resolvedTheme === 'dark'
                  ? `${series.color.line}15`
                  : `${series.color.line}40`,
              }}
            >
              <div className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 truncate">
                {series.label}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base sm:text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  {formatCurrency(series.lastPrice, series.currency)}
                </span>
                <Badge
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] leading-none whitespace-nowrap",
                    series.priceChange >= 0
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50"
                      : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50"
                  )}
                >
                  <span className="inline-flex items-center">
                    {series.priceChange >= 0 ? '↑' : '↓'}
                    <span className="ml-0.5">
                      {formatCurrency(Math.abs(series.priceChange), series.currency)} ({series.percentChange}%)
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
            style={chartStyle}
            theme={resolvedTheme === 'dark' ? 'dark' : undefined}
            notMerge={true}
          />
        </div>
      </div>
    </div>
  );
});

InteractiveStockChart.displayName = 'InteractiveStockChart';

export default InteractiveStockChart;