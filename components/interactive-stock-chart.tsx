import React, { useMemo, useCallback, useEffect, useState } from 'react';
import ReactECharts, { EChartsOption } from 'echarts-for-react';
import { Badge } from '@/components/ui/badge';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import {
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
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
  DollarSign,
  Activity,
  Wallet,
  Banknote,
  UserCheck,
  TrendingUp as TrendingUpIcon,
  Percent,
  LineChart,
} from 'lucide-react';
import { ChartBar } from '@phosphor-icons/react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { HugeiconsIcon } from '@hugeicons/react';
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
    const [lastUpdated, setLastUpdated] = useState<string>('');
    const [isMobile, setIsMobile] = useState<boolean>(false);
    const [earningsViewMode, setEarningsViewMode] = useState<'reports' | 'chart'>('reports');
    const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());
    const [expandedDividendCompanies, setExpandedDividendCompanies] = useState<Set<string>>(new Set());

    // Toggle company expansion
    const toggleCompanyExpansion = useCallback((ticker: string) => {
      setExpandedCompanies((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(ticker)) {
          newSet.delete(ticker);
        } else {
          newSet.add(ticker);
        }
        return newSet;
      });
    }, []);

    // Toggle dividends company expansion
    const toggleDividendExpansion = useCallback((company: string) => {
      setExpandedDividendCompanies((prev) => {
        const next = new Set(prev);
        if (next.has(company)) {
          next.delete(company);
        } else {
          next.add(company);
        }
        return next;
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
        const seriesColor = getSeriesColor(index);

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
    }, [chart.elements, stock_symbols, currency_symbols, resolved_companies]);

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

    // Process earnings data for individual chart visualization per company
    const createEarningsChartForCompany = useCallback(
      (company: any, companyIndex: number) => {
        const textColor = isDark ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.85)';
        const subTextColor = isDark ? 'rgba(255, 255, 255, 0.45)' : 'rgba(0, 0, 0, 0.45)';
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
        const color = getSeriesColor(companyIndex);

        // Sort earnings by date for proper timeline
        const sortedEarnings = [...company.earnings].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        );

        const actualData = sortedEarnings.map((earning) => [new Date(earning.date).getTime(), earning.eps_actual]);
        const estimateData = sortedEarnings
          .filter((earning) => earning.eps_estimate !== null)
          .map((earning) => [new Date(earning.date).getTime(), earning.eps_estimate]);

        const series = [
          {
            name: 'Actual',
            type: 'line' as const,
            data: actualData,
            lineStyle: { color: color.line, width: 1 },
            itemStyle: { color: color.line },
            showSymbol: false,
            smooth: true,
            emphasis: { focus: 'series' },
            areaStyle: {
              color: color.area,
              opacity: 0.3,
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
                    width: 1,
                    type: 'dashed' as const,
                    opacity: 0.7,
                  },
                  itemStyle: { color: color.line, opacity: 0.7 },
                  showSymbol: false,
                  smooth: true,
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
            borderRadius: 999,
            padding: 0,
            formatter: (params: any) => {
              if (!Array.isArray(params) || params.length === 0) return '';

              const date = new Date(params[0].value[0]);
              const day = date.getDate().toString().padStart(2, '0');
              const month = date.toLocaleDateString('en-US', { month: 'short' });
              const year = date.getFullYear().toString().slice(-2);
              const formattedDate = `${day}/${month}/${year}`;

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

              params.forEach((param: any, index: number) => {
                const value = param.value[1];
                const lineColor = param.color;
                const isEstimate = param.seriesName === 'Estimate';

                tooltipHtml += `
                ${index > 0 ? '<span style="color: rgba(127, 127, 127, 0.5); margin: 0 -2px;">|</span>' : ''}
                <div style="
                  width: 6px;
                  height: 6px;
                  border-radius: 50%;
                  background-color: ${lineColor};
                  ${isEstimate ? 'opacity: 0.8;' : ''}
                "></div>
                <span style="
                  color: ${isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)'};
                  font-weight: ${index === 0 ? '600' : '400'};
                  font-size: ${index === 0 ? '11px' : '10px'};
                ">$${value.toFixed(2)}</span>
              `;
              });

              tooltipHtml += '</div>';
              return tooltipHtml;
            },
            axisPointer: {
              type: 'line',
              lineStyle: {
                color: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)',
                width: 1,
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
            axisLine: { lineStyle: { color: gridColor } },
            axisTick: { show: false },
            axisLabel: {
              color: subTextColor,
              fontSize: 9,
              formatter: (value: number) => {
                const date = new Date(value);
                return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
              },
              margin: 6,
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
            splitLine: { lineStyle: { color: gridColor, width: 0.5 } },
          },
          series: series,
        };

        return option;
      },
      [isDark],
    );

    return (
      <div className="w-full rounded-lg border !border-primary/20 overflow-hidden shadow-none">
        <Accordion type="single" collapsible defaultValue="open">
          <AccordionItem value="open" className="border-0">
            <AccordionTrigger className="bg-card px-3 py-2 border-b border-border/40 no-underline hover:no-underline items-center">
              <div className="w-full flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <HugeiconsIcon icon={Chart03Icon} className="size-4" strokeWidth={1.5} />
                  <h2 className="text-sm font-medium text-foreground/90 truncate">Financial Stock Chart</h2>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-xs text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
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
                    <span className="truncate">Valyu • {lastUpdated}</span>
                  </div>
                  <div className="hidden sm:inline-flex text-xs text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full">
                    LATEST
                  </div>
                </div>
              </div>
            </AccordionTrigger>

            <AccordionContent className="p-0">
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

                {/* Earnings Results Section */}
                {earnings_data && earnings_data.length > 0 && (
                  <div className="mt-5 pt-4 border-t border-border/30">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1.5">
                        <Target className="size-3.5 text-primary/80" />
                        <h3 className="text-xs font-medium text-foreground/90">Earnings Reports</h3>
                      </div>

                      <div className="flex items-center gap-1 bg-muted/50 rounded-full p-0.5">
                        <button
                          onClick={() => setEarningsViewMode('reports')}
                          className={cn(
                            'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors',
                            earningsViewMode === 'reports'
                              ? 'bg-background text-foreground shadow-sm'
                              : 'text-muted-foreground hover:text-foreground',
                          )}
                        >
                          <List className="size-3" />
                          Reports
                        </button>
                        <button
                          onClick={() => setEarningsViewMode('chart')}
                          className={cn(
                            'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors',
                            earningsViewMode === 'chart'
                              ? 'bg-background text-foreground shadow-sm'
                              : 'text-muted-foreground hover:text-foreground',
                          )}
                        >
                          <BarChart3 className="size-3" />
                          Chart
                        </button>
                      </div>
                    </div>

                    {earningsViewMode === 'chart' && earnings_data && (
                      <>
                        {earnings_data.map((company, companyIndex) => (
                          <div key={company.ticker} className="bg-card/40 border border-border/30 rounded-lg p-4 mb-2">
                            {/* Company Header */}
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: getSeriesColor(companyIndex).line }}
                                ></div>
                                <span className="font-medium text-sm">{company.companyName}</span>
                                <Badge variant="outline" className="text-xs px-1.5 py-0">
                                  {company.ticker}
                                </Badge>
                              </div>
                              <Badge variant="secondary" className="text-xs">
                                {company.earnings.length} reports
                              </Badge>
                            </div>

                            {/* Individual Chart */}
                            <div className="w-full h-48 bg-card/20 rounded-lg p-1">
                              <ReactECharts
                                option={createEarningsChartForCompany(company, companyIndex)}
                                style={{ height: '100%', width: '100%' }}
                                theme={isDark ? 'dark' : undefined}
                                opts={{ renderer: 'canvas' }}
                              />
                            </div>
                          </div>
                        ))}
                      </>
                    )}

                    {earningsViewMode === 'reports' && earnings_data && (
                      <>
                        {earnings_data.map((company, companyIndex) => {
                          const isExpanded = expandedCompanies.has(company.ticker);
                          return (
                            <div
                              key={company.ticker}
                              className="bg-card/40 border border-border/30 rounded-lg overflow-hidden mb-2"
                            >
                              {/* Clickable Company Header */}
                              <button
                                onClick={() => toggleCompanyExpansion(company.ticker)}
                                className="w-full p-3 flex items-center justify-between hover:bg-muted/20 transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: getSeriesColor(companyIndex).line }}
                                  ></div>
                                  <span className="font-medium text-sm">{company.companyName}</span>
                                  <Badge variant="outline" className="text-xs px-1.5 py-0">
                                    {company.ticker}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="text-xs">
                                    {company.earnings.length} reports
                                  </Badge>
                                  {isExpanded ? (
                                    <ChevronUp className="size-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronDown className="size-4 text-muted-foreground" />
                                  )}
                                </div>
                              </button>

                              {/* Expandable Earnings Timeline */}
                              {isExpanded && (
                                <div className="px-3 pb-3">
                                  <div className="grid gap-2 max-h-80 overflow-y-auto pr-2">
                                    {company.earnings.map((earning, index) => {
                                      const isPositiveSurprise = (earning.surprise_prc || 0) > 0;
                                      const hasEstimate = earning.eps_estimate !== null;

                                      return (
                                        <div
                                          key={`${earning.date}-${index}`}
                                          className="flex items-center justify-between p-2 rounded bg-muted/30 hover:bg-muted/50 transition-colors"
                                        >
                                          <div className="flex items-center gap-3 min-w-0 flex-1">
                                            {/* Date */}
                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-fit">
                                              <Calendar className="size-3" />
                                              <span>
                                                {new Date(earning.date).toLocaleDateString('en-US', {
                                                  month: 'short',
                                                  day: 'numeric',
                                                  year: '2-digit',
                                                })}
                                              </span>
                                              <span className="text-xs opacity-70">{earning.time}</span>
                                            </div>

                                            {/* EPS Values */}
                                            <div className="flex items-center gap-2 min-w-0">
                                              <div className="text-xs">
                                                <span className="text-muted-foreground">Actual:</span>
                                                <span className="ml-1 font-medium">
                                                  ${earning.eps_actual?.toFixed(2) || 'N/A'}
                                                </span>
                                              </div>
                                              {hasEstimate && (
                                                <div className="text-xs">
                                                  <span className="text-muted-foreground">Est:</span>
                                                  <span className="ml-1">
                                                    ${earning.eps_estimate?.toFixed(2) || 'N/A'}
                                                  </span>
                                                </div>
                                              )}
                                            </div>
                                          </div>

                                          {/* Surprise */}
                                          {hasEstimate && earning.surprise_prc !== null && (
                                            <div
                                              className={cn(
                                                'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full',
                                                isPositiveSurprise
                                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                                                  : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
                                              )}
                                            >
                                              {isPositiveSurprise ? (
                                                <TrendingUp className="size-3" />
                                              ) : (
                                                <TrendingDown className="size-3" />
                                              )}
                                              <span>{Math.abs(earning.surprise_prc || 0).toFixed(1)}%</span>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                )}

                {/* SEC Filings Section */}
                {sec_filings && sec_filings.length > 0 && (
                  <div className="mt-5 pt-4 border-t border-border/30">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1.5">
                        <FileText className="size-3.5 text-primary/80" />
                        <h3 className="text-xs font-medium text-foreground/90">SEC Filings</h3>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {/* Group filings by company */}
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
                      ).map(([companyName, companyFilings], companyIndex) => {
                        const isExpanded = !expandedCompanies.has(`sec-${companyName}`); // Inverted logic - default open
                        return (
                          <div
                            key={companyName}
                            className="bg-card/40 border border-border/30 rounded-lg overflow-hidden"
                          >
                            {/* Clickable Company Header */}
                            <button
                              onClick={() => toggleCompanyExpansion(`sec-${companyName}`)}
                              className="w-full p-4 flex items-center justify-between hover:bg-muted/20 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <Building2 className="size-4 text-muted-foreground" />
                                <h4 className="font-medium text-sm">{companyName}</h4>
                                <Badge variant="secondary" className="text-xs">
                                  {companyFilings?.length || 0} filing{(companyFilings?.length || 0) > 1 ? 's' : ''}
                                </Badge>
                              </div>
                              {isExpanded ? (
                                <ChevronUp className="size-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="size-4 text-muted-foreground" />
                              )}
                            </button>

                            {/* Expandable Filings Grid */}
                            {isExpanded && (
                              <div className="px-4 pb-4">
                                <div className="grid gap-2 max-h-80 overflow-y-auto pr-2">
                                  {companyFilings?.map((filing, filingIndex) => (
                                    <Dialog key={`${filing.id}-${filingIndex}`}>
                                      <DialogTrigger asChild>
                                        <button className="w-full p-3 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors text-left group">
                                          <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-center gap-2 mb-1">
                                                <Badge
                                                  variant="outline"
                                                  className={cn(
                                                    'text-xs px-1.5 py-0',
                                                    (filing.metadata?.document_type === '10-K' ||
                                                      filing.metadata?.form_type === '10-K') &&
                                                      'border-blue-500/50 text-blue-600 dark:text-blue-400',
                                                    (filing.metadata?.document_type === '10-Q' ||
                                                      filing.metadata?.form_type === '10-Q') &&
                                                      'border-emerald-500/50 text-emerald-600 dark:text-emerald-400',
                                                    (filing.metadata?.document_type === '8-K' ||
                                                      filing.metadata?.form_type === '8-K') &&
                                                      'border-orange-500/50 text-orange-600 dark:text-orange-400',
                                                  )}
                                                >
                                                  {filing.metadata?.document_type ||
                                                    filing.metadata?.form_type ||
                                                    filing.requestedFilingType}
                                                </Badge>
                                                {getFilingDate(filing.metadata) && (
                                                  <span className="text-xs text-muted-foreground">
                                                    {parseSecFilingDate(
                                                      getFilingDate(filing.metadata)!,
                                                    ).toLocaleDateString('en-US', {
                                                      month: 'short',
                                                      day: 'numeric',
                                                      year: 'numeric',
                                                    })}
                                                  </span>
                                                )}
                                              </div>
                                              <h5 className="text-sm font-medium line-clamp-1 group-hover:text-primary transition-colors">
                                                {filing.title}
                                              </h5>
                                              {filing.metadata?.ticker && (
                                                <p className="text-xs text-muted-foreground mt-1">
                                                  Ticker: {filing.metadata.ticker}
                                                </p>
                                              )}
                                              {(filing.metadata?.part || filing.metadata?.item) && (
                                                <p className="text-xs text-muted-foreground mt-1">
                                                  {filing.metadata.part && `Part ${filing.metadata.part}`}
                                                  {filing.metadata.part && filing.metadata.item && ', '}
                                                  {filing.metadata.item && `Item ${filing.metadata.item}`}
                                                </p>
                                              )}
                                            </div>
                                            <ArrowUpRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
                                          </div>
                                        </button>
                                      </DialogTrigger>

                                      <DialogContent className="w-[70vw] overflow-hidden !max-w-none">
                                        <DialogHeader>
                                          <DialogTitle className="flex items-center gap-3">
                                            <FileText className="size-5" />
                                            <span>{filing.title}</span>
                                          </DialogTitle>
                                        </DialogHeader>

                                        <div className="flex items-center gap-4 text-sm text-muted-foreground pb-3 border-b">
                                          {(filing.metadata?.document_type || filing.metadata?.form_type) && (
                                            <Badge
                                              variant="outline"
                                              className={cn(
                                                'text-xs',
                                                (filing.metadata?.document_type === '10-K' ||
                                                  filing.metadata?.form_type === '10-K') &&
                                                  'border-blue-500/50 text-blue-600 dark:text-blue-400',
                                                (filing.metadata?.document_type === '10-Q' ||
                                                  filing.metadata?.form_type === '10-Q') &&
                                                  'border-emerald-500/50 text-emerald-600 dark:text-emerald-400',
                                                (filing.metadata?.document_type === '8-K' ||
                                                  filing.metadata?.form_type === '8-K') &&
                                                  'border-orange-500/50 text-orange-600 dark:text-orange-400',
                                              )}
                                            >
                                              {filing.metadata?.document_type || filing.metadata?.form_type}
                                            </Badge>
                                          )}
                                          {getFilingDate(filing.metadata) && (
                                            <span className="text-xs">
                                              Filed:{' '}
                                              {parseSecFilingDate(getFilingDate(filing.metadata)!).toLocaleDateString(
                                                'en-US',
                                                {
                                                  month: 'long',
                                                  day: 'numeric',
                                                  year: 'numeric',
                                                },
                                              )}
                                            </span>
                                          )}
                                          {filing.metadata?.accession_number && (
                                            <span className="text-xs">
                                              Accession: {filing.metadata.accession_number}
                                            </span>
                                          )}
                                          {(filing.metadata?.part || filing.metadata?.item) && (
                                            <span className="text-xs">
                                              {filing.metadata.part && `Part ${filing.metadata.part}`}
                                              {filing.metadata.part && filing.metadata.item && ', '}
                                              {filing.metadata.item && `Item ${filing.metadata.item}`}
                                            </span>
                                          )}
                                        </div>

                                        <ScrollArea className="h-[calc(90vh-200px)] w-full">
                                          <div className="w-full p-4 overflow-x-auto">
                                            <div
                                              className="prose prose-sm dark:prose-invert !max-w-none w-full
                                               prose-table:min-w-full prose-table:w-auto prose-table:table prose-table:whitespace-nowrap
                                               prose-pre:overflow-x-auto prose-pre:whitespace-pre-wrap prose-pre:break-all
                                               prose-p:break-words prose-h1:break-words prose-h2:break-words prose-h3:break-words
                                               prose-h4:break-words prose-h5:break-words prose-h6:break-words
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
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Company Statistics Section - simplified neutral cards */}
                {company_statistics && Object.keys(company_statistics).length > 0 && (
                  <div className="mt-5 pt-4 border-t border-border/30">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Activity className="size-3.5 text-muted-foreground" />
                      <h3 className="text-xs font-medium text-foreground/90">Key Metrics</h3>
                    </div>
                    <div className="space-y-2">
                      {Object.entries(company_statistics).map(([company, stats]: [string, any]) => (
                        <div key={company} className="bg-card/40 border border-border/30 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Building2 className="size-4 text-muted-foreground" />
                              <h4 className="font-medium text-sm">{company}</h4>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Market Cap</span>
                              <span className="font-medium">
                                ${(stats.valuations_metrics?.market_capitalization / 1e9).toFixed(2)}B
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">P/E</span>
                              <span className="font-medium">
                                {stats.valuations_metrics?.trailing_pe?.toFixed(2) || 'N/A'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">P/B</span>
                              <span className="font-medium">
                                {stats.valuations_metrics?.price_to_book_mrq?.toFixed(2) || 'N/A'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Revenue (TTM)</span>
                              <span className="font-medium">
                                ${(stats.financials?.income_statement?.revenue_ttm / 1e9).toFixed(2)}B
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Profit Margin</span>
                              <span className="font-medium">{(stats.financials?.profit_margin * 100).toFixed(1)}%</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">ROE</span>
                              <span className="font-medium">
                                {(stats.financials?.return_on_equity_ttm * 100).toFixed(1)}%
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">52W Range</span>
                              <span className="font-medium">
                                ${stats.stock_price_summary?.fifty_two_week_low} - $
                                {stats.stock_price_summary?.fifty_two_week_high}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Beta</span>
                              <span className="font-medium">
                                {stats.stock_price_summary?.beta?.toFixed(2) || 'N/A'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Div. Yield</span>
                              <span className="font-medium">
                                {stats.dividends_and_splits?.forward_annual_dividend_yield
                                  ? (stats.dividends_and_splits.forward_annual_dividend_yield * 100).toFixed(2) + '%'
                                  : 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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

                      return (
                        <div className="mt-5 pt-4 border-t border-border/30">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-1.5">
                              <Wallet className="size-3.5 text-primary/80" />
                              <h3 className="text-xs font-medium text-foreground/90">
                                {availableTabs.length === 1
                                  ? hasIncome
                                    ? 'Income Statement'
                                    : hasBalance
                                      ? 'Balance Sheet'
                                      : 'Cash Flow Statement'
                                  : 'Financial Statements'}
                              </h3>
                            </div>
                          </div>

                          {availableTabs.length > 1 ? (
                            <Tabs defaultValue={defaultTab} className="w-full">
                              <TabsList className={`grid w-full ${gridCols} mb-3`}>
                                {hasIncome && (
                                  <TabsTrigger value="income" className="text-xs">
                                    Income Statement
                                  </TabsTrigger>
                                )}
                                {hasBalance && (
                                  <TabsTrigger value="balance" className="text-xs">
                                    Balance Sheet
                                  </TabsTrigger>
                                )}
                                {hasCash && (
                                  <TabsTrigger value="cash" className="text-xs">
                                    Cash Flow
                                  </TabsTrigger>
                                )}
                              </TabsList>

                              {/* Income Statement Tab */}
                              <TabsContent value="income" className="space-y-3">
                                {income_statements &&
                                  Object.entries(income_statements).map(([company, statements]: [string, any[]]) => (
                                    <div key={company} className="bg-card/40 border border-border/30 rounded-lg p-4">
                                      <div className="flex items-center gap-2 mb-3">
                                        <Building2 className="size-4 text-muted-foreground" />
                                        <h4 className="font-medium text-sm">{company}</h4>
                                      </div>

                                      <div className="overflow-x-auto">
                                        <table className="w-full text-xs">
                                          <thead>
                                            <tr className="border-b border-border/30">
                                              <th className="text-left py-2 pr-2 text-muted-foreground font-medium">
                                                Period
                                              </th>
                                              <th className="text-right px-2 text-muted-foreground font-medium">
                                                Revenue
                                              </th>
                                              <th className="text-right px-2 text-muted-foreground font-medium">
                                                Gross Profit
                                              </th>
                                              <th className="text-right px-2 text-muted-foreground font-medium">
                                                Operating Income
                                              </th>
                                              <th className="text-right px-2 text-muted-foreground font-medium">
                                                Net Income
                                              </th>
                                              <th className="text-right pl-2 text-muted-foreground font-medium">EPS</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {statements.slice(0, 5).map((stmt, idx) => (
                                              <tr key={idx} className="border-b border-border/20">
                                                <td className="py-2 pr-2">
                                                  {new Date(stmt.fiscal_date).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    year: 'numeric',
                                                  })}
                                                </td>
                                                <td className="text-right px-2 font-medium">
                                                  ${(stmt.sales / 1e9).toFixed(2)}B
                                                </td>
                                                <td className="text-right px-2">
                                                  ${(stmt.gross_profit / 1e9).toFixed(2)}B
                                                </td>
                                                <td className="text-right px-2">
                                                  ${(stmt.operating_income / 1e9).toFixed(2)}B
                                                </td>
                                                <td className="text-right px-2 font-medium">
                                                  ${(stmt.net_income / 1e9).toFixed(2)}B
                                                </td>
                                                <td className="text-right pl-2">
                                                  ${stmt.eps_diluted?.toFixed(2) || 'N/A'}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  ))}
                              </TabsContent>

                              {/* Balance Sheet Tab */}
                              <TabsContent value="balance" className="space-y-3">
                                {balance_sheets &&
                                  Object.entries(balance_sheets).map(([company, sheets]: [string, any[]]) => (
                                    <div key={company} className="bg-card/40 border border-border/30 rounded-lg p-4">
                                      <div className="flex items-center gap-2 mb-3">
                                        <Building2 className="size-4 text-muted-foreground" />
                                        <h4 className="font-medium text-sm">{company}</h4>
                                      </div>

                                      <div className="overflow-x-auto">
                                        <table className="w-full text-xs">
                                          <thead>
                                            <tr className="border-b border-border/30">
                                              <th className="text-left py-2 pr-2 text-muted-foreground font-medium">
                                                Period
                                              </th>
                                              <th className="text-right px-2 text-muted-foreground font-medium">
                                                Total Assets
                                              </th>
                                              <th className="text-right px-2 text-muted-foreground font-medium">
                                                Total Liabilities
                                              </th>
                                              <th className="text-right px-2 text-muted-foreground font-medium">
                                                Shareholders Equity
                                              </th>
                                              <th className="text-right px-2 text-muted-foreground font-medium">
                                                Cash
                                              </th>
                                              <th className="text-right pl-2 text-muted-foreground font-medium">
                                                Debt/Equity
                                              </th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {sheets.slice(0, 5).map((sheet, idx) => (
                                              <tr key={idx} className="border-b border-border/20">
                                                <td className="py-2 pr-2">{sheet.year}</td>
                                                <td className="text-right px-2 font-medium">
                                                  ${(sheet.assets.total_assets / 1e9).toFixed(2)}B
                                                </td>
                                                <td className="text-right px-2">
                                                  ${(sheet.liabilities.total_liabilities / 1e9).toFixed(2)}B
                                                </td>
                                                <td className="text-right px-2">
                                                  $
                                                  {(sheet.shareholders_equity.total_shareholders_equity / 1e9).toFixed(
                                                    2,
                                                  )}
                                                  B
                                                </td>
                                                <td className="text-right px-2">
                                                  $
                                                  {(
                                                    sheet.assets.current_assets.cash_and_cash_equivalents / 1e9
                                                  ).toFixed(2)}
                                                  B
                                                </td>
                                                <td className="text-right pl-2">
                                                  {(
                                                    (sheet.liabilities.non_current_liabilities.long_term_debt /
                                                      sheet.shareholders_equity.total_shareholders_equity) *
                                                    100
                                                  ).toFixed(1)}
                                                  %
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  ))}
                              </TabsContent>

                              {/* Cash Flow Tab */}
                              <TabsContent value="cash" className="space-y-3">
                                {cash_flows &&
                                  Object.entries(cash_flows).map(([company, flows]: [string, any[]]) => (
                                    <div key={company} className="bg-card/40 border border-border/30 rounded-lg p-4">
                                      <div className="flex items-center gap-2 mb-3">
                                        <Building2 className="size-4 text-muted-foreground" />
                                        <h4 className="font-medium text-sm">{company}</h4>
                                      </div>

                                      <div className="overflow-x-auto">
                                        <table className="w-full text-xs">
                                          <thead>
                                            <tr className="border-b border-border/30">
                                              <th className="text-left py-2 pr-2 text-muted-foreground font-medium">
                                                Period
                                              </th>
                                              <th className="text-right px-2 text-muted-foreground font-medium">
                                                Operating CF
                                              </th>
                                              <th className="text-right px-2 text-muted-foreground font-medium">
                                                Investing CF
                                              </th>
                                              <th className="text-right px-2 text-muted-foreground font-medium">
                                                Financing CF
                                              </th>
                                              <th className="text-right px-2 text-muted-foreground font-medium">
                                                Free Cash Flow
                                              </th>
                                              <th className="text-right pl-2 text-muted-foreground font-medium">
                                                Cash End
                                              </th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {flows.slice(0, 5).map((flow, idx) => (
                                              <tr key={idx} className="border-b border-border/20">
                                                <td className="py-2 pr-2">{flow.year}</td>
                                                <td className="text-right px-2 font-medium">
                                                  ${(flow.operating_activities.operating_cash_flow / 1e9).toFixed(2)}B
                                                </td>
                                                <td className="text-right px-2">
                                                  ${(flow.investing_activities.investing_cash_flow / 1e9).toFixed(2)}B
                                                </td>
                                                <td className="text-right px-2">
                                                  ${(flow.financing_activities.financing_cash_flow / 1e9).toFixed(2)}B
                                                </td>
                                                <td className="text-right px-2 font-medium">
                                                  ${(flow.free_cash_flow / 1e9).toFixed(2)}B
                                                </td>
                                                <td className="text-right pl-2">
                                                  ${(flow.end_cash_position / 1e9).toFixed(2)}B
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  ))}
                              </TabsContent>
                            </Tabs>
                          ) : (
                            // Single statement - show directly without tabs
                            <div className="space-y-3">
                              {hasIncome &&
                                income_statements &&
                                Object.entries(income_statements).map(([company, statements]: [string, any[]]) => (
                                  <div key={company} className="bg-card/40 border border-border/30 rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                      <Building2 className="size-4 text-muted-foreground" />
                                      <h4 className="font-medium text-sm">{company}</h4>
                                    </div>

                                    <div className="overflow-x-auto">
                                      <table className="w-full text-xs">
                                        <thead>
                                          <tr className="border-b border-border/30">
                                            <th className="text-left py-2 pr-2 text-muted-foreground font-medium">
                                              Period
                                            </th>
                                            <th className="text-right px-2 text-muted-foreground font-medium">
                                              Revenue
                                            </th>
                                            <th className="text-right px-2 text-muted-foreground font-medium">
                                              Gross Profit
                                            </th>
                                            <th className="text-right px-2 text-muted-foreground font-medium">
                                              Operating Income
                                            </th>
                                            <th className="text-right px-2 text-muted-foreground font-medium">
                                              Net Income
                                            </th>
                                            <th className="text-right pl-2 text-muted-foreground font-medium">EPS</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {statements.slice(0, 5).map((stmt, idx) => (
                                            <tr key={idx} className="border-b border-border/20">
                                              <td className="py-2 pr-2">
                                                {new Date(stmt.fiscal_date).toLocaleDateString('en-US', {
                                                  month: 'short',
                                                  year: 'numeric',
                                                })}
                                              </td>
                                              <td className="text-right px-2 font-medium">
                                                ${(stmt.sales / 1e9).toFixed(2)}B
                                              </td>
                                              <td className="text-right px-2">
                                                ${(stmt.gross_profit / 1e9).toFixed(2)}B
                                              </td>
                                              <td className="text-right px-2">
                                                ${(stmt.operating_income / 1e9).toFixed(2)}B
                                              </td>
                                              <td className="text-right px-2 font-medium">
                                                ${(stmt.net_income / 1e9).toFixed(2)}B
                                              </td>
                                              <td className="text-right pl-2">
                                                ${stmt.eps_diluted?.toFixed(2) || 'N/A'}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                ))}

                              {hasBalance &&
                                balance_sheets &&
                                Object.entries(balance_sheets).map(([company, sheets]: [string, any[]]) => (
                                  <div key={company} className="bg-card/40 border border-border/30 rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                      <Building2 className="size-4 text-muted-foreground" />
                                      <h4 className="font-medium text-sm">{company}</h4>
                                    </div>

                                    <div className="overflow-x-auto">
                                      <table className="w-full text-xs">
                                        <thead>
                                          <tr className="border-b border-border/30">
                                            <th className="text-left py-2 pr-2 text-muted-foreground font-medium">
                                              Period
                                            </th>
                                            <th className="text-right px-2 text-muted-foreground font-medium">
                                              Total Assets
                                            </th>
                                            <th className="text-right px-2 text-muted-foreground font-medium">
                                              Total Liabilities
                                            </th>
                                            <th className="text-right px-2 text-muted-foreground font-medium">
                                              Shareholders Equity
                                            </th>
                                            <th className="text-right px-2 text-muted-foreground font-medium">Cash</th>
                                            <th className="text-right pl-2 text-muted-foreground font-medium">
                                              Debt/Equity
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {sheets.slice(0, 5).map((sheet, idx) => (
                                            <tr key={idx} className="border-b border-border/20">
                                              <td className="py-2 pr-2">{sheet.year}</td>
                                              <td className="text-right px-2 font-medium">
                                                ${(sheet.assets.total_assets / 1e9).toFixed(2)}B
                                              </td>
                                              <td className="text-right px-2">
                                                ${(sheet.liabilities.total_liabilities / 1e9).toFixed(2)}B
                                              </td>
                                              <td className="text-right px-2">
                                                $
                                                {(sheet.shareholders_equity.total_shareholders_equity / 1e9).toFixed(2)}
                                                B
                                              </td>
                                              <td className="text-right px-2">
                                                $
                                                {(sheet.assets.current_assets.cash_and_cash_equivalents / 1e9).toFixed(
                                                  2,
                                                )}
                                                B
                                              </td>
                                              <td className="text-right pl-2">
                                                {(
                                                  (sheet.liabilities.non_current_liabilities.long_term_debt /
                                                    sheet.shareholders_equity.total_shareholders_equity) *
                                                  100
                                                ).toFixed(1)}
                                                %
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                ))}

                              {hasCash &&
                                cash_flows &&
                                Object.entries(cash_flows).map(([company, flows]: [string, any[]]) => (
                                  <div key={company} className="bg-card/40 border border-border/30 rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                      <Building2 className="size-4 text-muted-foreground" />
                                      <h4 className="font-medium text-sm">{company}</h4>
                                    </div>

                                    <div className="overflow-x-auto">
                                      <table className="w-full text-xs">
                                        <thead>
                                          <tr className="border-b border-border/30">
                                            <th className="text-left py-2 pr-2 text-muted-foreground font-medium">
                                              Period
                                            </th>
                                            <th className="text-right px-2 text-muted-foreground font-medium">
                                              Operating CF
                                            </th>
                                            <th className="text-right px-2 text-muted-foreground font-medium">
                                              Investing CF
                                            </th>
                                            <th className="text-right px-2 text-muted-foreground font-medium">
                                              Financing CF
                                            </th>
                                            <th className="text-right px-2 text-muted-foreground font-medium">
                                              Free Cash Flow
                                            </th>
                                            <th className="text-right pl-2 text-muted-foreground font-medium">
                                              Cash End
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {flows.slice(0, 5).map((flow, idx) => (
                                            <tr key={idx} className="border-b border-border/20">
                                              <td className="py-2 pr-2">{flow.year}</td>
                                              <td className="text-right px-2 font-medium">
                                                ${(flow.operating_activities.operating_cash_flow / 1e9).toFixed(2)}B
                                              </td>
                                              <td className="text-right px-2">
                                                ${(flow.investing_activities.investing_cash_flow / 1e9).toFixed(2)}B
                                              </td>
                                              <td className="text-right px-2">
                                                ${(flow.financing_activities.financing_cash_flow / 1e9).toFixed(2)}B
                                              </td>
                                              <td className="text-right px-2 font-medium">
                                                ${(flow.free_cash_flow / 1e9).toFixed(2)}B
                                              </td>
                                              <td className="text-right pl-2">
                                                ${(flow.end_cash_position / 1e9).toFixed(2)}B
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      );
                    })()
                  : null}

                {/* Dividends - full width */}
                {dividends_data &&
                  Object.keys(dividends_data).length > 0 &&
                  (() => {
                    // Check if there are any valid dividends after deduplication
                    const hasValidDividends = Object.entries(dividends_data).some(
                      ([company, dividends]: [string, any[]]) => {
                        const uniqueDividends = dividends.reduce((acc: any[], current: any) => {
                          const key = `${current.ex_date}-${current.amount}`;
                          if (!acc.some((item: any) => `${item.ex_date}-${item.amount}` === key)) {
                            acc.push(current);
                          }
                          return acc;
                        }, [] as any[]);
                        return uniqueDividends.length > 0;
                      },
                    );

                    return hasValidDividends;
                  })() && (
                    <div className="mt-5 pt-4 border-t border-border/30">
                      <div className="grid grid-cols-1 gap-4">
                        <div className="col-span-full">
                          <div className="flex items-center gap-1.5 mb-2">
                            <Banknote className="size-3.5 text-muted-foreground" />
                            <h3 className="text-xs font-medium text-foreground/90">Dividends</h3>
                          </div>
                          <div className="space-y-2">
                            {Object.entries(dividends_data).map(([company, dividends]: [string, any[]]) => {
                              // Remove duplicates based on ex_date and amount
                              const uniqueDividends = dividends.reduce((acc: any[], current: any) => {
                                const key = `${current.ex_date}-${current.amount}`;
                                if (!acc.some((item: any) => `${item.ex_date}-${item.amount}` === key)) {
                                  acc.push(current);
                                }
                                return acc;
                              }, [] as any[]);

                              // Skip if no dividends after deduplication
                              if (uniqueDividends.length === 0) {
                                return null;
                              }

                              // Calculate dividend metrics
                              const sortedDividends = [...uniqueDividends].sort(
                                (a, b) => new Date(a.ex_date).getTime() - new Date(b.ex_date).getTime(),
                              );
                              const latestDividend = sortedDividends[sortedDividends.length - 1];
                              const yearAgo = sortedDividends[sortedDividends.length - 5] || sortedDividends[0];
                              const growthRate =
                                yearAgo && latestDividend
                                  ? ((latestDividend.amount - yearAgo.amount) / yearAgo.amount) * 100
                                  : 0;

                              // Annual dividend calculation
                              const currentYear = new Date().getFullYear();
                              const currentYearDividends = uniqueDividends.filter(
                                (d: any) => new Date(d.ex_date).getFullYear() === currentYear,
                              );
                              const annualDividend = currentYearDividends.reduce(
                                (sum: number, d: any) => sum + d.amount,
                                0,
                              );

                              // Prepare chart data (last 20 payments for better visualization)
                              const chartData = sortedDividends.slice(-20).map((d) => ({
                                date: new Date(d.ex_date).getTime(),
                                amount: d.amount,
                                year: new Date(d.ex_date).getFullYear(),
                              }));

                              const dividendChartOptions: EChartsOption = {
                                grid: { left: 10, right: 10, top: 10, bottom: 20, containLabel: true },
                                xAxis: {
                                  type: 'time',
                                  axisLine: { show: false },
                                  axisTick: { show: false },
                                  axisLabel: {
                                    fontSize: 10,
                                    color: isDark ? '#8a8a8a' : '#666',
                                    formatter: (value: any) => new Date(value).getFullYear().toString(),
                                    margin: 6,
                                  },
                                  splitLine: { show: false },
                                },
                                yAxis: {
                                  type: 'value',
                                  axisLine: { show: false },
                                  axisTick: { show: false },
                                  axisLabel: {
                                    fontSize: 10,
                                    color: isDark ? '#8a8a8a' : '#666',
                                    formatter: (value: number) => `$${value.toFixed(2)}`,
                                  },
                                  splitLine: {
                                    lineStyle: { color: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' },
                                  },
                                },
                                tooltip: {
                                  trigger: 'axis',
                                  backgroundColor: isDark ? 'rgba(32,32,36,0.85)' : 'rgba(255,255,255,0.9)',
                                  borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                                  textStyle: { color: isDark ? '#fff' : '#000', fontSize: 12 },
                                  formatter: (params: any) => {
                                    const point = params[0];
                                    return `
                                <div style="font-size: 12px;">
                                  <div style="font-weight: 600; margin-bottom: 4px;">${new Date(point.value[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                                  <div style="color: #10b981;">Dividend: $${point.value[1].toFixed(2)}</div>
                                </div>
                              `;
                                  },
                                },
                                series: [
                                  {
                                    type: 'line',
                                    data: chartData.map((d) => [d.date, d.amount]),
                                    lineStyle: { color: isDark ? '#22c55e' : '#16a34a', width: 1.5 },
                                    itemStyle: { color: isDark ? '#22c55e' : '#16a34a' },
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
                                            color: isDark ? 'rgba(34, 197, 94, 0.18)' : 'rgba(16, 163, 74, 0.18)',
                                          },
                                          { offset: 1, color: 'rgba(0,0,0,0)' },
                                        ],
                                      },
                                    },
                                    smooth: true,
                                    showSymbol: false,
                                  },
                                ],
                              };

                              const isExpanded = expandedDividendCompanies.has(company);
                              return (
                                <div key={company} className="bg-card/40 border border-border/30 rounded-lg">
                                  <button
                                    onClick={() => toggleDividendExpansion(company)}
                                    className="w-full p-3 flex items-center justify-between hover:bg-muted/20 transition-colors"
                                  >
                                    <div className="flex items-center gap-2">
                                      <Banknote className="size-3.5 text-muted-foreground" />
                                      <span className="font-medium text-sm">{company}</span>
                                      {latestDividend && (
                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                          Latest: ${latestDividend.amount.toFixed(2)}
                                        </Badge>
                                      )}
                                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                        Annual: ${annualDividend.toFixed(2)}
                                      </Badge>
                                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                        {growthRate >= 0 ? '+' : ''}
                                        {growthRate.toFixed(1)}%
                                      </Badge>
                                    </div>
                                    {isExpanded ? (
                                      <ChevronUp className="size-4 text-muted-foreground" />
                                    ) : (
                                      <ChevronDown className="size-4 text-muted-foreground" />
                                    )}
                                  </button>
                                  {isExpanded && (
                                    <div className="px-3 pb-3">
                                      <div className="w-full h-44 bg-card/20 rounded-md p-1">
                                        <ReactECharts
                                          option={dividendChartOptions}
                                          style={{ height: '100%', width: '100%' }}
                                        />
                                      </div>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 max-h-40 overflow-y-auto pr-1">
                                        {sortedDividends
                                          .slice(-10)
                                          .reverse()
                                          .map((div, idx) => (
                                            <div
                                              key={idx}
                                              className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/30"
                                            >
                                              <span className="text-xs text-muted-foreground">
                                                {new Date(div.ex_date).toLocaleDateString('en-US', {
                                                  month: 'short',
                                                  day: 'numeric',
                                                  year: 'numeric',
                                                })}
                                              </span>
                                              <span className="text-xs font-medium">${div.amount.toFixed(2)}</span>
                                            </div>
                                          ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                {/* Insider Transactions - full width showing all data */}
                {insider_transactions && Object.keys(insider_transactions).length > 0 && (
                  <div className="mt-5 pt-4 border-t border-border/30">
                    <div className="grid grid-cols-1 gap-4">
                      <div className="col-span-full">
                        <div className="flex items-center gap-1.5 mb-2">
                          <UserCheck className="size-3.5 text-muted-foreground" />
                          <h3 className="text-xs font-medium text-foreground/90">Insider Transactions</h3>
                        </div>
                        <div className="space-y-2">
                          {Object.entries(insider_transactions).map(([company, transactions]: [string, any[]]) => (
                            <div key={company} className="bg-card/40 border border-border/30 rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <Building2 className="size-4 text-muted-foreground" />
                                <h4 className="font-medium text-sm">{company}</h4>
                                <span className="text-xs text-muted-foreground">
                                  ({transactions.length} transactions)
                                </span>
                              </div>
                              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                {transactions.map((trans, idx) => {
                                  // Extract transaction type from description
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

                                  // Extract price from description if available
                                  const priceMatch = trans.description.match(/price (\d+\.?\d*)/);
                                  const price = priceMatch ? parseFloat(priceMatch[1]) : null;

                                  return (
                                    <div
                                      key={idx}
                                      className="flex items-start justify-between p-2 rounded-md bg-muted/30"
                                    >
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                          <h5 className="font-medium text-xs text-foreground truncate max-w-[200px]">
                                            {trans.full_name}
                                          </h5>
                                          <Badge
                                            variant={isBuy ? 'default' : 'secondary'}
                                            className="text-[10px] px-1.5 py-0"
                                          >
                                            {transType}
                                          </Badge>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground">{trans.position}</p>
                                        <div className="flex items-center gap-3 text-[10px] mt-1 text-muted-foreground">
                                          <span>{trans.shares.toLocaleString()} shares</span>
                                          {price && price > 0 && <span>@ ${price.toFixed(2)}</span>}
                                        </div>
                                      </div>
                                      <div className="text-right shrink-0">
                                        <div className="text-[10px] text-muted-foreground">
                                          {new Date(trans.date_reported).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric',
                                          })}
                                        </div>
                                        <div className="text-xs font-medium">
                                          {trans.value > 0 ? `$${(trans.value / 1e6).toFixed(2)}M` : 'Grant'}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* News Results Section */}
                {news_results &&
                  news_results.some((group) => group.topic !== 'financial' && group.results.length > 0) && (
                    <div className="mt-5 pt-4 border-t border-border/30">
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-1.5">
                          <Newspaper className="size-3.5 text-primary/80" />
                          <h3 className="text-xs font-medium text-foreground/90">Related News</h3>
                        </div>
                      </div>

                      <div className="flex overflow-x-auto gap-1.5 no-scrollbar pb-1 snap-x snap-mandatory">
                        {news_results
                          .filter((group) => group.topic !== 'financial')
                          .flatMap((group, groupIndex) =>
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
                                      <span className="text-[9px] text-muted-foreground/80 truncate">
                                        {group.query}
                                      </span>
                                    </div>
                                    <h4 className="text-xs font-medium line-clamp-2">{news.title}</h4>

                                    <p className="text-[10px] text-muted-foreground line-clamp-2 mt-1">
                                      {news.content}
                                    </p>

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
                {news_results &&
                  news_results.some((group) => group.topic === 'financial' && group.results.length > 0) && (
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
                                      <span className="text-[9px] text-muted-foreground/80 truncate">
                                        {group.query}
                                      </span>
                                    </div>
                                    <h4 className="text-xs font-medium line-clamp-2">{news.title}</h4>

                                    <p className="text-[10px] text-muted-foreground line-clamp-2 mt-1">
                                      {news.content}
                                    </p>

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

                {/* Market Movers Section */}
                {market_movers && (
                  <div className="mt-5 pt-4 border-t border-border/30">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1.5">
                        <Activity className="size-3.5 text-primary/80" />
                        <h3 className="text-xs font-medium text-foreground/90">Market Movers</h3>
                      </div>
                    </div>

                    <Tabs defaultValue="gainers" className="w-full">
                      <TabsList className="grid w-full grid-cols-3 mb-3">
                        <TabsTrigger value="gainers" className="text-xs">
                          Top Gainers
                        </TabsTrigger>
                        <TabsTrigger value="losers" className="text-xs">
                          Top Losers
                        </TabsTrigger>
                        <TabsTrigger value="active" className="text-xs">
                          Most Active
                        </TabsTrigger>
                      </TabsList>

                      {/* Gainers Tab */}
                      <TabsContent value="gainers">
                        <div className="grid gap-2">
                          {market_movers.gainers.map((stock, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-2 rounded-md bg-card/40 border border-border/30 hover:bg-card/60 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <Badge variant="outline" className="text-xs font-medium">
                                  {stock.symbol}
                                </Badge>
                                <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                  {stock.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">${stock.last.toFixed(2)}</span>
                                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 text-xs">
                                  <TrendingUp className="size-3 mr-1" />+{stock.percent_change.toFixed(2)}%
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </TabsContent>

                      {/* Losers Tab */}
                      <TabsContent value="losers">
                        <div className="grid gap-2">
                          {market_movers.losers.map((stock, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-2 rounded-md bg-card/40 border border-border/30 hover:bg-card/60 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <Badge variant="outline" className="text-xs font-medium">
                                  {stock.symbol}
                                </Badge>
                                <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                  {stock.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">${stock.last.toFixed(2)}</span>
                                <Badge className="bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 text-xs">
                                  <TrendingDown className="size-3 mr-1" />
                                  {stock.percent_change.toFixed(2)}%
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </TabsContent>

                      {/* Most Active Tab */}
                      <TabsContent value="active">
                        <div className="grid gap-2">
                          {market_movers.most_active.map((stock, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-2 rounded-md bg-card/40 border border-border/30 hover:bg-card/60 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <Badge variant="outline" className="text-xs font-medium">
                                  {stock.symbol}
                                </Badge>
                                <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                  {stock.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">${stock.last.toFixed(2)}</span>
                                <Badge
                                  className={cn(
                                    'text-xs',
                                    stock.percent_change >= 0
                                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                                      : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
                                  )}
                                >
                                  {stock.percent_change >= 0 ? (
                                    <TrendingUp className="size-3 mr-1" />
                                  ) : (
                                    <TrendingDown className="size-3 mr-1" />
                                  )}
                                  {stock.percent_change >= 0 ? '+' : ''}
                                  {stock.percent_change.toFixed(2)}%
                                </Badge>
                                <span className="text-[10px] text-muted-foreground">
                                  Vol: {(stock.volume / 1e6).toFixed(1)}M
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                )}
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
