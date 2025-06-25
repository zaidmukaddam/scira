import React, { useMemo, useCallback, useEffect, useState } from 'react';
import ReactECharts, { EChartsOption } from 'echarts-for-react';
import { Badge } from '@/components/ui/badge';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight, ExternalLink, Newspaper } from 'lucide-react';
import { ChartBar } from '@phosphor-icons/react';

// Currency symbol mapping with modern design tokens
const CURRENCY_SYMBOLS = {
  USD: '$', // US Dollar
  EUR: '€', // Euro
  GBP: '£', // British Pound
  JPY: '¥', // Japanese Yen
  CNY: '¥', // Chinese Yuan
  INR: '₹', // Indian Rupee
  RUB: '₽', // Russian Ruble
  KRW: '₩', // South Korean Won
  BTC: '₿', // Bitcoin
  THB: '฿', // Thai Baht
  BRL: 'R$', // Brazilian Real
  PHP: '₱', // Philippine Peso
  ILS: '₪', // Israeli Shekel
  TRY: '₺', // Turkish Lira
  NGN: '₦', // Nigerian Naira
  VND: '₫', // Vietnamese Dong
  ARS: '$', // Argentine Peso
  ZAR: 'R', // South African Rand
  AUD: 'A$', // Australian Dollar
  CAD: 'C$', // Canadian Dollar
  SGD: 'S$', // Singapore Dollar
  HKD: 'HK$', // Hong Kong Dollar
  NZD: 'NZ$', // New Zealand Dollar
  MXN: 'Mex$', // Mexican Peso
} as const;

// Simple color palette
const CHART_COLORS = [
  { line: 'rgba(20, 184, 166, 0.8)', area: 'rgba(20, 184, 166, 0.08)' }, // teal
  { line: 'rgba(239, 68, 68, 0.8)', area: 'rgba(239, 68, 68, 0.08)' }, // red
  { line: 'rgba(101, 163, 13, 0.8)', area: 'rgba(101, 163, 13, 0.08)' }, // lime
  { line: 'rgba(59, 130, 246, 0.8)', area: 'rgba(59, 130, 246, 0.08)' }, // blue
  { line: 'rgba(16, 185, 129, 0.8)', area: 'rgba(16, 185, 129, 0.08)' }, // green
  { line: 'rgba(249, 115, 22, 0.8)', area: 'rgba(249, 115, 22, 0.08)' }, // orange
  { line: 'rgba(139, 92, 246, 0.8)', area: 'rgba(139, 92, 246, 0.08)' }, // purple
  { line: 'rgba(236, 72, 153, 0.8)', area: 'rgba(236, 72, 153, 0.08)' }, // pink
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
  news_results?: Array<{
    query: string;
    topic: string;
    results: Array<{
      title: string;
      url: string;
      content: string;
      published_date?: string;
      category: string;
      query: string;
    }>;
  }>;
}

interface ProcessedSeriesData {
  label: string;
  points: Array<{
    date: Date;
    value: number;
    label: string;
    currency: string;
  }>;
  firstPrice: number;
  lastPrice: number;
  priceChange: number;
  percentChange: string;
  color: {
    line: string;
    area: string;
  };
  currency: string;
}

const formatStockSymbol = (symbol: string) => {
  const suffixes = ['.US', '.NYSE', '.NASDAQ'];
  let formatted = symbol;

  suffixes.forEach((suffix) => {
    formatted = formatted.replace(suffix, '');
  });

  if (formatted.endsWith('USD')) {
    formatted = formatted.replace('USD', '');
    return `${formatted}/USD`;
  }

  return formatted;
};

const getDateFormat = (interval: StockChartProps['interval'], date: Date, isMobile: boolean = false) => {
  if (interval === '1d') {
    return date.toLocaleTimeString('en-US', { hour: 'numeric' });
  }
  if (interval === '5d') {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  }
  // Format month and two-digit year
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const year = date.toLocaleDateString('en-US', { year: '2-digit' });
  const formatted = `${month} ${year}`;
  // Insert line break on mobile for compactness
  return isMobile ? formatted.replace(' ', '\n') : formatted;
};

const formatCurrency = (value: number, currencyCode: string) => {
  const symbol = CURRENCY_SYMBOLS[currencyCode as keyof typeof CURRENCY_SYMBOLS] || currencyCode;

  switch (currencyCode) {
    case 'JPY':
    case 'KRW':
    case 'VND':
      return `${symbol}${value.toFixed(0)}`;
    case 'BTC':
      return `${symbol}${value.toFixed(8)}`;
    default:
      return `${symbol}${value.toFixed(2)}`;
  }
};

export const InteractiveStockChart = React.memo(
  ({ title, data, stock_symbols, currency_symbols, interval, chart, news_results }: StockChartProps) => {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const [lastUpdated, setLastUpdated] = useState<string>('');
    const [isMobile, setIsMobile] = useState<boolean>(false);

    // Set last updated time and check if device is mobile
    useEffect(() => {
      const now = new Date();
      const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastUpdated(formattedTime);

      // Check if screen width is mobile-sized
      const checkIsMobile = () => {
        setIsMobile(window.innerWidth < 640);
      };

      checkIsMobile();
      window.addEventListener('resize', checkIsMobile);
      return () => window.removeEventListener('resize', checkIsMobile);
    }, []);

    // Process chart data
    const processedData = useMemo((): ProcessedSeriesData[] => {
      return chart.elements.map((element, index) => {
        const points = element.points
          .map(([dateStr, price]) => {
            const date = new Date(dateStr);
            return {
              date,
              value: Number(price),
              label: stock_symbols[index],
              currency: currency_symbols[index],
            };
          })
          .sort((a, b) => a.date.getTime() - b.date.getTime());

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
          currency: currency_symbols[index],
        };
      });
    }, [chart.elements, stock_symbols, currency_symbols]);

    // Calculate total change
    const totalChange = useMemo(() => {
      if (processedData.length === 0) return { percent: 0, isPositive: false };

      const sumInitial = processedData.reduce((sum, series) => sum + series.firstPrice, 0);
      const sumFinal = processedData.reduce((sum, series) => sum + series.lastPrice, 0);
      const change = sumFinal - sumInitial;
      const percentChange = sumInitial > 0 ? (change / sumInitial) * 100 : 0;

      return {
        percent: percentChange,
        isPositive: change >= 0,
      };
    }, [processedData]);

    // Get tooltip formatter with enhanced date display
    const getTooltipFormatter = useCallback(
      (params: any[]) => {
        if (!Array.isArray(params) || params.length === 0) return '';

        const date = new Date(params[0].value[0]);
        // Format tooltip date as dd/MMM/yy
        const day = date.getDate().toString().padStart(2, '0');
        const month = date.toLocaleDateString('en-US', { month: 'short' });
        const year = date.getFullYear().toString().slice(-2);
        const formattedDate = `${day}/${month}/${year}`;

        // Basic tooltip container
        let tooltipHtml = `
      <div style="
        padding: 4px 10px;
        border-radius: 999px;
        font-family: system-ui, sans-serif;
        background: ${isDark ? 'rgba(32, 32, 36, 0.85)' : 'rgba(255, 255, 255, 0.85)'};
        box-shadow: 0 2px 8px ${isDark ? 'rgba(0, 0, 0, 0.25)' : 'rgba(0, 0, 0, 0.1)'};
        font-size: 11px;
        white-space: nowrap;
        border: 1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'};
        display: flex;
        align-items: center;
        gap: 6px;
      ">
        <span style="
          color: ${isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)'};
          font-size: 10px;
        ">${formattedDate}</span>
    `;

        // If multiple series are being hovered over
        if (params.length > 1) {
          params.forEach((param, index) => {
            if (!param.value || param.value.length < 2) return;

            const currentPrice = param.value[1];
            // Get the series index from the dataIndex property
            const seriesIndex = param.seriesIndex !== undefined ? param.seriesIndex : 0;
            // Use the exact same color from CHART_COLORS as used in the chart
            const colorIndex = seriesIndex % CHART_COLORS.length;
            const lineColor = CHART_COLORS[colorIndex].line;

            // Get the series for currency information
            const series = processedData.find((d) => d.label === param.seriesName);
            const currencyCode = series?.currency || 'USD';

            tooltipHtml += `
          ${index > 0 ? '<span style="color: rgba(127, 127, 127, 0.5); margin: 0 -2px;">|</span>' : ''}
          <div style="
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background-color: ${lineColor};
          "></div>
          <span style="
            color: ${isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)'};
            font-weight: ${index === 0 ? '600' : '400'};
            font-size: ${index === 0 ? '11px' : '10px'};
          ">${formatCurrency(currentPrice, currencyCode)}</span>
        `;
          });
        } else {
          // Single series display
          const param = params[0];
          const currentPrice = param.value[1];
          // Get the series index from the dataIndex property
          const seriesIndex = param.seriesIndex !== undefined ? param.seriesIndex : 0;
          // Use the exact same color from CHART_COLORS as used in the chart
          const colorIndex = seriesIndex % CHART_COLORS.length;
          const lineColor = CHART_COLORS[colorIndex].line;

          // Get the series for currency information
          const series = processedData.find((d) => d.label === param.seriesName);
          const currencyCode = series?.currency || 'USD';

          tooltipHtml += `
        <div style="
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: ${lineColor};
        "></div>
        <span style="
          color: ${isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)'};
          font-weight: 600;
        ">${formatCurrency(currentPrice, currencyCode)}</span>
      `;
        }

        tooltipHtml += `</div>`;
        return tooltipHtml;
      },
      [interval, processedData, isDark],
    );

    // Chart options
    const chartOptions = useMemo<EChartsOption>(() => {
      const textColor = isDark ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.85)';
      const subTextColor = isDark ? 'rgba(255, 255, 255, 0.45)' : 'rgba(0, 0, 0, 0.45)';
      const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';

      // Get unique currencies
      const uniqueCurrencies = Array.from(new Set(processedData.map((s) => s.currency)));
      const hasMultipleCurrencies = uniqueCurrencies.length > 1;

      // Create a multi-axis chart if needed
      const yAxis = hasMultipleCurrencies
        ? uniqueCurrencies.map((currency, i) => ({
            type: 'value' as const,
            position: i === 0 ? ('right' as const) : ('left' as const),
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: {
              formatter: (value: number) => formatCurrency(value, currency),
              color: subTextColor,
              fontSize: 10,
            },
            splitLine: {
              lineStyle: { color: gridColor },
            },
          }))
        : {
            type: 'value',
            position: 'right',
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: {
              formatter: (value: number) => {
                const currency = processedData[0]?.currency || 'USD';
                return formatCurrency(value, currency);
              },
              color: subTextColor,
              fontSize: 10,
            },
            splitLine: {
              lineStyle: { color: gridColor },
            },
          };

      return {
        backgroundColor: 'transparent',
        grid: {
          top: 5,
          right: hasMultipleCurrencies ? 30 : 5,
          bottom: 5,
          left: hasMultipleCurrencies ? 30 : 5,
          containLabel: true,
        },
        tooltip: {
          trigger: 'axis',
          backgroundColor: 'transparent',
          borderWidth: 0,
          borderRadius: 999,
          padding: 0,
          formatter: getTooltipFormatter,
          axisPointer: {
            type: 'line',
            lineStyle: {
              color: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)',
              width: 1,
            },
          },
        },
        xAxis: {
          type: 'time',
          axisLine: {
            lineStyle: { color: gridColor },
          },
          axisTick: { show: false },
          axisLabel: {
            color: subTextColor,
            formatter: (value: number) => {
              const date = new Date(value);
              const month = date.toLocaleDateString('en-US', { month: 'short' });
              const year = date.toLocaleDateString('en-US', { year: '2-digit' });
              return isMobile ? `${month}\n${year}` : `${month} ${year}`;
            },
            fontSize: 10,
            margin: 8,
            // Rotate labels for readability on mobile if needed
            rotate: isMobile ? 45 : 0,
          },
          splitLine: { show: false },
        },
        yAxis,
        series: processedData.map((series, index) => {
          // For multi-currency charts, assign each series to its proper yAxis
          const yAxisIndex = hasMultipleCurrencies ? uniqueCurrencies.indexOf(series.currency) : 0;

          // Get color from CHART_COLORS using the consistent index
          const colorIndex = index % CHART_COLORS.length;
          const color = CHART_COLORS[colorIndex];

          return {
            name: series.label,
            type: 'line',
            smooth: true,
            showSymbol: false,
            emphasis: {
              focus: 'series',
            },
            ...(hasMultipleCurrencies ? { yAxisIndex } : {}),
            data: series.points.map((point) => [point.date.getTime(), point.value]),
            // Explicitly set the itemStyle to ensure the tooltip marker matches
            itemStyle: {
              color: color.line,
            },
            lineStyle: {
              color: color.line,
              width: 1,
            },
            areaStyle: {
              color: color.area,
              opacity: 0.3,
            },
          };
        }),
      };
    }, [processedData, interval, getTooltipFormatter, isDark, isMobile]);

    return (
      <div className="w-full rounded-lg border border-border/50 overflow-hidden shadow-xs">
        <div className="bg-card px-3 py-2 border-b border-border/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-primary"
            >
              <path
                d="M21 21H4.6C4.03995 21 3.75992 21 3.54601 20.891C3.35785 20.7951 3.20487 20.6422 3.10899 20.454C3 20.2401 3 19.9601 3 19.4V3"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M7 14.5L12 9.5L17 14.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <h2 className="text-sm font-medium text-foreground/90">Financial Stock Chart</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full flex items-center gap-1">
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-primary/70"
              >
                <path
                  d="M12 8V12L15 15"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
              </svg>
              <span>YFinance • {lastUpdated}</span>
            </div>
            <div className="text-xs text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full">LATEST</div>
          </div>
        </div>

        <div className="p-3 bg-muted/10">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-semibold text-foreground/90">{title}</h2>
            <Badge
              variant={totalChange.isPositive ? 'green' : 'destructive'}
              className={`${
                totalChange.isPositive
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
              } text-xs px-2 py-0.5`}
            >
              {totalChange.isPositive ? (
                <ArrowUpRight className="h-3 w-3 mr-0.5" />
              ) : (
                <ArrowDownRight className="h-3 w-3 mr-0.5" />
              )}
              {Math.abs(totalChange.percent).toFixed(2)}%
            </Badge>
          </div>

          <div className="w-full h-56 md:h-72">
            <ReactECharts
              option={chartOptions}
              style={{ height: '100%', width: '100%' }}
              theme={isDark ? 'dark' : undefined}
              opts={{ renderer: 'canvas' }}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
            {processedData.map((series) => (
              <div key={series.label} className="p-2 rounded-md bg-card/40 border border-border/30">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: series.color.line }}></div>
                  <span className="text-xs font-medium text-foreground/70">{series.label}</span>
                </div>
                <div className="font-medium">{formatCurrency(series.lastPrice, series.currency)}</div>
                <div
                  className={`text-xs ${
                    series.priceChange >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {series.priceChange >= 0 ? '+' : ''}
                  {series.percentChange}%
                </div>
              </div>
            ))}
          </div>

          {/* News Results Section */}
          {news_results && news_results.length > 0 && news_results.some((group) => group.results.length > 0) && (
            <div className="mt-5 pt-4 border-t border-border/30">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-1.5">
                  <Newspaper className="size-3.5 text-primary/80" />
                  <h3 className="text-xs font-medium text-foreground/90">Related News</h3>
                </div>
              </div>

              <div className="flex overflow-x-auto gap-1.5 no-scrollbar pb-1 snap-x snap-mandatory">
                {news_results.flatMap((group, groupIndex) =>
                  group.results.slice(0, 8).map((news, newsIndex) => (
                    <a
                      key={`${groupIndex}-${newsIndex}`}
                      href={news.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-w-64 max-w-72 w-[calc(100vw-2.5rem)] sm:w-64 shrink-0 p-2 rounded-md bg-card/40 border border-border/30 hover:bg-card/70 transition-colors snap-start"
                    >
                      <div className="flex items-start gap-1.5">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Badge
                              variant="secondary"
                              className={cn(
                                'rounded-full px-1.5 py-0 text-[9px] font-medium',
                                group.topic === 'finance'
                                  ? 'bg-emerald-100/70 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                                  : 'bg-blue-100/70 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
                              )}
                            >
                              {group.topic === 'finance' ? 'Finance' : 'News'}
                            </Badge>
                            <span className="text-[9px] text-muted-foreground/80 truncate">{group.query}</span>
                          </div>
                          <h4 className="text-xs font-medium line-clamp-2">{news.title}</h4>

                          <p className="text-[10px] text-muted-foreground line-clamp-2 mt-1">{news.content}</p>

                          <div className="flex items-center justify-between mt-1.5">
                            <div className="flex items-center gap-1">
                              <div className="relative w-3 h-3 rounded-sm bg-muted/50 flex items-center justify-center overflow-hidden">
                                <img
                                  src={`https://www.google.com/s2/favicons?sz=128&domain=${new URL(news.url).hostname}`}
                                  alt=""
                                  className="w-3 h-3 object-contain"
                                  onError={(e) => {
                                    e.currentTarget.src =
                                      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cline x1='12' y1='8' x2='12' y2='16'/%3E%3Cline x1='8' y1='12' x2='16' y2='12'/%3E%3C/svg%3E";
                                  }}
                                />
                              </div>
                              <span className="text-[9px] text-muted-foreground/80 truncate max-w-[100px]">
                                {new URL(news.url).hostname.replace('www.', '')}
                              </span>
                            </div>

                            {news.published_date && (
                              <time className="text-[9px] text-muted-foreground/70">
                                {new Date(news.published_date).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </time>
                            )}
                          </div>
                        </div>
                      </div>
                    </a>
                  )),
                )}
              </div>
            </div>
          )}

          {/* Financial Reports Section from Exa */}
          {news_results && news_results.some((group) => group.topic === 'financial' && group.results.length > 0) && (
            <div className="mt-5 pt-4 border-t border-border/30">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-1.5">
                  <ChartBar className="size-3.5 text-primary/80" />
                  <h3 className="text-xs font-medium text-foreground/90">Financial Reports</h3>
                </div>
              </div>

              <div className="flex overflow-x-auto gap-1.5 no-scrollbar pb-1 snap-x snap-mandatory">
                {news_results
                  .filter((group) => group.topic === 'financial')
                  .flatMap((group, groupIndex) =>
                    group.results.slice(0, 8).map((news, newsIndex) => (
                      <a
                        key={`financial-${groupIndex}-${newsIndex}`}
                        href={news.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-w-64 max-w-72 w-[calc(100vw-2.5rem)] sm:w-64 shrink-0 p-2 rounded-md bg-card/40 border border-border/30 hover:bg-card/70 transition-colors snap-start"
                      >
                        <div className="flex items-start gap-1.5">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Badge
                                variant="secondary"
                                className="rounded-full px-1.5 py-0 text-[9px] font-medium bg-amber-100/70 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                              >
                                Financial
                              </Badge>
                              <span className="text-[9px] text-muted-foreground/80 truncate">{news.query}</span>
                            </div>
                            <h4 className="text-xs font-medium line-clamp-2">{news.title}</h4>

                            <p className="text-[10px] text-muted-foreground line-clamp-2 mt-1">{news.content}</p>

                            <div className="flex items-center justify-between mt-1.5">
                              <div className="flex items-center gap-1">
                                <div className="relative w-3 h-3 rounded-sm bg-muted/50 flex items-center justify-center overflow-hidden">
                                  <img
                                    src={`https://www.google.com/s2/favicons?sz=128&domain=${
                                      new URL(news.url).hostname
                                    }`}
                                    alt=""
                                    className="w-3 h-3 object-contain"
                                    onError={(e) => {
                                      e.currentTarget.src =
                                        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cline x1='12' y1='8' x2='12' y2='16'/%3E%3Cline x1='8' y1='12' x2='16' y2='12'/%3E%3C/svg%3E";
                                    }}
                                  />
                                </div>
                                <span className="text-[9px] text-muted-foreground/80 truncate max-w-[100px]">
                                  {new URL(news.url).hostname.replace('www.', '')}
                                </span>
                              </div>

                              {news.published_date && (
                                <time className="text-[9px] text-muted-foreground/70">
                                  {new Date(news.published_date).toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </time>
                              )}
                            </div>
                          </div>
                        </div>
                      </a>
                    )),
                  )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  },
);

InteractiveStockChart.displayName = 'InteractiveStockChart';

export default InteractiveStockChart;
