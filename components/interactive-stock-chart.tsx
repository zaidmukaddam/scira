import React, { useMemo, useCallback, useEffect, useState, startTransition, memo } from 'react';
import dynamic from 'next/dynamic';
import type { EChartsOption } from 'echarts-for-react';
import { Badge } from '@/components/ui/badge';
import { useTheme } from 'next-themes';
import { Skeleton } from '@/components/ui/skeleton';
import { useMediaQuery } from '@/hooks/use-media-query';

import ReactECharts from "echarts-for-react";

import { cn } from '@/lib/utils';
import {
  ArrowUpRight,
  ArrowDownRight,
  Newspaper,
  TrendingUp,
  TrendingDown,
  Target,
  Calendar,
  ChevronDown,
  ChevronUp,
  BarChart3,
  List,
  FileText,
  Building2,
  Activity,
  Wallet,
  Banknote,
  UserCheck,
} from 'lucide-react';
import { ChartBarIcon } from '@phosphor-icons/react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { HugeiconsIcon } from '@/components/ui/hugeicons';
import { Chart03Icon } from '@hugeicons/core-free-icons';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MarkdownRenderer } from '@/components/markdown';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Currency symbol mapping with modern design tokens
const CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CNY: '¥',
  INR: '₹',
  RUB: '₽',
  KRW: '₩',
  BTC: '₿',
  THB: '฿',
  BRL: 'R$',
  PHP: '₱',
  ILS: '₪',
  TRY: '₺',
  NGN: '₦',
  VND: '₫',
  ARS: '$',
  ZAR: 'R',
  AUD: 'A$',
  CAD: 'C$',
  SGD: 'S$',
  HKD: 'HK$',
  NZD: 'NZ$',
  MXN: 'Mex$',
} as const;

// Theme-aware chart colors - using hex for ECharts compatibility
const getChartColors = (isDark: boolean) => {
  if (isDark) {
    return [
      { line: '#2dd4bf', area: 'rgba(45, 212, 191, 0.15)' },   // teal
      { line: '#f472b6', area: 'rgba(244, 114, 182, 0.15)' },  // pink
      { line: '#a78bfa', area: 'rgba(167, 139, 250, 0.15)' },  // violet
      { line: '#60a5fa', area: 'rgba(96, 165, 250, 0.15)' },   // blue
      { line: '#fbbf24', area: 'rgba(251, 191, 36, 0.15)' },   // amber
      { line: '#34d399', area: 'rgba(52, 211, 153, 0.15)' },   // emerald
      { line: '#fb923c', area: 'rgba(251, 146, 60, 0.15)' },   // orange
      { line: '#e879f9', area: 'rgba(232, 121, 249, 0.15)' },  // fuchsia
    ];
  }
  return [
    { line: '#0d9488', area: 'rgba(13, 148, 136, 0.12)' },   // teal
    { line: '#db2777', area: 'rgba(219, 39, 119, 0.12)' },   // pink
    { line: '#7c3aed', area: 'rgba(124, 58, 237, 0.12)' },   // violet
    { line: '#2563eb', area: 'rgba(37, 99, 235, 0.12)' },    // blue
    { line: '#d97706', area: 'rgba(217, 119, 6, 0.12)' },    // amber
    { line: '#059669', area: 'rgba(5, 150, 105, 0.12)' },    // emerald
    { line: '#ea580c', area: 'rgba(234, 88, 12, 0.12)' },    // orange
    { line: '#c026d3', area: 'rgba(192, 38, 211, 0.12)' },   // fuchsia
  ];
};

const getSeriesColor = (index: number, isDark: boolean = false) => {
  const colors = getChartColors(isDark);
  return colors[index % colors.length];
};

interface StockChartProps {
  title: string;
  data: any[];
  stock_symbols?: string[]; // Keep for backward compatibility
  currency_symbols: string[];
  interval: string; // Now accepts natural language intervals
  chart: {
    type: string;
    x_label: string;
    y_label: string;
    x_scale: string;
    x_ticks?: string[];
    x_tick_labels?: string[];
    elements: Array<{ label: string; points: Array<[string, number]>; ticker?: string }>;
  };
  resolved_companies?: Array<{
    name: string;
    ticker: string;
  }>;
  earnings_data?: Array<{
    ticker: string;
    companyName: string;
    earnings: Array<{
      date: string;
      time: string;
      eps_estimate: number | null;
      eps_actual: number;
      difference: number | null;
      surprise_prc: number | null;
    }>;
    metadata?: {
      symbol?: string;
      name?: string;
      start_date?: string;
      end_date?: string;
      timestamp?: string;
      total_results?: number;
      exchange?: string;
    };
  }>;
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
  sec_filings?: Array<{
    id?: string;
    title: string;
    url: string;
    content: string;
    metadata?: {
      accession_number?: string;
      full_filing?: boolean;
      filing_date?: string; // YYYYMMDD format
      date?: string; // YYYY-MM-DD format (alternative field)
      document_type?: string;
      form_type?: string; // Alternative field name
      name?: string;
      ticker?: string;
      cik?: string;
      part?: string;
      item?: string;
      timestamp?: string;
    };
    requestedCompany: string;
    requestedFilingType: string;
  }>;
  company_statistics?: Record<string, any>;
  balance_sheets?: Record<string, any[]>;
  income_statements?: Record<string, any[]>;
  cash_flows?: Record<string, any[]>;
  dividends_data?: Record<string, any[]>;
  insider_transactions?: Record<string, any[]>;
  market_movers?: {
    gainers: Array<{
      symbol: string;
      name: string;
      exchange: string;
      last: number;
      change: number;
      percent_change: number;
      volume: number;
    }>;
    losers: Array<{
      symbol: string;
      name: string;
      exchange: string;
      last: number;
      change: number;
      percent_change: number;
      volume: number;
    }>;
    most_active: Array<{
      symbol: string;
      name: string;
      exchange: string;
      last: number;
      change: number;
      percent_change: number;
      volume: number;
    }>;
  };
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

const getDateFormat = (interval: string, date: Date, isMobile: boolean = false) => {
  // Check for short time periods that might need hourly format
  if (interval.includes('day') && (interval.includes('1') || interval === '1d')) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric' });
  }
  // Check for very short periods (like 5 days)
  if ((interval.includes('day') && interval.includes('5')) || interval === '5d') {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  }
  // Default to month/year format for most other cases
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

// Helper function to parse various date formats from SEC filings
const parseSecFilingDate = (dateStr: string): Date => {
  // Handle ISO format (YYYY-MM-DD)
  if (dateStr.includes('-')) {
    return new Date(dateStr);
  }

  // Handle YYYYMMDD format
  if (dateStr.length === 8) {
    const year = dateStr.slice(0, 4);
    const month = dateStr.slice(4, 6);
    const day = dateStr.slice(6, 8);
    return new Date(`${year}-${month}-${day}`);
  }

  // Fallback to native Date parsing
  return new Date(dateStr);
};

// Helper to get filing date from metadata (handles different field names)
const getFilingDate = (metadata: any): string | null => {
  return metadata?.filing_date || metadata?.date || null;
};

export const InteractiveStockChart = React.memo(
  ({
    title,
    data,
    stock_symbols,
    currency_symbols,
    interval,
    chart,
    resolved_companies,
    earnings_data,
    news_results,
    sec_filings,
    company_statistics,
    balance_sheets,
    income_statements,
    cash_flows,
    dividends_data,
    insider_transactions,
    market_movers,
  }: StockChartProps) => {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    // Use lazy initialization for lastUpdated - computation runs only once
    const [lastUpdated, setLastUpdated] = useState<string>(() => {
      if (typeof window === 'undefined') return '';
      const now = new Date();
      return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    });
    // Use useMediaQuery instead of useState + resize listener (rule 5.4: subscribe to derived state)
    const isMobile = useMediaQuery('(max-width: 639px)');
    const [earningsViewMode, setEarningsViewMode] = useState<'reports' | 'chart'>('reports');
    const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(() => new Set());
    const [expandedDividendCompanies, setExpandedDividendCompanies] = useState<Set<string>>(() => new Set());

    // Toggle company expansion - use startTransition for non-urgent updates (rule 5.7)
    const toggleCompanyExpansion = useCallback((ticker: string) => {
      startTransition(() => {
        setExpandedCompanies((prev) => {
          const newSet = new Set(prev);
          if (newSet.has(ticker)) {
            newSet.delete(ticker);
          } else {
            newSet.add(ticker);
          }
          return newSet;
        });
      });
    }, []);

    // Toggle dividends company expansion - use startTransition for non-urgent updates (rule 5.7)
    const toggleDividendExpansion = useCallback((company: string) => {
      startTransition(() => {
        setExpandedDividendCompanies((prev) => {
          const next = new Set(prev);
          if (next.has(company)) {
            next.delete(company);
          } else {
            next.add(company);
          }
          return next;
        });
      });
    }, []);

    // Normalize currency symbols to match the number of series; default missing to USD
    const normalizedCurrencySymbols = useMemo(() => {
      const seriesCount = chart.elements.length;
      const provided = (currency_symbols ?? []).map((code) => code.toUpperCase());
      if (provided.length < seriesCount) {
        provided.push(...Array(seriesCount - provided.length).fill('USD'));
      }
      return provided.slice(0, seriesCount);
    }, [currency_symbols, chart.elements.length]);

    // Update lastUpdated on client mount (only if not already set via lazy init)
    useEffect(() => {
      if (!lastUpdated) {
        const now = new Date();
        setLastUpdated(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }
    }, [lastUpdated]);

    // Process chart data
    const processedData = useMemo((): ProcessedSeriesData[] => {
      return chart.elements.map((element, index) => {
        // Extract ticker/symbol from various sources
        const ticker =
          element.ticker ||
          resolved_companies?.[index]?.ticker ||
          stock_symbols?.[index] ||
          element.label.split(' ')[0] || // fallback to first word of label
          'N/A';

        const points = element.points
          .map(([dateStr, price]) => {
            const date = new Date(dateStr);
            return {
              date,
              value: Number(price),
              label: ticker,
              currency: currency_symbols[index] || 'USD',
            };
          })
          .sort((a, b) => a.date.getTime() - b.date.getTime());

        const firstPrice = points[0]?.value || 0;
        const lastPrice = points[points.length - 1]?.value || 0;
        const priceChange = lastPrice - firstPrice;
        const percentChange = firstPrice > 0 ? ((priceChange / firstPrice) * 100).toFixed(2) : '0.00';
        const seriesColor = getSeriesColor(index, isDark);

        return {
          label: element.label, // Use the full label from Valyu (includes company name)
          points,
          firstPrice,
          lastPrice,
          priceChange,
          percentChange,
          color: seriesColor,
          currency: currency_symbols[index] || 'USD',
        };
      });
    }, [chart.elements, stock_symbols, currency_symbols, resolved_companies, isDark]);

    // Create a Map for O(1) lookups in tooltip formatter (rule 7.11: Use Set/Map for O(1) lookups)
    const processedDataByLabel = useMemo(() => {
      return new Map(processedData.map((series) => [series.label, series]));
    }, [processedData]);

    // Calculate total change - combine iterations (rule 7.6)
    const totalChange = useMemo(() => {
      if (processedData.length === 0) return { percent: 0, isPositive: false };

      let sumInitial = 0;
      let sumFinal = 0;
      for (const series of processedData) {
        sumInitial += series.firstPrice;
        sumFinal += series.lastPrice;
      }
      const change = sumFinal - sumInitial;
      const percentChange = sumInitial > 0 ? (change / sumInitial) * 100 : 0;

      return {
        percent: percentChange,
        isPositive: change >= 0,
      };
    }, [processedData]);

    // Theme-aware colors for ECharts
    const themeColors = useMemo(() => getChartColors(isDark), [isDark]);

    // Get tooltip formatter with enhanced date display
    const getTooltipFormatter = useCallback(
      (params: any[]) => {
        if (!Array.isArray(params) || params.length === 0) return '';

        const date = new Date(params[0].value[0]);
        // Format tooltip date
        const formattedDate = date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          year: 'numeric'
        });

        // Theme-aware tooltip colors
        const tooltipBg = isDark ? 'rgba(9, 9, 11, 0.95)' : 'rgba(255, 255, 255, 0.98)';
        const tooltipBorder = isDark ? 'rgba(63, 63, 70, 0.4)' : 'rgba(228, 228, 231, 0.6)';
        const textColor = isDark ? '#fafafa' : '#18181b';
        const mutedColor = isDark ? '#71717a' : '#a1a1aa';
        const shadowColor = isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.08)';

        // Build tooltip rows
        let rowsHtml = '';
        const items = params.length > 1 ? params : [params[0]];
        
        items.forEach((param) => {
          if (!param.value || param.value.length < 2) return;
          
          const currentPrice = param.value[1];
          const seriesIndex = param.seriesIndex !== undefined ? param.seriesIndex : 0;
          const colorIndex = seriesIndex % themeColors.length;
          const lineColor = themeColors[colorIndex].line;
          const series = processedDataByLabel.get(param.seriesName);
          const currencyCode = series?.currency || 'USD';
          const label = param.seriesName?.split(' ')[0] || '';

          rowsHtml += `
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <div style="width: 8px; height: 8px; border-radius: 50%; background: ${lineColor};"></div>
                <span style="color: ${mutedColor}; font-size: 11px;">${label}</span>
              </div>
              <span style="color: ${textColor}; font-weight: 600; font-size: 12px; font-variant-numeric: tabular-nums;">
                ${formatCurrency(currentPrice, currencyCode)}
              </span>
            </div>
          `;
        });

        const tooltipHtml = `
          <div style="
            padding: 10px 14px;
            border-radius: 10px;
            font-family: system-ui, -apple-system, sans-serif;
            background: ${tooltipBg};
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            box-shadow: 0 4px 20px ${shadowColor}, 0 0 0 1px ${tooltipBorder};
            min-width: 140px;
          ">
            <div style="color: ${mutedColor}; font-size: 10px; font-weight: 500; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
              ${formattedDate}
            </div>
            <div style="display: flex; flex-direction: column; gap: 6px;">
              ${rowsHtml}
            </div>
          </div>
        `;
        
        return tooltipHtml;
      },
      [processedDataByLabel, isDark, themeColors],
    );

    // Chart options
    const chartOptions = useMemo<EChartsOption>(() => {
      // Theme-aware colors using hex for ECharts compatibility
      const subTextColor = isDark ? '#a1a1aa' : '#71717a';
      const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';
      const crosshairColor = isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)';

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
            lineStyle: { color: gridColor, type: 'dashed' as const },
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
            lineStyle: { color: gridColor, type: 'dashed' as const },
          },
        };

      return {
        backgroundColor: 'transparent',
        grid: {
          top: 10,
          right: hasMultipleCurrencies ? 55 : 50,
          bottom: 25,
          left: hasMultipleCurrencies ? 55 : 10,
          containLabel: false,
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
              color: crosshairColor,
              width: 1,
              type: 'dashed',
            },
          },
        },
        xAxis: {
          type: 'time',
          axisLine: { show: false },
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
            margin: 10,
            rotate: isMobile ? 45 : 0,
          },
          splitLine: { show: false },
        },
        yAxis,
        series: processedData.map((series, index) => {
          // For multi-currency charts, assign each series to its proper yAxis
          const yAxisIndex = hasMultipleCurrencies ? uniqueCurrencies.indexOf(series.currency) : 0;

          // Get theme-aware color
          const colorIndex = index % themeColors.length;
          const color = themeColors[colorIndex];

          return {
            name: series.label,
            type: 'line',
            smooth: 0.4,
            showSymbol: false,
            emphasis: {
              focus: 'series',
            },
            ...(hasMultipleCurrencies ? { yAxisIndex } : {}),
            data: series.points.map((point) => [point.date.getTime(), point.value]),
            itemStyle: {
              color: color.line,
            },
            lineStyle: {
              color: color.line,
              width: 2,
            },
            areaStyle: {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: color.area.replace('0.15', '0.25').replace('0.12', '0.2') },
                  { offset: 1, color: color.area.replace('0.15', '0').replace('0.12', '0') },
                ],
              },
            },
          };
        }),
      };
    }, [processedData, getTooltipFormatter, isDark, isMobile, themeColors]);

    // Process earnings data for individual chart visualization per company
    const createEarningsChartForCompany = useCallback(
      (company: any, companyIndex: number) => {
        // Theme-aware colors using hex for ECharts compatibility
        const textColor = isDark ? '#fafafa' : '#18181b';
        const subTextColor = isDark ? '#a1a1aa' : '#71717a';
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';
        const crosshairColor = isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)';
        const tooltipBg = isDark ? 'rgba(24, 24, 27, 0.95)' : 'rgba(255, 255, 255, 0.95)';
        const tooltipBorder = isDark ? 'rgba(63, 63, 70, 0.5)' : 'rgba(228, 228, 231, 0.8)';
        const mutedColor = isDark ? '#a1a1aa' : '#71717a';
        const color = getSeriesColor(companyIndex, isDark);

        // Sort earnings by date for proper timeline - use toSorted for immutability (rule 7.12)
        const sortedEarnings = company.earnings.toSorted(
          (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        );

        // Combine filter and map operations in single iteration (rule 7.6)
        const actualData: [number, number][] = [];
        const estimateData: [number, number | null][] = [];
        for (const earning of sortedEarnings) {
          const timestamp = new Date(earning.date).getTime();
          actualData.push([timestamp, earning.eps_actual]);
          if (earning.eps_estimate !== null) {
            estimateData.push([timestamp, earning.eps_estimate]);
          }
        }

        const series = [
          {
            name: 'Actual',
            type: 'line' as const,
            data: actualData,
            lineStyle: { color: color.line, width: 2 },
            itemStyle: { color: color.line },
            showSymbol: false,
            smooth: 0.4,
            emphasis: { focus: 'series' },
            areaStyle: {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: color.area.replace('0.15', '0.25').replace('0.12', '0.2') },
                  { offset: 1, color: color.area.replace('0.15', '0').replace('0.12', '0') },
                ],
              },
            },
          },
          ...(estimateData.length > 0
            ? [
              {
                name: 'Estimate',
                type: 'line' as const,
                data: estimateData,
                lineStyle: {
                  color: color.line,
                  width: 1.5,
                  type: 'dashed' as const,
                  opacity: 0.6,
                },
                itemStyle: { color: color.line, opacity: 0.6 },
                showSymbol: false,
                smooth: 0.4,
                emphasis: { focus: 'series' },
              },
            ]
            : []),
        ];

        const option: EChartsOption = {
          backgroundColor: 'transparent',
          grid: {
            top: 35,
            right: 5,
            bottom: 25,
            left: 5,
            containLabel: true,
          },
          tooltip: {
            trigger: 'axis',
            backgroundColor: 'transparent',
            borderWidth: 0,
            borderRadius: 10,
            padding: 0,
            formatter: (params: any) => {
              if (!Array.isArray(params) || params.length === 0) return '';

              const date = new Date(params[0].value[0]);
              const formattedDate = date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
              });
              
              const shadowColor = isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.08)';
              
              let rowsHtml = '';
              params.forEach((param: any) => {
                const value = param.value[1];
                const lineColor = param.color;
                const isEstimate = param.seriesName === 'Estimate';

                rowsHtml += `
                  <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <div style="width: 8px; height: 8px; border-radius: 50%; background: ${lineColor}; ${isEstimate ? 'opacity: 0.6;' : ''}"></div>
                      <span style="color: ${mutedColor}; font-size: 11px;">${isEstimate ? 'Est' : 'Actual'}</span>
                    </div>
                    <span style="color: ${textColor}; font-weight: 600; font-size: 12px; font-variant-numeric: tabular-nums;">
                      $${value.toFixed(2)}
                    </span>
                  </div>
                `;
              });

              return `
                <div style="
                  padding: 10px 14px;
                  border-radius: 10px;
                  font-family: system-ui, -apple-system, sans-serif;
                  background: ${isDark ? 'rgba(9, 9, 11, 0.95)' : 'rgba(255, 255, 255, 0.98)'};
                  backdrop-filter: blur(12px);
                  -webkit-backdrop-filter: blur(12px);
                  box-shadow: 0 4px 20px ${shadowColor}, 0 0 0 1px ${tooltipBorder};
                  min-width: 120px;
                ">
                  <div style="color: ${mutedColor}; font-size: 10px; font-weight: 500; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
                    ${formattedDate}
                  </div>
                  <div style="display: flex; flex-direction: column; gap: 6px;">
                    ${rowsHtml}
                  </div>
                </div>
              `;
            },
            axisPointer: {
              type: 'line',
              lineStyle: {
                color: crosshairColor,
                width: 1,
                type: 'dashed',
              },
            },
          },
          legend: {
            show: estimateData.length > 0,
            top: 5,
            right: 10,
            textStyle: { color: subTextColor, fontSize: 9 },
            itemGap: 10,
            itemWidth: 12,
            itemHeight: 8,
          },
          xAxis: {
            type: 'time',
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: {
              color: subTextColor,
              fontSize: 9,
              formatter: (value: number) => {
                const date = new Date(value);
                return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
              },
              margin: 8,
            },
            splitLine: { show: false },
          },
          yAxis: {
            type: 'value',
            position: 'left',
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: {
              color: subTextColor,
              fontSize: 9,
              formatter: (value: number) => `$${value.toFixed(2)}`,
              margin: 8,
            },
            splitLine: { lineStyle: { color: gridColor, type: 'dashed' as const } },
          },
          series: series,
        };

        return option;
      },
      [isDark],
    );

    return (
      <div className="w-full rounded-xl border border-border/60 overflow-hidden bg-card/30">
        <Accordion type="single" collapsible defaultValue="open">
          <AccordionItem value="open" className="border-0">
            <AccordionTrigger className="px-4 py-3 border-b border-border/40 no-underline hover:no-underline hover:bg-muted/20 transition-colors">
              <div className="w-full flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1.5 rounded-md bg-primary/10">
                    <HugeiconsIcon icon={Chart03Icon} className="size-3.5 text-primary" strokeWidth={2} />
                  </div>
                  <div className="flex flex-col items-start gap-0.5 min-w-0">
                    <span className="font-pixel text-[10px] text-muted-foreground/50 uppercase tracking-wider">Stock Analysis</span>
                    <h2 className="text-xs font-medium text-foreground truncate">{title}</h2>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-muted-foreground/60 tabular-nums hidden sm:inline">{lastUpdated}</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] font-semibold px-2 py-0.5 border',
                      totalChange.isPositive
                        ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                        : 'border-red-500/30 text-red-600 dark:text-red-400'
                    )}
                  >
                    {totalChange.isPositive ? (
                      <TrendingUp className="size-2.5 mr-1" strokeWidth={2.5} />
                    ) : (
                      <TrendingDown className="size-2.5 mr-1" strokeWidth={2.5} />
                    )}
                    {Math.abs(totalChange.percent).toFixed(2)}%
                  </Badge>
                </div>
              </div>
            </AccordionTrigger>

            <AccordionContent className="p-0">
              <div className="p-4 space-y-4">
                {/* Title and interval */}
                <div className="flex items-center gap-2">
                  <span className="font-pixel text-[9px] text-muted-foreground/40 uppercase tracking-wider">{interval}</span>
                  <span className="text-[9px] text-muted-foreground/30">/</span>
                  <span className="text-[10px] text-muted-foreground/50 tabular-nums">{processedData.length} {processedData.length === 1 ? 'series' : 'series'}</span>
                </div>

                {/* Chart */}
                <div className="w-full h-56 md:h-72 rounded-lg border border-border/40 bg-muted/10 p-1.5">
                  <ReactECharts
                    option={chartOptions}
                    style={{ height: '100%', width: '100%' }}
                    theme={isDark ? 'dark' : undefined}
                    opts={{ renderer: 'canvas' }}
                  />
                </div>

                {/* Stock Cards */}
                <div className="rounded-lg border border-border/40 divide-y divide-border/30 overflow-hidden">
                  {processedData.map((series) => (
                    <div 
                      key={series.label} 
                      className="flex items-center justify-between px-3.5 py-2.5 hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: series.color.line }} />
                        <span className="text-xs font-medium text-foreground truncate">{series.label}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-semibold text-foreground tabular-nums">
                          {formatCurrency(series.lastPrice, series.currency)}
                        </span>
                        <span
                          className={cn(
                            'text-[11px] font-semibold flex items-center gap-0.5 tabular-nums min-w-[60px] justify-end',
                            series.priceChange >= 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-red-600 dark:text-red-400'
                          )}
                        >
                          {series.priceChange >= 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                          {series.priceChange >= 0 ? '+' : ''}
                          {series.percentChange}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Earnings Results Section */}
                {earnings_data && earnings_data.length > 0 ? (
                  <div className="pt-4 border-t border-border/30">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Target className="size-3.5 text-muted-foreground" strokeWidth={2} />
                        <span className="font-pixel text-[10px] text-muted-foreground/50 uppercase tracking-wider">Earnings</span>
                      </div>

                      <div className="flex items-center gap-0.5 bg-muted/40 rounded-md p-0.5 border border-border/30">
                        <button
                          onClick={() => startTransition(() => setEarningsViewMode('reports'))}
                          className={cn(
                            'flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-all',
                            earningsViewMode === 'reports'
                              ? 'bg-background text-foreground shadow-sm border border-border/40'
                              : 'text-muted-foreground hover:text-foreground',
                          )}
                        >
                          <List className="size-2.5" strokeWidth={2} />
                          List
                        </button>
                        <button
                          onClick={() => startTransition(() => setEarningsViewMode('chart'))}
                          className={cn(
                            'flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-all',
                            earningsViewMode === 'chart'
                              ? 'bg-background text-foreground shadow-sm border border-border/40'
                              : 'text-muted-foreground hover:text-foreground',
                          )}
                        >
                          <BarChart3 className="size-2.5" strokeWidth={2} />
                          Chart
                        </button>
                      </div>
                    </div>

                    {earningsViewMode === 'chart' && earnings_data ? (
                      <div className="space-y-2">
                        {earnings_data.map((company, companyIndex) => (
                          <div key={company.ticker} className="rounded-lg border border-border/40 overflow-hidden">
                            <div className="px-3 py-2 flex items-center justify-between border-b border-border/30 bg-muted/20">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-1.5 h-1.5 rounded-full"
                                  style={{ backgroundColor: getSeriesColor(companyIndex, isDark).line }}
                                />
                                <span className="text-xs font-medium">{company.companyName}</span>
                                <span className="font-pixel text-[9px] text-muted-foreground/50 uppercase tracking-wider">{company.ticker}</span>
                              </div>
                              <span className="text-[10px] text-muted-foreground tabular-nums">{company.earnings.length} reports</span>
                            </div>
                            <div className="w-full h-44 p-1.5">
                              <ReactECharts
                                option={createEarningsChartForCompany(company, companyIndex)}
                                style={{ height: '100%', width: '100%' }}
                                theme={isDark ? 'dark' : undefined}
                                opts={{ renderer: 'canvas' }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {earningsViewMode === 'reports' && earnings_data ? (
                      <div className="space-y-2">
                        {earnings_data.map((company, companyIndex) => {
                          const isExpanded = expandedCompanies.has(company.ticker);
                          return (
                            <div
                              key={company.ticker}
                              className="rounded-lg border border-border/40 overflow-hidden"
                            >
                              <button
                                onClick={() => toggleCompanyExpansion(company.ticker)}
                                className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-muted/20 transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-1.5 h-1.5 rounded-full"
                                    style={{ backgroundColor: getSeriesColor(companyIndex, isDark).line }}
                                  />
                                  <span className="text-xs font-medium">{company.companyName}</span>
                                  <span className="font-pixel text-[9px] text-muted-foreground/50 uppercase tracking-wider">{company.ticker}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-muted-foreground tabular-nums">{company.earnings.length}</span>
                                  {isExpanded ? (
                                    <ChevronUp className="size-3.5 text-muted-foreground/60" strokeWidth={2} />
                                  ) : (
                                    <ChevronDown className="size-3.5 text-muted-foreground/60" strokeWidth={2} />
                                  )}
                                </div>
                              </button>

                              {isExpanded ? (
                                <div className="border-t border-border/30">
                                  <div
                                    className="divide-y divide-border/20 max-h-72 overflow-y-auto"
                                    style={{ contentVisibility: 'auto', containIntrinsicSize: '0 288px' }}
                                  >
                                    {company.earnings.map((earning, index) => {
                                      const isPositiveSurprise = (earning.surprise_prc || 0) > 0;
                                      const hasEstimate = earning.eps_estimate !== null;

                                      return (
                                        <div
                                          key={`${earning.date}-${index}`}
                                          className="flex items-center justify-between px-3.5 py-2 hover:bg-muted/10 transition-colors"
                                        >
                                          <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <span className="text-[11px] text-muted-foreground tabular-nums min-w-fit">
                                              {new Date(earning.date).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: '2-digit',
                                              })}
                                            </span>
                                            <span className="text-[9px] text-muted-foreground/50 uppercase">{earning.time}</span>
                                            <div className="flex items-center gap-2 text-[11px]">
                                              <span className="text-muted-foreground/60">Act</span>
                                              <span className="font-semibold text-foreground tabular-nums">
                                                ${earning.eps_actual?.toFixed(2) || 'N/A'}
                                              </span>
                                              {hasEstimate ? (
                                                <>
                                                  <span className="text-muted-foreground/40">/</span>
                                                  <span className="text-muted-foreground/60">Est</span>
                                                  <span className="font-medium text-foreground/80 tabular-nums">
                                                    ${earning.eps_estimate?.toFixed(2) || 'N/A'}
                                                  </span>
                                                </>
                                              ) : null}
                                            </div>
                                          </div>

                                          {hasEstimate && earning.surprise_prc !== null ? (
                                            <span
                                              className={cn(
                                                'text-[10px] font-semibold tabular-nums flex items-center gap-0.5',
                                                isPositiveSurprise
                                                  ? 'text-emerald-600 dark:text-emerald-400'
                                                  : 'text-red-600 dark:text-red-400',
                                              )}
                                            >
                                              {isPositiveSurprise ? (
                                                <TrendingUp className="size-2.5" strokeWidth={2.5} />
                                              ) : (
                                                <TrendingDown className="size-2.5" strokeWidth={2.5} />
                                              )}
                                              {Math.abs(earning.surprise_prc || 0).toFixed(1)}%
                                            </span>
                                          ) : null}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {/* SEC Filings Section */}
                {sec_filings && sec_filings.length > 0 ? (
                  <div className="pt-4 border-t border-border/30">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="size-3.5 text-muted-foreground" strokeWidth={2} />
                      <span className="font-pixel text-[10px] text-muted-foreground/50 uppercase tracking-wider">SEC Filings</span>
                    </div>

                    <div className="space-y-2">
                      {Object.entries(
                        sec_filings?.reduce(
                          (acc, filing) => {
                            const company = filing.metadata?.name || filing.requestedCompany;
                            if (!acc[company]) acc[company] = [];
                            acc[company].push(filing);
                            return acc;
                          },
                          {} as Record<string, typeof sec_filings>,
                        ) || {},
                      ).map(([companyName, companyFilings]) => {
                        const isExpanded = !expandedCompanies.has(`sec-${companyName}`);
                        return (
                          <div
                            key={companyName}
                            className="rounded-lg border border-border/40 overflow-hidden"
                          >
                            <button
                              onClick={() => toggleCompanyExpansion(`sec-${companyName}`)}
                              className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-muted/20 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <Building2 className="size-3.5 text-muted-foreground" strokeWidth={2} />
                                <span className="text-xs font-medium">{companyName}</span>
                                <span className="text-[10px] text-muted-foreground tabular-nums">{companyFilings?.length || 0}</span>
                              </div>
                              {isExpanded ? (
                                <ChevronUp className="size-3.5 text-muted-foreground/60" strokeWidth={2} />
                              ) : (
                                <ChevronDown className="size-3.5 text-muted-foreground/60" strokeWidth={2} />
                              )}
                            </button>

                            {isExpanded ? (
                              <div className="border-t border-border/30">
                                <div
                                  className="divide-y divide-border/20 max-h-72 overflow-y-auto"
                                  style={{ contentVisibility: 'auto', containIntrinsicSize: '0 288px' }}
                                >
                                  {companyFilings?.map((filing, filingIndex) => (
                                    <Dialog key={`${filing.id}-${filingIndex}`}>
                                      <DialogTrigger asChild>
                                        <button className="w-full px-3.5 py-2.5 flex items-center justify-between hover:bg-muted/10 transition-colors text-left group">
                                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                            <span
                                              className={cn(
                                                'font-pixel text-[9px] uppercase tracking-wider shrink-0 px-1.5 py-0.5 rounded',
                                                (filing.metadata?.document_type === '10-K' ||
                                                  filing.metadata?.form_type === '10-K') &&
                                                'bg-blue-500/10 text-blue-600 dark:text-blue-400',
                                                (filing.metadata?.document_type === '10-Q' ||
                                                  filing.metadata?.form_type === '10-Q') &&
                                                'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                                                (filing.metadata?.document_type === '8-K' ||
                                                  filing.metadata?.form_type === '8-K') &&
                                                'bg-orange-500/10 text-orange-600 dark:text-orange-400',
                                                !(filing.metadata?.document_type === '10-K' || filing.metadata?.form_type === '10-K' ||
                                                  filing.metadata?.document_type === '10-Q' || filing.metadata?.form_type === '10-Q' ||
                                                  filing.metadata?.document_type === '8-K' || filing.metadata?.form_type === '8-K') &&
                                                'bg-muted/50 text-muted-foreground',
                                              )}
                                            >
                                              {filing.metadata?.document_type ||
                                                filing.metadata?.form_type ||
                                                filing.requestedFilingType}
                                            </span>
                                            <span className="text-xs font-medium truncate group-hover:text-primary transition-colors">
                                              {filing.title}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2 shrink-0">
                                            {getFilingDate(filing.metadata) && (
                                              <span className="text-[10px] text-muted-foreground/60 tabular-nums">
                                                {parseSecFilingDate(
                                                  getFilingDate(filing.metadata)!,
                                                ).toLocaleDateString('en-US', {
                                                  month: 'short',
                                                  day: 'numeric',
                                                  year: '2-digit',
                                                })}
                                              </span>
                                            )}
                                            <ArrowUpRight className="size-3 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                                          </div>
                                        </button>
                                      </DialogTrigger>

                                      <DialogContent className="w-[70vw] overflow-hidden max-w-none!">
                                        <DialogHeader>
                                          <DialogTitle className="flex items-center gap-3">
                                            <FileText className="size-5" />
                                            <span>{filing.title}</span>
                                          </DialogTitle>
                                        </DialogHeader>

                                        <div className="flex items-center gap-3 text-sm text-muted-foreground pb-3 border-b border-border/40">
                                          {(filing.metadata?.document_type || filing.metadata?.form_type) && (
                                            <span
                                              className={cn(
                                                'font-pixel text-[10px] uppercase tracking-wider px-2 py-0.5 rounded',
                                                (filing.metadata?.document_type === '10-K' || filing.metadata?.form_type === '10-K') && 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
                                                (filing.metadata?.document_type === '10-Q' || filing.metadata?.form_type === '10-Q') && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                                                (filing.metadata?.document_type === '8-K' || filing.metadata?.form_type === '8-K') && 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
                                              )}
                                            >
                                              {filing.metadata?.document_type || filing.metadata?.form_type}
                                            </span>
                                          )}
                                          {getFilingDate(filing.metadata) && (
                                            <span className="text-xs">
                                              Filed:{' '}
                                              {parseSecFilingDate(getFilingDate(filing.metadata)!).toLocaleDateString(
                                                'en-US',
                                                { month: 'long', day: 'numeric', year: 'numeric' },
                                              )}
                                            </span>
                                          )}
                                          {filing.metadata?.accession_number && (
                                            <span className="text-[10px] text-muted-foreground/60">{filing.metadata.accession_number}</span>
                                          )}
                                        </div>

                                        <ScrollArea className="h-[calc(90vh-200px)] w-full">
                                          <div className="w-full p-4 overflow-x-auto">
                                            <div
                                              className="prose prose-sm dark:prose-invert max-w-none! w-full
                                               prose-table:min-w-full prose-table:w-auto prose-table:table prose-table:whitespace-nowrap
                                               prose-pre:overflow-x-auto prose-pre:whitespace-pre-wrap prose-pre:break-all
                                               prose-p:wrap-break-word prose-h1:wrap-break-word prose-h2:wrap-break-word prose-h3:wrap-break-word
                                               prose-h4:wrap-break-word prose-h5:wrap-break-word prose-h6:wrap-break-word
                                               [&_table]:min-w-full [&_table]:w-auto [&_table]:table [&_table]:border-collapse
                                               [&_td]:px-2 [&_td]:py-1 [&_td]:border [&_td]:border-border/30
                                               [&_th]:px-2 [&_th]:py-1 [&_th]:border [&_th]:border-border/30 [&_th]:bg-muted/30"
                                            >
                                              <MarkdownRenderer content={filing.content} />
                                            </div>
                                          </div>
                                        </ScrollArea>
                                      </DialogContent>
                                    </Dialog>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {/* Company Statistics Section */}
                {company_statistics && Object.keys(company_statistics).length > 0 ? (
                  <div className="pt-4 border-t border-border/30">
                    <div className="flex items-center gap-2 mb-3">
                      <Activity className="size-3.5 text-muted-foreground" />
                      <span className="font-pixel text-[10px] text-muted-foreground/50 uppercase tracking-wider">Key Metrics</span>
                    </div>
                    <div className="space-y-2">
                      {Object.entries(company_statistics).map(([company, stats]: [string, any]) => (
                        <div key={company} className="rounded-lg border border-border/40 overflow-hidden">
                          <div className="px-3 py-2 border-b border-border/30 bg-muted/20 flex items-center gap-2">
                            <Building2 className="size-3.5 text-muted-foreground" />
                            <span className="text-xs font-medium">{company}</span>
                          </div>
                          <div className="divide-y divide-border/20">
                            {[
                              { label: 'Market Cap', value: stats.valuations_metrics?.market_capitalization ? `$${(stats.valuations_metrics.market_capitalization / 1e9).toFixed(2)}B` : 'N/A' },
                              { label: 'P/E', value: stats.valuations_metrics?.trailing_pe?.toFixed(2) || 'N/A' },
                              { label: 'P/B', value: stats.valuations_metrics?.price_to_book_mrq?.toFixed(2) || 'N/A' },
                              { label: 'Revenue (TTM)', value: stats.financials?.income_statement?.revenue_ttm ? `$${(stats.financials.income_statement.revenue_ttm / 1e9).toFixed(2)}B` : 'N/A' },
                              { label: 'Profit Margin', value: stats.financials?.profit_margin ? `${(stats.financials.profit_margin * 100).toFixed(1)}%` : 'N/A' },
                              { label: 'ROE', value: stats.financials?.return_on_equity_ttm ? `${(stats.financials.return_on_equity_ttm * 100).toFixed(1)}%` : 'N/A' },
                              { label: '52W Range', value: stats.stock_price_summary?.fifty_two_week_low && stats.stock_price_summary?.fifty_two_week_high ? `$${stats.stock_price_summary.fifty_two_week_low} - $${stats.stock_price_summary.fifty_two_week_high}` : 'N/A' },
                              { label: 'Beta', value: stats.stock_price_summary?.beta?.toFixed(2) || 'N/A' },
                              { label: 'Div. Yield', value: stats.dividends_and_splits?.forward_annual_dividend_yield ? `${(stats.dividends_and_splits.forward_annual_dividend_yield * 100).toFixed(2)}%` : 'N/A' },
                            ].map(({ label, value }) => (
                              <div key={label} className="flex items-center justify-between px-3.5 py-2 hover:bg-muted/10 transition-colors">
                                <span className="text-[11px] text-muted-foreground">{label}</span>
                                <span className="text-[11px] font-semibold text-foreground tabular-nums">{value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* Financial Statements Section */}
                {(balance_sheets && Object.keys(balance_sheets).length > 0) ||
                  (income_statements && Object.keys(income_statements).length > 0) ||
                  (cash_flows && Object.keys(cash_flows).length > 0)
                  ? (() => {
                    const hasIncome = !!(income_statements && Object.keys(income_statements).length > 0);
                    const hasBalance = !!(balance_sheets && Object.keys(balance_sheets).length > 0);
                    const hasCash = !!(cash_flows && Object.keys(cash_flows).length > 0);

                    const availableTabs = [];
                    if (hasIncome) availableTabs.push('income');
                    if (hasBalance) availableTabs.push('balance');
                    if (hasCash) availableTabs.push('cash');

                    const defaultTab = availableTabs[0] || 'income';
                    const gridCols =
                      availableTabs.length === 1
                        ? 'grid-cols-1'
                        : availableTabs.length === 2
                          ? 'grid-cols-2'
                          : 'grid-cols-3';

                    const renderIncomeTable = (company: string, statements: any[]) => (
                      <div key={company} className="rounded-lg border border-border/40 overflow-hidden">
                        <div className="px-3 py-2 border-b border-border/30 bg-muted/20 flex items-center gap-2">
                          <Building2 className="size-3.5 text-muted-foreground" />
                          <span className="text-xs font-medium">{company}</span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-[11px]">
                            <thead>
                              <tr className="border-b border-border/30 bg-muted/10">
                                <th className="text-left py-2 px-3 text-muted-foreground/70 font-medium">Period</th>
                                <th className="text-right px-3 text-muted-foreground/70 font-medium">Revenue</th>
                                <th className="text-right px-3 text-muted-foreground/70 font-medium hidden sm:table-cell">Gross Profit</th>
                                <th className="text-right px-3 text-muted-foreground/70 font-medium hidden md:table-cell">Op. Income</th>
                                <th className="text-right px-3 text-muted-foreground/70 font-medium">Net Income</th>
                                <th className="text-right px-3 text-muted-foreground/70 font-medium">EPS</th>
                              </tr>
                            </thead>
                            <tbody>
                              {statements.slice(0, 5).map((stmt, idx) => (
                                <tr key={idx} className="border-b border-border/15 hover:bg-muted/10 transition-colors">
                                  <td className="py-2 px-3 text-muted-foreground tabular-nums">
                                    {new Date(stmt.fiscal_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                  </td>
                                  <td className="text-right px-3 font-semibold tabular-nums">${(stmt.sales / 1e9).toFixed(2)}B</td>
                                  <td className="text-right px-3 tabular-nums hidden sm:table-cell">${(stmt.gross_profit / 1e9).toFixed(2)}B</td>
                                  <td className="text-right px-3 tabular-nums hidden md:table-cell">${(stmt.operating_income / 1e9).toFixed(2)}B</td>
                                  <td className="text-right px-3 font-semibold tabular-nums">${(stmt.net_income / 1e9).toFixed(2)}B</td>
                                  <td className="text-right px-3 tabular-nums">${stmt.eps_diluted?.toFixed(2) || 'N/A'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );

                    const renderBalanceTable = (company: string, sheets: any[]) => (
                      <div key={company} className="rounded-lg border border-border/40 overflow-hidden">
                        <div className="px-3 py-2 border-b border-border/30 bg-muted/20 flex items-center gap-2">
                          <Building2 className="size-3.5 text-muted-foreground" />
                          <span className="text-xs font-medium">{company}</span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-[11px]">
                            <thead>
                              <tr className="border-b border-border/30 bg-muted/10">
                                <th className="text-left py-2 px-3 text-muted-foreground/70 font-medium">Period</th>
                                <th className="text-right px-3 text-muted-foreground/70 font-medium">Assets</th>
                                <th className="text-right px-3 text-muted-foreground/70 font-medium">Liabilities</th>
                                <th className="text-right px-3 text-muted-foreground/70 font-medium hidden sm:table-cell">Equity</th>
                                <th className="text-right px-3 text-muted-foreground/70 font-medium hidden md:table-cell">Cash</th>
                                <th className="text-right px-3 text-muted-foreground/70 font-medium">D/E</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sheets.slice(0, 5).map((sheet, idx) => (
                                <tr key={idx} className="border-b border-border/15 hover:bg-muted/10 transition-colors">
                                  <td className="py-2 px-3 text-muted-foreground tabular-nums">{sheet.year}</td>
                                  <td className="text-right px-3 font-semibold tabular-nums">${(sheet.assets.total_assets / 1e9).toFixed(2)}B</td>
                                  <td className="text-right px-3 tabular-nums">${(sheet.liabilities.total_liabilities / 1e9).toFixed(2)}B</td>
                                  <td className="text-right px-3 tabular-nums hidden sm:table-cell">${(sheet.shareholders_equity.total_shareholders_equity / 1e9).toFixed(2)}B</td>
                                  <td className="text-right px-3 tabular-nums hidden md:table-cell">${(sheet.assets.current_assets.cash_and_cash_equivalents / 1e9).toFixed(2)}B</td>
                                  <td className="text-right px-3 tabular-nums">{((sheet.liabilities.non_current_liabilities.long_term_debt / sheet.shareholders_equity.total_shareholders_equity) * 100).toFixed(1)}%</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );

                    const renderCashFlowTable = (company: string, flows: any[]) => (
                      <div key={company} className="rounded-lg border border-border/40 overflow-hidden">
                        <div className="px-3 py-2 border-b border-border/30 bg-muted/20 flex items-center gap-2">
                          <Building2 className="size-3.5 text-muted-foreground" />
                          <span className="text-xs font-medium">{company}</span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-[11px]">
                            <thead>
                              <tr className="border-b border-border/30 bg-muted/10">
                                <th className="text-left py-2 px-3 text-muted-foreground/70 font-medium">Period</th>
                                <th className="text-right px-3 text-muted-foreground/70 font-medium">Operating</th>
                                <th className="text-right px-3 text-muted-foreground/70 font-medium hidden sm:table-cell">Investing</th>
                                <th className="text-right px-3 text-muted-foreground/70 font-medium hidden md:table-cell">Financing</th>
                                <th className="text-right px-3 text-muted-foreground/70 font-medium">FCF</th>
                                <th className="text-right px-3 text-muted-foreground/70 font-medium">Cash End</th>
                              </tr>
                            </thead>
                            <tbody>
                              {flows.slice(0, 5).map((flow, idx) => (
                                <tr key={idx} className="border-b border-border/15 hover:bg-muted/10 transition-colors">
                                  <td className="py-2 px-3 text-muted-foreground tabular-nums">{flow.year}</td>
                                  <td className="text-right px-3 font-semibold tabular-nums">${(flow.operating_activities.operating_cash_flow / 1e9).toFixed(2)}B</td>
                                  <td className="text-right px-3 tabular-nums hidden sm:table-cell">${(flow.investing_activities.investing_cash_flow / 1e9).toFixed(2)}B</td>
                                  <td className="text-right px-3 tabular-nums hidden md:table-cell">${(flow.financing_activities.financing_cash_flow / 1e9).toFixed(2)}B</td>
                                  <td className="text-right px-3 font-semibold tabular-nums">${(flow.free_cash_flow / 1e9).toFixed(2)}B</td>
                                  <td className="text-right px-3 tabular-nums">${(flow.end_cash_position / 1e9).toFixed(2)}B</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );

                    return (
                      <div className="pt-4 border-t border-border/30">
                        <div className="flex items-center gap-2 mb-3">
                          <Wallet className="size-3.5 text-muted-foreground" />
                          <span className="font-pixel text-[10px] text-muted-foreground/50 uppercase tracking-wider">
                            {availableTabs.length === 1
                              ? hasIncome ? 'Income Statement' : hasBalance ? 'Balance Sheet' : 'Cash Flow'
                              : 'Financials'}
                          </span>
                        </div>

                        {availableTabs.length > 1 ? (
                          <Tabs defaultValue={defaultTab} className="w-full">
                            <TabsList className={`grid w-full ${gridCols} mb-3 h-8`}>
                              {hasIncome && <TabsTrigger value="income" className="text-[10px]">Income</TabsTrigger>}
                              {hasBalance && <TabsTrigger value="balance" className="text-[10px]">Balance</TabsTrigger>}
                              {hasCash && <TabsTrigger value="cash" className="text-[10px]">Cash Flow</TabsTrigger>}
                            </TabsList>

                            <TabsContent value="income" className="space-y-2">
                              {income_statements && Object.entries(income_statements).map(([company, statements]: [string, any[]]) => renderIncomeTable(company, statements))}
                            </TabsContent>
                            <TabsContent value="balance" className="space-y-2">
                              {balance_sheets && Object.entries(balance_sheets).map(([company, sheets]: [string, any[]]) => renderBalanceTable(company, sheets))}
                            </TabsContent>
                            <TabsContent value="cash" className="space-y-2">
                              {cash_flows && Object.entries(cash_flows).map(([company, flows]: [string, any[]]) => renderCashFlowTable(company, flows))}
                            </TabsContent>
                          </Tabs>
                        ) : (
                          <div className="space-y-2">
                            {hasIncome && income_statements && Object.entries(income_statements).map(([company, statements]: [string, any[]]) => renderIncomeTable(company, statements))}
                            {hasBalance && balance_sheets && Object.entries(balance_sheets).map(([company, sheets]: [string, any[]]) => renderBalanceTable(company, sheets))}
                            {hasCash && cash_flows && Object.entries(cash_flows).map(([company, flows]: [string, any[]]) => renderCashFlowTable(company, flows))}
                          </div>
                        )}
                      </div>
                    );
                  })()
                  : null}

                {/* Dividends */}
                {dividends_data &&
                  Object.keys(dividends_data).length > 0 &&
                  (() => {
                    const hasValidDividends = Object.values(dividends_data).some(
                      (dividends: any[]) => dividends.length > 0,
                    );
                    return hasValidDividends;
                  })() ? (
                  <div className="pt-4 border-t border-border/30">
                    <div className="flex items-center gap-2 mb-3">
                      <Banknote className="size-3.5 text-muted-foreground" />
                      <span className="font-pixel text-[10px] text-muted-foreground/50 uppercase tracking-wider">Dividends</span>
                    </div>
                    <div className="space-y-2">
                      {Object.entries(dividends_data).map(([company, dividends]: [string, any[]]) => {
                        const seenKeys = new Set<string>();
                        const uniqueDividends: any[] = [];
                        for (const current of dividends) {
                          const key = `${current.ex_date}-${current.amount}`;
                          if (!seenKeys.has(key)) {
                            seenKeys.add(key);
                            uniqueDividends.push(current);
                          }
                        }

                        if (uniqueDividends.length === 0) return null;

                        const sortedDividends = uniqueDividends.toSorted(
                          (a, b) => new Date(a.ex_date).getTime() - new Date(b.ex_date).getTime(),
                        );
                        const latestDividend = sortedDividends[sortedDividends.length - 1];
                        const yearAgo = sortedDividends[sortedDividends.length - 5] || sortedDividends[0];
                        const growthRate =
                          yearAgo && latestDividend
                            ? ((latestDividend.amount - yearAgo.amount) / yearAgo.amount) * 100
                            : 0;

                        const currentYear = new Date().getFullYear();
                        let annualDividend = 0;
                        for (const d of uniqueDividends) {
                          if (new Date(d.ex_date).getFullYear() === currentYear) {
                            annualDividend += d.amount;
                          }
                        }

                        const chartData = sortedDividends.slice(-20).map((d) => ({
                          date: new Date(d.ex_date).getTime(),
                          amount: d.amount,
                        }));

                        const divSubTextColor = isDark ? '#a1a1aa' : '#71717a';
                        const divGridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';
                        const divTooltipBg = isDark ? 'rgba(24, 24, 27, 0.95)' : 'rgba(255, 255, 255, 0.95)';
                        const divTooltipBorder = isDark ? 'rgba(63, 63, 70, 0.5)' : 'rgba(228, 228, 231, 0.8)';
                        const divTextColor = isDark ? '#fafafa' : '#18181b';
                        const divLineColor = isDark ? '#34d399' : '#059669';
                        const divAreaColorStart = isDark ? 'rgba(52, 211, 153, 0.25)' : 'rgba(5, 150, 105, 0.2)';

                        const dividendChartOptions: EChartsOption = {
                          grid: { left: 10, right: 10, top: 10, bottom: 20, containLabel: true },
                          xAxis: {
                            type: 'time',
                            axisLine: { show: false },
                            axisTick: { show: false },
                            axisLabel: { fontSize: 9, color: divSubTextColor, formatter: (value: any) => new Date(value).getFullYear().toString(), margin: 6 },
                            splitLine: { show: false },
                          },
                          yAxis: {
                            type: 'value',
                            axisLine: { show: false },
                            axisTick: { show: false },
                            axisLabel: { fontSize: 9, color: divSubTextColor, formatter: (value: number) => `$${value.toFixed(2)}` },
                            splitLine: { lineStyle: { color: divGridColor, type: 'dashed' as const } },
                          },
                          tooltip: {
                            trigger: 'axis',
                            backgroundColor: 'transparent',
                            borderWidth: 0,
                            padding: 0,
                            formatter: (params: any) => {
                              const point = params[0];
                              const formattedDate = new Date(point.value[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                              const shadowColor = isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.08)';
                              return `<div style="padding:8px 12px;border-radius:8px;font-family:system-ui;background:${divTooltipBg};backdrop-filter:blur(12px);box-shadow:0 4px 20px ${shadowColor},0 0 0 1px ${divTooltipBorder};"><div style="color:${divSubTextColor};font-size:9px;font-weight:500;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">${formattedDate}</div><div style="display:flex;align-items:center;justify-content:space-between;gap:12px;"><div style="display:flex;align-items:center;gap:6px;"><div style="width:6px;height:6px;border-radius:50%;background:${divLineColor};"></div><span style="color:${divSubTextColor};font-size:10px;">Dividend</span></div><span style="color:${divTextColor};font-weight:600;font-size:11px;font-variant-numeric:tabular-nums;">$${point.value[1].toFixed(2)}</span></div></div>`;
                            },
                          },
                          series: [{
                            type: 'line',
                            data: chartData.map((d) => [d.date, d.amount]),
                            lineStyle: { color: divLineColor, width: 2 },
                            itemStyle: { color: divLineColor },
                            areaStyle: {
                              color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: divAreaColorStart }, { offset: 1, color: 'rgba(0,0,0,0)' }] },
                            },
                            smooth: 0.4,
                            showSymbol: false,
                          }],
                        };

                        const isExpanded = expandedDividendCompanies.has(company);
                        return (
                          <div key={company} className="rounded-lg border border-border/40 overflow-hidden">
                            <button
                              onClick={() => toggleDividendExpansion(company)}
                              className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-muted/20 transition-colors"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-xs font-medium truncate">{company}</span>
                                <span className="text-[10px] text-muted-foreground/60 tabular-nums shrink-0">
                                  ${latestDividend?.amount.toFixed(2) || '0.00'}
                                </span>
                                <span className="text-[9px] text-muted-foreground/40 shrink-0">/</span>
                                <span className="text-[10px] text-muted-foreground/60 tabular-nums shrink-0">
                                  ${annualDividend.toFixed(2)}/yr
                                </span>
                                <span
                                  className={cn(
                                    'text-[10px] font-semibold tabular-nums shrink-0',
                                    growthRate >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
                                  )}
                                >
                                  {growthRate >= 0 ? '+' : ''}{growthRate.toFixed(1)}%
                                </span>
                              </div>
                              {isExpanded ? (
                                <ChevronUp className="size-3.5 text-muted-foreground/60 shrink-0" />
                              ) : (
                                <ChevronDown className="size-3.5 text-muted-foreground/60 shrink-0" />
                              )}
                            </button>
                            {isExpanded ? (
                              <div className="border-t border-border/30 p-3 space-y-2">
                                <div className="w-full h-40 rounded-md border border-border/30 p-1">
                                  <ReactECharts option={dividendChartOptions} style={{ height: '100%', width: '100%' }} />
                                </div>
                                <div className="divide-y divide-border/20 max-h-36 overflow-y-auto rounded-md border border-border/30">
                                  {sortedDividends.slice(-10).reverse().map((div, idx) => (
                                    <div key={idx} className="flex items-center justify-between px-3 py-1.5 hover:bg-muted/10 transition-colors">
                                      <span className="text-[11px] text-muted-foreground tabular-nums">
                                        {new Date(div.ex_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                                      </span>
                                      <span className="text-[11px] font-semibold tabular-nums">${div.amount.toFixed(2)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {/* Insider Transactions */}
                {insider_transactions && Object.keys(insider_transactions).length > 0 ? (
                  <div className="pt-4 border-t border-border/30">
                    <div className="flex items-center gap-2 mb-3">
                      <UserCheck className="size-3.5 text-muted-foreground" />
                      <span className="font-pixel text-[10px] text-muted-foreground/50 uppercase tracking-wider">Insider Transactions</span>
                    </div>
                    <div className="space-y-2">
                      {Object.entries(insider_transactions).map(([company, transactions]: [string, any[]]) => (
                        <div key={company} className="rounded-lg border border-border/40 overflow-hidden">
                          <div className="px-3 py-2 border-b border-border/30 bg-muted/20 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Building2 className="size-3.5 text-muted-foreground" />
                              <span className="text-xs font-medium">{company}</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground tabular-nums">{transactions.length}</span>
                          </div>
                          <div
                            className="divide-y divide-border/20 max-h-56 overflow-y-auto"
                            style={{ contentVisibility: 'auto', containIntrinsicSize: '0 224px' }}
                          >
                            {transactions.map((trans, idx) => {
                              const isBuy =
                                trans.description.toLowerCase().includes('purchase') ||
                                trans.description.toLowerCase().includes('stock award') ||
                                trans.description.toLowerCase().includes('conversion');
                              const transType = trans.description.toLowerCase().includes('sale')
                                ? 'Sale'
                                : trans.description.toLowerCase().includes('purchase')
                                  ? 'Buy'
                                  : trans.description.toLowerCase().includes('stock award')
                                    ? 'Grant'
                                    : trans.description.toLowerCase().includes('conversion')
                                      ? 'Exercise'
                                      : trans.description.toLowerCase().includes('gift')
                                        ? 'Gift'
                                        : 'Other';

                              const priceMatch = trans.description.match(/price (\d+\.?\d*)/);
                              const price = priceMatch ? parseFloat(priceMatch[1]) : null;

                              return (
                                <div key={idx} className="flex items-center justify-between px-3.5 py-2 hover:bg-muted/10 transition-colors">
                                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[11px] font-medium text-foreground truncate max-w-[140px]">{trans.full_name}</span>
                                        <span
                                          className={cn(
                                            'font-pixel text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0',
                                            isBuy ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-muted/50 text-muted-foreground',
                                          )}
                                        >
                                          {transType}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
                                        <span className="truncate max-w-[120px]">{trans.position}</span>
                                        <span className="tabular-nums">{trans.shares.toLocaleString()} shr</span>
                                        {price && price > 0 && <span className="tabular-nums">@ ${price.toFixed(2)}</span>}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-right shrink-0 flex flex-col items-end gap-0.5">
                                    <span className="text-[11px] font-semibold tabular-nums">
                                      {trans.value > 0 ? `$${(trans.value / 1e6).toFixed(2)}M` : 'Grant'}
                                    </span>
                                    <span className="text-[9px] text-muted-foreground/50 tabular-nums">
                                      {new Date(trans.date_reported).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* News Results Section */}
                {news_results &&
                  news_results.some((group) => group.topic !== 'financial' && group.results.length > 0) ? (
                  <div className="pt-4 border-t border-border/30">
                    <div className="flex items-center gap-2 mb-3">
                      <Newspaper className="size-3.5 text-muted-foreground" />
                      <span className="font-pixel text-[10px] text-muted-foreground/50 uppercase tracking-wider">Related News</span>
                    </div>

                    <div className="flex overflow-x-auto gap-2 no-scrollbar pb-1 snap-x snap-mandatory">
                      {news_results
                        .filter((group) => group.topic !== 'financial')
                        .flatMap((group, groupIndex) =>
                          group.results.slice(0, 8).map((news, newsIndex) => (
                            <a
                              key={`${groupIndex}-${newsIndex}`}
                              href={news.url}
                              target="_blank"
                              className="min-w-56 max-w-64 sm:w-56 shrink-0 rounded-lg border border-border/40 hover:border-border/60 transition-colors snap-start overflow-hidden group"
                            >
                              <div className="p-2.5">
                                <h4 className="text-[11px] font-medium line-clamp-2 group-hover:text-primary transition-colors leading-snug">{news.title}</h4>
                                <p className="text-[10px] text-muted-foreground/70 line-clamp-2 mt-1 leading-relaxed">{news.content}</p>
                              </div>
                              <div className="px-2.5 py-1.5 border-t border-border/20 flex items-center justify-between bg-muted/10">
                                <div className="flex items-center gap-1.5">
                                  <div className="relative w-3 h-3 rounded-sm overflow-hidden">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
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
                                  <span className="text-[9px] text-muted-foreground/60 truncate max-w-[80px]">
                                    {new URL(news.url).hostname.replace('www.', '')}
                                  </span>
                                </div>
                                {news.published_date && (
                                  <time className="text-[9px] text-muted-foreground/50 tabular-nums">
                                    {new Date(news.published_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                  </time>
                                )}
                              </div>
                            </a>
                          )),
                        )}
                    </div>
                  </div>
                ) : null}

                {/* Financial Reports */}
                {news_results &&
                  news_results.some((group) => group.topic === 'financial' && group.results.length > 0) ? (
                  <div className="pt-4 border-t border-border/30">
                    <div className="flex items-center gap-2 mb-3">
                      <ChartBarIcon className="size-3.5 text-muted-foreground" />
                      <span className="font-pixel text-[10px] text-muted-foreground/50 uppercase tracking-wider">Financial Reports</span>
                    </div>

                    <div className="flex overflow-x-auto gap-2 no-scrollbar pb-1 snap-x snap-mandatory">
                      {news_results
                        .filter((group) => group.topic === 'financial')
                        .flatMap((group, groupIndex) =>
                          group.results.slice(0, 8).map((news, newsIndex) => (
                            <a
                              key={`financial-${groupIndex}-${newsIndex}`}
                              href={news.url}
                              target="_blank"
                              className="min-w-56 max-w-64 sm:w-56 shrink-0 rounded-lg border border-border/40 hover:border-border/60 transition-colors snap-start overflow-hidden group"
                            >
                              <div className="p-2.5">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <span className="font-pixel text-[8px] text-amber-600 dark:text-amber-400 uppercase tracking-wider bg-amber-500/10 px-1.5 py-0.5 rounded">Financial</span>
                                </div>
                                <h4 className="text-[11px] font-medium line-clamp-2 group-hover:text-primary transition-colors leading-snug">{news.title}</h4>
                                <p className="text-[10px] text-muted-foreground/70 line-clamp-2 mt-1 leading-relaxed">{news.content}</p>
                              </div>
                              <div className="px-2.5 py-1.5 border-t border-border/20 flex items-center justify-between bg-muted/10">
                                <div className="flex items-center gap-1.5">
                                  <div className="relative w-3 h-3 rounded-sm overflow-hidden">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
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
                                  <span className="text-[9px] text-muted-foreground/60 truncate max-w-[80px]">
                                    {new URL(news.url).hostname.replace('www.', '')}
                                  </span>
                                </div>
                                {news.published_date ? (
                                  <time className="text-[9px] text-muted-foreground/50 tabular-nums">
                                    {new Date(news.published_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                  </time>
                                ) : null}
                              </div>
                            </a>
                          )),
                        )}
                    </div>
                  </div>
                ) : null}

                {/* Market Movers Section */}
                {market_movers ? (
                  <div className="pt-4 border-t border-border/30">
                    <div className="flex items-center gap-2 mb-3">
                      <Activity className="size-3.5 text-muted-foreground" />
                      <span className="font-pixel text-[10px] text-muted-foreground/50 uppercase tracking-wider">Market Movers</span>
                    </div>

                    <Tabs defaultValue="gainers" className="w-full">
                      <TabsList className="grid w-full grid-cols-3 mb-3 h-8">
                        <TabsTrigger value="gainers" className="text-[10px]">Gainers</TabsTrigger>
                        <TabsTrigger value="losers" className="text-[10px]">Losers</TabsTrigger>
                        <TabsTrigger value="active" className="text-[10px]">Active</TabsTrigger>
                      </TabsList>

                      {(['gainers', 'losers', 'active'] as const).map((tab) => {
                        const items = tab === 'gainers' ? market_movers.gainers : tab === 'losers' ? market_movers.losers : market_movers.most_active;
                        return (
                          <TabsContent key={tab} value={tab}>
                            <div className="rounded-lg border border-border/40 divide-y divide-border/20 overflow-hidden">
                              {items.map((stock, idx) => (
                                <div key={idx} className="flex items-center justify-between px-3.5 py-2 hover:bg-muted/10 transition-colors">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <span className="text-[11px] font-semibold text-foreground tabular-nums min-w-[48px]">{stock.symbol}</span>
                                    <span className="text-[10px] text-muted-foreground/60 truncate max-w-[160px]">{stock.name}</span>
                                  </div>
                                  <div className="flex items-center gap-3 shrink-0">
                                    {tab === 'active' && (
                                      <span className="text-[9px] text-muted-foreground/50 tabular-nums">{(stock.volume / 1e6).toFixed(1)}M</span>
                                    )}
                                    <span className="text-[11px] font-semibold tabular-nums">${stock.last.toFixed(2)}</span>
                                    <span
                                      className={cn(
                                        'text-[10px] font-semibold tabular-nums flex items-center gap-0.5 min-w-[56px] justify-end',
                                        stock.percent_change >= 0
                                          ? 'text-emerald-600 dark:text-emerald-400'
                                          : 'text-red-600 dark:text-red-400',
                                      )}
                                    >
                                      {stock.percent_change >= 0 ? <TrendingUp className="size-2.5" /> : <TrendingDown className="size-2.5" />}
                                      {stock.percent_change >= 0 ? '+' : ''}{stock.percent_change.toFixed(2)}%
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </TabsContent>
                        );
                      })}
                    </Tabs>
                  </div>
                ) : null}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    );
  },
);

InteractiveStockChart.displayName = 'InteractiveStockChart';

export default InteractiveStockChart;
