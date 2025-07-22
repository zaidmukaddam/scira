/* eslint-disable @next/next/no-img-element */
'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Research } from '@/lib/tools/extreme-search';
import type { JSONValue, ToolInvocation } from 'ai';
import React, { useEffect, useState, memo, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, ArrowUpRight, Globe, Search, Calendar, ExternalLink } from 'lucide-react';
import { TextShimmer } from '@/components/core/text-shimmer';
import { Skeleton } from '@/components/ui/skeleton';
import ReactECharts, { EChartsOption } from 'echarts-for-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface QueryBlockData {
  queryId: string;
  query: string;
  sources: Array<{ title: string; url: string; favicon?: string }>;
  content: Array<{ title: string; url: string; text: string; favicon?: string }>;
}

interface CodeExecutionData {
  codeId: string;
  code: string;
  title: string;
  result?: string;
  charts?: any[];
  status: 'running' | 'complete';
}

// New interface for unified timeline
interface TimelineItemData {
  id: string;
  type: 'search' | 'code';
  title: string;
  status: 'loading' | 'success' | 'no_results';
  timestamp: number;
  searchData?: QueryBlockData;
  codeData?: CodeExecutionData;
}

type QueryStatus = 'loading' | 'success' | 'no_results';

const getQueryStatus = (
  queryData: QueryBlockData,
  queryIndex: number,
  allQueries: QueryBlockData[],
  overallToolState: ToolInvocation['state'],
): QueryStatus => {
  const isLastQuery = queryIndex === allQueries.length - 1;
  const sourcesPresent = queryData.sources.length > 0;
  const toolIsActive = overallToolState === 'call' || overallToolState === 'partial-call';

  if (sourcesPresent) {
    return 'success'; // Green: Has sources, regardless of anything else.
  }

  // At this point, !sourcesPresent (no sources for this queryData)
  if (isLastQuery && toolIsActive) {
    return 'loading'; // Blue: It's the current focus of active work.
  }

  // At this point, !sourcesPresent, AND (it's not the last query OR tool is not active).
  // This means it's an earlier query that yielded no sources, or it's the last query but the tool has finished.
  return 'no_results'; // Amber
};

// Minimal color palette for charts with better contrast
const CHART_COLORS = {
  primary: ['#3b82f6', '#60a5fa'],
  success: ['#22c55e', '#4ade80'],
  warning: ['#f59e0b', '#fbbf24'],
  purple: ['#8b5cf6', '#a78bfa'],
  pink: ['#ec4899', '#f472b6'],
  red: ['#ef4444', '#f87171'],
};

// Update the ExtremeChart component to be more standalone without the card wrapper
const ExtremeChart = memo(({ chart }: { chart: any }) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mobileMediaQuery = window.matchMedia('(max-width: 640px)');
    setIsMobile(mobileMediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mobileMediaQuery.addEventListener('change', handler);
    return () => mobileMediaQuery.removeEventListener('change', handler);
  }, []);

  // Memoize chartOptions
  const chartOptions = useMemo(() => {
    // Skip chart options calculation for composite charts
    if (chart.type === 'composite_chart') {
      return {};
    }

    const baseOption: EChartsOption = {
      backgroundColor: 'transparent',
      grid: {
        top: isMobile ? 50 : 65,
        right: isMobile ? 20 : 30,
        bottom: isMobile ? 45 : 55,
        left: isMobile ? 45 : 60,
        containLabel: true,
      },
      title: {
        text: chart.title,
        left: 'center',
        top: isMobile ? 6 : 8,
        textStyle: {
          color: isDark ? '#ffffff' : '#171717',
          fontSize: isMobile ? 11 : 12,
          fontWeight: 600,
          fontFamily: 'system-ui, -apple-system, sans-serif',
        },
      },
      tooltip: {
        backgroundColor: isDark ? '#1f1f1f' : '#ffffff',
        borderWidth: 1,
        borderColor: isDark ? '#404040' : '#e5e5e5',
        textStyle: {
          color: isDark ? '#ffffff' : '#000000',
          fontSize: isMobile ? 10 : 11,
          fontFamily: 'system-ui, -apple-system, sans-serif',
        },
        padding: [8, 12],
        extraCssText: `
          box-shadow: 0 4px 12px rgba(0, 0, 0, ${isDark ? '0.4' : '0.1'});
          border-radius: 6px;
          z-index: 1000;
        `,
        confine: true,
        enterable: false,
        hideDelay: 100,
        triggerOn: 'mousemove',
        position: function (
          pos: [number, number],
          params: any,
          dom: HTMLElement,
          rect: { x: number; y: number; width: number; height: number },
          size: { contentSize: [number, number]; viewSize: [number, number] },
        ) {
          // Ensure tooltip doesn't overlap with axis labels
          const tooltipWidth = dom.offsetWidth;
          const tooltipHeight = dom.offsetHeight;
          const chartWidth = size.viewSize[0];
          const chartHeight = size.viewSize[1];

          let x = pos[0];
          let y = pos[1];

          // Keep tooltip within chart bounds and away from edges
          if (x + tooltipWidth > chartWidth - 20) {
            x = chartWidth - tooltipWidth - 20;
          }
          if (x < 20) {
            x = 20;
          }

          // Keep tooltip above the bottom 60px to avoid axis labels
          if (y + tooltipHeight > chartHeight - 60) {
            y = pos[1] - tooltipHeight - 20;
          }
          if (y < 20) {
            y = 20;
          }

          return [x, y];
        },
      },
      legend: {
        show: true,
        type: 'scroll',
        top: isMobile ? 26 : 32,
        left: 'center',
        orient: 'horizontal',
        textStyle: {
          color: isDark ? '#d4d4d4' : '#525252',
          fontSize: isMobile ? 9 : 10,
          fontFamily: 'system-ui, -apple-system, sans-serif',
        },
        icon: 'circle',
        itemWidth: isMobile ? 6 : 8,
        itemHeight: isMobile ? 6 : 8,
        itemGap: isMobile ? 8 : 12,
        pageIconSize: isMobile ? 8 : 10,
        pageTextStyle: {
          fontSize: isMobile ? 9 : 10,
          color: isDark ? '#d4d4d4' : '#525252',
        },
      },
      animation: true,
      animationDuration: 400,
      animationEasing: 'cubicOut',
    };

    const axisStyle = {
      axisLine: {
        show: true,
        lineStyle: {
          color: isDark ? '#404040' : '#e5e5e5',
          width: 1,
        },
      },
      axisTick: {
        show: true,
        lineStyle: {
          color: isDark ? '#404040' : '#e5e5e5',
        },
        length: 4,
      },
      axisLabel: {
        color: isDark ? '#d4d4d4' : '#525252',
        fontSize: isMobile ? 9 : 10,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        margin: isMobile ? 8 : 10,
        hideOverlap: true,
      },
      splitLine: {
        show: false,
      },
    };

    // Handle different chart types
    if (chart.type === 'pie') {
      const colorPalette = Object.values(CHART_COLORS);
      return {
        ...baseOption,
        tooltip: {
          ...baseOption.tooltip,
          trigger: 'item',
          formatter: '{b}: {c} ({d}%)',
        },
        legend: {
          ...baseOption.legend,
          show: !isMobile,
        },
        series: [
          {
            type: 'pie',
            radius: isMobile ? '65%' : '70%',
            center: ['50%', '55%'],
            data: chart.elements.map((item: any, index: number) => {
              const colorSet = colorPalette[index % colorPalette.length];
              return {
                name: item.label,
                value: item.angle,
                itemStyle: {
                  color: colorSet[0],
                  borderRadius: 3,
                  borderColor: isDark ? '#262626' : '#ffffff',
                  borderWidth: 1,
                },
                emphasis: {
                  itemStyle: {
                    color: colorSet[1],
                    shadowBlur: 10,
                    shadowColor: `rgba(0, 0, 0, ${isDark ? '0.4' : '0.2'})`,
                  },
                },
              };
            }),
            label: {
              show: !isMobile,
              position: 'outer',
              alignTo: 'labelLine',
              color: isDark ? '#d4d4d4' : '#525252',
              fontSize: 9,
              fontWeight: 500,
            },
            labelLine: {
              show: !isMobile,
              length: 6,
              length2: 8,
            },
          },
        ],
      };
    }

    const commonAxisOptions = (axisName?: string) => ({
      name: isMobile ? '' : axisName,
      nameLocation: 'middle',
      nameGap: isMobile ? 25 : chart.type === 'bar' ? 40 : axisName?.toLowerCase().includes('y') ? 45 : 40,
      nameTextStyle: {
        color: isDark ? '#d4d4d4' : '#525252',
        fontSize: isMobile ? 9 : 10,
        fontWeight: 500,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      },
      ...axisStyle,
    });

    if (chart.type === 'line' || chart.type === 'scatter') {
      const colorPalette = Object.values(CHART_COLORS);
      return {
        ...baseOption,
        tooltip: {
          ...baseOption.tooltip,
          trigger: 'axis',
          axisPointer: {
            type: 'cross',
            crossStyle: {
              color: isDark ? '#525252' : '#d4d4d4',
              width: 1,
            },
            lineStyle: {
              color: isDark ? '#525252' : '#d4d4d4',
              width: 1,
              type: 'dashed',
            },
          },
        },
        xAxis: {
          type: chart.x_scale === 'datetime' ? 'time' : 'value',
          ...commonAxisOptions(chart.x_label),
        },
        yAxis: {
          type: 'value',
          ...commonAxisOptions(chart.y_label),
        },
        series: chart.elements.map((element: any, index: number) => {
          const colorSet = colorPalette[index % colorPalette.length];
          return {
            name: element.label,
            type: chart.type,
            data: element.points.map((point: any) => {
              const x = chart.x_scale === 'datetime' ? new Date(point[0]).getTime() : point[0];
              return [x, point[1]];
            }),
            itemStyle: {
              color: colorSet[0],
              borderWidth: 0,
            },
            lineStyle: {
              width: 2,
              color: colorSet[0],
              cap: 'round',
              join: 'round',
            },
            smooth: chart.type === 'line' ? 0.2 : undefined,
            symbol: chart.type === 'scatter' ? 'circle' : isMobile ? 'circle' : 'emptyCircle',
            symbolSize: chart.type === 'scatter' ? (isMobile ? 4 : 6) : isMobile ? 3 : 4,
            showSymbol: isMobile ? false : chart.type === 'scatter',
            emphasis: {
              focus: 'series',
              scale: false,
              itemStyle: {
                color: colorSet[1],
              },
            },
            areaStyle:
              chart.type === 'line'
                ? {
                    color: {
                      type: 'linear',
                      x: 0,
                      y: 0,
                      x2: 0,
                      y2: 1,
                      colorStops: [
                        {
                          offset: 0,
                          color: `${colorSet[0]}15`,
                        },
                        {
                          offset: 1,
                          color: `${colorSet[0]}03`,
                        },
                      ],
                    },
                  }
                : undefined,
          };
        }),
      };
    }

    if (chart.type === 'bar') {
      const colorPalette = Object.values(CHART_COLORS);
      // Group data by categories
      const categories = Array.from(new Set(chart.elements.map((e: any) => e.label)));
      const seriesData: Record<string, number[]> = {};
      const seriesNames = Array.from(new Set(chart.elements.map((e: any) => e.group)));

      seriesNames.forEach((name) => {
        seriesData[name as string] = categories.map((cat) => {
          const item = chart.elements.find((e: any) => e.group === name && e.label === cat);
          return item ? item.value : 0;
        });
      });

      return {
        ...baseOption,
        tooltip: {
          ...baseOption.tooltip,
          trigger: 'axis',
          axisPointer: {
            type: 'shadow',
            shadowStyle: {
              color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            },
          },
        },
        xAxis: {
          type: 'category',
          data: categories,
          ...commonAxisOptions(chart.x_label),
          axisLabel: {
            ...axisStyle.axisLabel,
            rotate: categories.length > (isMobile ? 3 : 6) ? (isMobile ? 45 : 30) : 0,
            interval: categories.length > (isMobile ? 5 : 10) ? 'auto' : 0,
            formatter: isMobile
              ? function (value: string) {
                  return value.length > 5 ? value.substring(0, 4) + '...' : value;
                }
              : undefined,
          },
        },
        yAxis: {
          type: 'value',
          ...commonAxisOptions(chart.y_label),
          axisLabel: {
            ...axisStyle.axisLabel,
            formatter: (value: number) => {
              if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
              if (value >= 1000) return (value / 1000).toFixed(0) + 'K';
              return value;
            },
          },
        },
        series: seriesNames.map((name, index) => {
          const colorSet = colorPalette[index % colorPalette.length];
          return {
            name: name as string,
            type: 'bar',
            data: seriesData[name as string],
            itemStyle: {
              color: colorSet[0],
              borderRadius: [isMobile ? 2 : 3, isMobile ? 2 : 3, 0, 0],
            },
            emphasis: {
              itemStyle: {
                color: colorSet[1],
              },
            },
            barMaxWidth: isMobile ? 20 : 30,
            barGap: '20%',
          };
        }),
      };
    }

    // Box and Whisker Chart (Box Plot)
    if (chart.type === 'box_and_whisker') {
      // Format the data for ECharts boxplot
      // Expected format for each element: [min, Q1, median, Q3, max]
      return {
        ...baseOption,
        tooltip: {
          ...baseOption.tooltip,
          trigger: 'item',
          axisPointer: {
            type: 'shadow',
          },
          formatter: function (params: any) {
            const data = params.data;
            return `${params.seriesName}<br/>
                   <strong>Maximum:</strong> ${data[4]}<br/>
                   <strong>Upper Quartile:</strong> ${data[3]}<br/>
                   <strong>Median:</strong> ${data[2]}<br/>
                   <strong>Lower Quartile:</strong> ${data[1]}<br/>
                   <strong>Minimum:</strong> ${data[0]}`;
          },
        },
        xAxis: {
          type: 'category',
          data: chart.elements.map((e: any) => e.label || e.name),
          boundaryGap: true,
          splitArea: { show: false },
          ...commonAxisOptions(chart.x_label),
        },
        yAxis: {
          type: 'value',
          ...commonAxisOptions(chart.y_label),
        },
        series: [
          {
            name: chart.title || 'Box Plot',
            type: 'boxplot',
            data: chart.elements.map((element: any) => {
              // If data is already in boxplot format [min, Q1, median, Q3, max]
              if (Array.isArray(element.data) && element.data.length === 5) {
                return element.data;
              }
              // If data points are provided, calculate box plot values
              else if (Array.isArray(element.points)) {
                const values = element.points
                  .map((point: any) => (Array.isArray(point) ? point[1] : point))
                  .sort((a: number, b: number) => a - b);

                if (values.length === 0) return [0, 0, 0, 0, 0];

                const min = values[0];
                const max = values[values.length - 1];
                const median =
                  values.length % 2 === 0
                    ? (values[values.length / 2 - 1] + values[values.length / 2]) / 2
                    : values[Math.floor(values.length / 2)];

                const lowerHalf = values.slice(0, Math.floor(values.length / 2));
                const upperHalf =
                  values.length % 2 === 0
                    ? values.slice(values.length / 2)
                    : values.slice(Math.floor(values.length / 2) + 1);

                const q1 =
                  lowerHalf.length % 2 === 0
                    ? (lowerHalf[lowerHalf.length / 2 - 1] + lowerHalf[lowerHalf.length / 2]) / 2
                    : lowerHalf[Math.floor(lowerHalf.length / 2)];

                const q3 =
                  upperHalf.length % 2 === 0
                    ? (upperHalf[upperHalf.length / 2 - 1] + upperHalf[upperHalf.length / 2]) / 2
                    : upperHalf[Math.floor(upperHalf.length / 2)];

                return [min, q1, median, q3, max];
              }
              // Default empty box
              return [0, 0, 0, 0, 0];
            }),
            itemStyle: {
              color: CHART_COLORS.primary[1],
              borderColor: CHART_COLORS.primary[0],
            },
            emphasis: {
              itemStyle: {
                borderWidth: 2,
                shadowBlur: 8,
                shadowColor: `rgba(0, 0, 0, ${isDark ? '0.4' : '0.2'})`,
              },
            },
            boxWidth: [isMobile ? 25 : 40],
          },
        ],
      };
    }

    // Default case - just return base options
    return {
      ...baseOption,
      tooltip: {
        ...baseOption.tooltip,
        trigger: 'axis',
      },
    };
  }, [chart, isDark, isMobile]);

  // Handle composite charts (multiple charts in one container)
  if (chart.type === 'composite_chart') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {(chart.elements || chart.data || []).map((subChart: any, index: number) => (
          <div key={index} className="w-full">
            <ExtremeChart chart={subChart} />
          </div>
        ))}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-sm overflow-hidden h-full"
    >
      <div className="w-full p-3 h-64 sm:h-72">
        <ReactECharts
          option={chartOptions}
          style={{ height: '100%', width: '100%' }}
          theme={isDark ? 'dark' : ''}
          opts={{ renderer: 'canvas', locale: 'en' }}
          notMerge={true}
        />
      </div>
    </motion.div>
  );
});

ExtremeChart.displayName = 'ExtremeChart';

// Source Card Component for Extreme Search
const ExtremeSourceCard: React.FC<{
  source: any;
  content?: string;
  onClick?: () => void;
}> = ({ source, content, onClick }) => {
  const [imageLoaded, setImageLoaded] = React.useState(false);
  let hostname = '';

  try {
    hostname = new URL(source.url).hostname.replace('www.', '');
  } catch {
    hostname = source.url;
  }

  return (
    <div
      className={cn(
        'group relative bg-white dark:bg-neutral-900',
        'border border-neutral-200 dark:border-neutral-800',
        'rounded-xl p-4 transition-all duration-200',
        'hover:shadow-sm hover:border-neutral-300 dark:hover:border-neutral-700',
        onClick && 'cursor-pointer',
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="relative w-10 h-10 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center overflow-hidden shrink-0">
          {!imageLoaded && <div className="absolute inset-0 animate-pulse" />}
          {source.favicon ? (
            <Image
              src={source.favicon}
              alt=""
              width={24}
              height={24}
              className={cn('object-contain', !imageLoaded && 'opacity-0')}
              onLoad={() => setImageLoaded(true)}
              onError={(e) => {
                setImageLoaded(true);
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <Globe className="w-5 h-5 text-neutral-400" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm text-neutral-900 dark:text-neutral-100 line-clamp-1 mb-1">
            {source.title || hostname}
          </h3>
          <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
            <span className="truncate">{hostname}</span>
            <ExternalLink className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </div>

      {/* Content */}
      {content && (
        <p className="text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2 leading-relaxed mb-3">
          {content.length > 150 ? content.substring(0, 150) + '...' : content}
        </p>
      )}

      {/* Date if available */}
      {source.published_date && (
        <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800">
          <time className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
            <Calendar className="w-3 h-3" />
            {new Date(source.published_date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </time>
        </div>
      )}
    </div>
  );
};

// Sources Sheet Component for Extreme Search
const ExtremeSourcesSheet: React.FC<{
  sources: Array<any>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}> = ({ sources, open, onOpenChange }) => {
  const isMobile = useIsMobile();

  const SheetWrapper = isMobile ? Drawer : Sheet;
  const SheetContentWrapper = isMobile ? DrawerContent : SheetContent;

  return (
    <SheetWrapper open={open} onOpenChange={onOpenChange}>
      <SheetContentWrapper className={cn(isMobile ? 'h-[85vh]' : 'w-[600px] sm:max-w-[600px]', 'p-0')}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="px-6 py-5 border-b border-neutral-200 dark:border-neutral-800">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">All Sources</h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">{sources.length} research sources</p>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-3">
              {sources.map((source, index) => (
                <a key={index} href={source.url} target="_blank" rel="noopener noreferrer" className="block">
                  <ExtremeSourceCard source={source} />
                </a>
              ))}
            </div>
          </div>
        </div>
      </SheetContentWrapper>
    </SheetWrapper>
  );
};

const ExtremeSearchComponent = ({
  toolInvocation,
  annotations,
}: {
  toolInvocation: ToolInvocation;
  annotations?: JSONValue[];
}) => {
  const { state } = toolInvocation;
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [previousItemsLength, setPreviousItemsLength] = useState(0);
  const timelineContainerRef = useRef<HTMLDivElement>(null);

  // Add state for accordion sections (default to closed for more compact view)
  const [researchProcessOpen, setResearchProcessOpen] = useState(false);
  const [sourcesAccordionOpen, setSourcesAccordionOpen] = useState(true);
  const [sourcesSheetOpen, setSourcesSheetOpen] = useState(false);

  const latestStatusAnnotation = useMemo(
    () =>
      (annotations as any[])
        ?.filter((ann) => ann && (ann.status || ann.plan) && (typeof ann.status?.title === 'string' || ann.plan))
        .pop(),
    [annotations],
  );

  const latestStatusTitle =
    latestStatusAnnotation?.status?.title ||
    (state === 'call' || state === 'partial-call' ? 'Thinking...' : 'Processing...');

  const planData = useMemo(() => (annotations as any[])?.find((ann) => ann.plan)?.plan, [annotations]);

  const queriesWithSources: QueryBlockData[] = useMemo(
    () =>
      (annotations as any[])?.reduce((acc: QueryBlockData[], annotation: any) => {
        if (!annotation) return acc;

        if (annotation.type === 'search_query' && typeof annotation.query === 'string') {
          // Use queryId as unique identifier, fallback to query text if no id
          const queryId = annotation.queryId || `fallback-${annotation.query}`;
          if (!acc.find((q) => q.queryId === queryId)) {
            acc.push({ queryId, query: annotation.query, sources: [], content: [] });
          }
        } else if (annotation.type === 'source' && annotation.source && typeof annotation.source.url === 'string') {
          // Find the query by queryId if available, otherwise use the last query
          const queryId = annotation.queryId;
          const targetQuery = queryId
            ? acc.find((q) => q.queryId === queryId)
            : acc.length > 0
              ? acc[acc.length - 1]
              : null;

          if (targetQuery && !targetQuery.sources.find((s) => s.url === annotation.source.url)) {
            targetQuery.sources.push({
              title: annotation.source.title || '',
              url: annotation.source.url,
              favicon:
                annotation.source.favicon ||
                `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(
                  new URL(annotation.source.url).hostname,
                )}`,
            });
          }
        } else if (annotation.type === 'content' && annotation.content && typeof annotation.content.url === 'string') {
          // Find the query by queryId if available, otherwise use the last query
          const queryId = annotation.queryId;
          const targetQuery = queryId
            ? acc.find((q) => q.queryId === queryId)
            : acc.length > 0
              ? acc[acc.length - 1]
              : null;

          if (targetQuery && !targetQuery.content.find((c) => c.url === annotation.content.url)) {
            targetQuery.content.push({
              title: annotation.content.title || '',
              url: annotation.content.url,
              text: annotation.content.text || '',
              favicon:
                annotation.content.favicon ||
                `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(
                  new URL(annotation.content.url).hostname,
                )}`,
            });
          }
        }
        return acc;
      }, [] as QueryBlockData[]) || [],
    [annotations],
  );

  const codeExecutions: CodeExecutionData[] = useMemo(
    () =>
      (annotations as any[])?.reduce((acc: CodeExecutionData[], annotation: any) => {
        if (!annotation || !annotation.status) return acc;

        // Handle code execution annotations
        if (annotation.status.type === 'code' && typeof annotation.status.code === 'string') {
          // Generate a unique ID for this code block
          const codeId = `code-${acc.length}`;
          if (!acc.find((c) => c.code === annotation.status.code)) {
            acc.push({
              codeId,
              code: annotation.status.code,
              title: annotation.status.title || 'Python Code Execution',
              status: 'running',
            });
          }
        }
        // Handle code results
        else if (annotation.status.type === 'result' && typeof annotation.status.code === 'string') {
          // Find existing code execution or add a new one
          const existingCode = acc.find((c) => c.code === annotation.status.code);
          if (existingCode) {
            existingCode.result = annotation.status.result;
            existingCode.charts = annotation.status.charts;
            existingCode.status = 'complete';
          } else {
            acc.push({
              codeId: `code-${acc.length}`,
              code: annotation.status.code,
              title: annotation.status.title || 'Python Code Execution',
              result: annotation.status.result,
              charts: annotation.status.charts,
              status: 'complete' as const,
            });
          }
        }

        return acc;
      }, [] as CodeExecutionData[]) || [],
    [annotations],
  );

  const annotationTimestamps: Record<string, number> = useMemo(() => {
    const timestamps: Record<string, number> = {};
    (annotations as any[])?.forEach((annotation, index) => {
      if (annotation?.type === 'search_query' && annotation.queryId) {
        timestamps[annotation.queryId] = index;
      }
      if (annotation?.status?.type === 'code' && annotation.status.code) {
        const codeHash = annotation.status.code.length.toString();
        timestamps[`code-${codeHash}`] = index;
      }
    });
    return timestamps;
  }, [annotations]);

  const timelineItems: TimelineItemData[] = useMemo(() => {
    const items: TimelineItemData[] = [];

    // If we're in result state and have research data available, use that instead of annotations
    if (state === 'result') {
      const { result } = toolInvocation;
      const researchData = result as { research: Research } | null;
      const research = researchData?.research;

      if (research) {
        // Process tool calls for web searches
        const webSearchCalls = (research.toolResults || [])
          .filter((call) => call.toolName === 'webSearch')
          .map((call, index) => {
            const query = call.args?.query || '';
            const queryId = call.toolCallId;
            // Find the corresponding result
            const resultData = (research.toolResults || []).find((r) => r.toolCallId === call.toolCallId);

            // Create a QueryBlockData object similar to what we get from annotations
            return {
              queryId,
              query,
              sources: (resultData?.result || []).map((source: any) => ({
                title: source.title || '',
                url: source.url || '',
                favicon:
                  source.favicon ||
                  `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(
                    new URL(source.url).hostname,
                  )}`,
              })),
              content: (resultData?.result || []).map((source: any) => ({
                title: source.title || '',
                url: source.url || '',
                text: source.content || '',
                favicon:
                  source.favicon ||
                  `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(
                    new URL(source.url).hostname,
                  )}`,
              })),
            };
          });

        // Add web searches to items
        webSearchCalls.forEach((queryData, index) => {
          items.push({
            id: queryData.queryId,
            type: 'search',
            title: queryData.query,
            status: queryData.sources.length > 0 ? 'success' : 'no_results',
            timestamp: index,
            searchData: queryData,
          });
        });

        // Process tool calls for code executions
        const codeCalls = (research.toolResults || [])
          .filter((call) => call.toolName === 'codeRunner')
          .map((call, index) => {
            const title = call.args?.title || 'Python Code Execution';
            const code = call.args?.code || '';
            const codeId = `code-result-${index}`;
            // Find the corresponding result
            const resultData = (research.toolResults || []).find((r) => r.toolCallId === call.toolCallId);

            // Create a CodeExecutionData object
            return {
              codeId,
              code,
              title,
              result: resultData?.result?.result || '',
              charts: resultData?.result?.charts || [],
              status: 'complete' as const,
            };
          });

        // Add code executions to items
        codeCalls.forEach((codeData, index) => {
          items.push({
            id: codeData.codeId,
            type: 'code',
            title: codeData.title,
            status: 'success',
            timestamp: webSearchCalls.length + index,
            codeData: codeData,
          });
        });
      }
    } else {
      // Original behavior for non-result states using annotations
      queriesWithSources.forEach((queryData, index) => {
        const calculatedQueryStatus = getQueryStatus(queryData, index, queriesWithSources, state);
        items.push({
          id: queryData.queryId,
          type: 'search',
          title: queryData.query,
          status: calculatedQueryStatus,
          timestamp: annotationTimestamps[queryData.queryId] || index,
          searchData: queryData,
        });
      });

      codeExecutions.forEach((codeData, index) => {
        const codeHash = codeData.code.length.toString();
        items.push({
          id: codeData.codeId,
          type: 'code',
          title: codeData.title,
          status: codeData.status === 'running' ? 'loading' : 'success',
          timestamp: annotationTimestamps[`code-${codeHash}`] || queriesWithSources.length + index,
          codeData: codeData,
        });
      });
    }

    items.sort((a, b) => a.timestamp - b.timestamp);
    return items;
  }, [queriesWithSources, codeExecutions, state, annotationTimestamps, toolInvocation]);

  // Auto-expand latest item and close previous ones when a new item is added
  useEffect(() => {
    if (timelineItems.length > previousItemsLength) {
      // A new item was added
      const newExpandedMap: Record<string, boolean> = {};

      // Close all items except the latest one
      timelineItems.forEach((item, index) => {
        // Only expand the latest item
        newExpandedMap[item.id] = index === timelineItems.length - 1;
      });

      setExpandedItems(newExpandedMap);
      setPreviousItemsLength(timelineItems.length);
    }
  }, [timelineItems.length, previousItemsLength, timelineItems]);

  // Modified auto-scroll effect to only trigger when items are added, not when expanded
  useEffect(() => {
    if (timelineContainerRef.current && timelineItems.length > previousItemsLength) {
      // Only auto-scroll when new items are added (not when items are expanded)
      setTimeout(() => {
        if (timelineContainerRef.current) {
          timelineContainerRef.current.scrollTop = timelineContainerRef.current.scrollHeight;
        }
      }, 50);
    }
  }, [timelineItems.length, previousItemsLength]);

  const toggleItemExpansion = (itemId: string) => {
    setExpandedItems((prev) => ({ ...prev, [itemId]: !prev[itemId] }));

    // When expanding an item, smoothly scroll it into view if needed
    if (!expandedItems[itemId]) {
      // Wait for the DOM to update with the expanded content
      setTimeout(() => {
        // Find the element that was just expanded
        const expandedElement = document.getElementById(itemId);
        if (expandedElement && timelineContainerRef.current) {
          // Check if element is already fully visible
          const containerRect = timelineContainerRef.current.getBoundingClientRect();
          const elementRect = expandedElement.getBoundingClientRect();

          // If element bottom is below container bottom, scroll it into view
          if (elementRect.bottom > containerRect.bottom) {
            expandedElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }
      }, 100);
    }
  };

  // in-progress and result states will both render the timeline
  const renderTimeline = () => (
    <div
      ref={timelineContainerRef}
      className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-neutral-200 hover:scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-700 dark:hover:scrollbar-thumb-neutral-600 scrollbar-track-transparent"
    >
      <AnimatePresence>
        {timelineItems.map((item, itemIndex) => {
          const bulletColor =
            item.status === 'loading'
              ? 'bg-[#4ade80] animate-[pulse_1s_ease-in-out_infinite]!'
              : item.status === 'success'
                ? 'bg-neutral-500'
                : 'bg-amber-500';

          // For search queries, check if we're reading content
          let isReadingContent = false;
          if (item.type === 'search' && item.searchData) {
            isReadingContent =
              (state === 'call' || state === 'partial-call') &&
              latestStatusAnnotation?.status?.title?.includes(
                `Reading content from search results for "${item.searchData.query}"`,
              );
          }

          return (
            <motion.div
              id={item.id}
              key={item.id}
              className="space-y-0.5 relative ml-4"
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 0.15,
                delay: itemIndex * 0.02,
              }}
            >
              {/* Background circle to prevent line showing through during animation */}
              <div
                className="absolute w-2 h-2 rounded-full bg-white dark:bg-neutral-900 z-5"
                style={{
                  left: '-0.8rem',
                  top: '6px',
                  transform: 'translateX(-50%)',
                }}
              />

              <div
                className={`absolute size-1.5 rounded-full ${
                  item.status === 'loading' || isReadingContent
                    ? 'bg-[#4ade80] animate-[pulse_0.8s_ease-in-out_infinite]!'
                    : bulletColor
                } transition-colors duration-300 z-10`}
                style={{
                  left: '-0.8rem',
                  top: '7px',
                  transform: 'translateX(-50%)',
                }}
                title={`Status: ${item.status.replace('_', ' ')}`}
              />

              {/* Add vertical line above bullet */}
              {itemIndex > 0 && (
                <div
                  className="absolute w-0.25 bg-neutral-200 dark:bg-neutral-700"
                  style={{
                    left: '-0.8rem',
                    top: '-10px', // Start higher to connect to previous bullet
                    height: '17px', // Extend to just touch the current bullet
                    transform: 'translateX(-50%)',
                  }}
                />
              )}

              {/* Add vertical line below bullet that extends to content when expanded */}
              <div
                className="absolute w-0.25 bg-neutral-200 dark:bg-neutral-700"
                style={{
                  left: '-0.8rem',
                  top: '8px', // Start just below the bullet
                  height: expandedItems[item.id]
                    ? // If this is the last item, don't extend too far when expanded
                      itemIndex === timelineItems.length - 1
                      ? 'calc(100% - 8px)'
                      : '100%'
                    : // If not the last item, extend to connect with next item
                      itemIndex === timelineItems.length - 1
                      ? '10px'
                      : '20px',
                  transform: 'translateX(-50%)',
                }}
              />

              <div
                className="flex items-center gap-1.5 cursor-pointer py-0.5 px-1 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 rounded-sm relative min-h-[22px]"
                onClick={() => toggleItemExpansion(item.id)}
              >
                {/* Display an icon based on item type */}
                {item.type === 'search' && (
                  <Search className="w-3 h-3 text-neutral-500 dark:text-neutral-400 flex-shrink-0" />
                )}
                {item.type === 'code' && (
                  <span className="text-neutral-500 dark:text-neutral-400 flex-shrink-0 font-mono text-[10px]">
                    {'{}'}
                  </span>
                )}

                <span className="text-neutral-800 dark:text-neutral-200 text-xs min-w-0 flex-1">
                  {(item.status === 'loading' || isReadingContent) && state !== 'result' ? (
                    <TextShimmer className="w-full" duration={1.5}>
                      {item.title}
                    </TextShimmer>
                  ) : (
                    item.title
                  )}
                </span>
                {expandedItems[item.id] ? (
                  <ChevronDown className="w-3 h-3 text-neutral-500 dark:text-neutral-400 flex-shrink-0 ml-auto" />
                ) : (
                  <ChevronRight className="w-3 h-3 text-neutral-500 dark:text-neutral-400 flex-shrink-0 ml-auto" />
                )}
              </div>

              <AnimatePresence>
                {expandedItems[item.id] && (
                  <motion.div
                    key="content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{
                      height: { duration: 0.2, ease: 'easeOut' },
                      opacity: { duration: 0.15 },
                    }}
                    className="dark:border-neutral-700 overflow-hidden"
                  >
                    <div className="pl-1 py-1">
                      {/* Search query content */}
                      {item.type === 'search' && item.searchData && (
                        <>
                          {item.searchData.sources.length > 0 && (
                            <motion.div
                              className="flex flex-wrap gap-1.5 py-1"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 0.2 }}
                            >
                              {item.searchData.sources.map((source, index) => (
                                <motion.a
                                  key={index}
                                  href={source.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full text-xs hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ duration: 0.15, delay: index * 0.02 }}
                                >
                                  <img
                                    src={source.favicon}
                                    alt=""
                                    className="w-3.5 h-3.5 rounded-full"
                                    onError={(e) => {
                                      e.currentTarget.src =
                                        'https://www.google.com/s2/favicons?sz=128&domain=example.com';
                                      (e.currentTarget as HTMLImageElement).style.filter = 'grayscale(100%)';
                                    }}
                                  />
                                  <span
                                    className="text-neutral-600 dark:text-neutral-400 truncate max-w-[120px]"
                                    title={source.title || 'source'}
                                  >
                                    {source.title || 'source'}
                                  </span>
                                </motion.a>
                              ))}
                            </motion.div>
                          )}
                          {(() => {
                            if (isReadingContent && item.searchData.sources.length > 0 && state !== 'result') {
                              return (
                                <TextShimmer className="text-xs py-0.5" duration={2.5}>
                                  Reading content...
                                </TextShimmer>
                              );
                            } else if (item.status === 'loading' && state !== 'result') {
                              return (
                                <TextShimmer className="text-xs py-0.5" duration={2.5}>
                                  Searching sources...
                                </TextShimmer>
                              );
                            } else if (item.status === 'no_results' && item.searchData.sources.length === 0) {
                              return (
                                <p className="text-xs text-neutral-500 dark:text-neutral-400 py-1 mt-1">
                                  No sources found for this query.
                                </p>
                              );
                            }
                            return null;
                          })()}
                        </>
                      )}

                      {/* Code execution content */}
                      {item.type === 'code' && item.codeData && (
                        <>
                          {/* Code Block */}
                          <div className="bg-neutral-100 dark:bg-neutral-800 p-2 rounded-md my-1 overflow-auto max-h-[150px] text-xs font-mono">
                            <pre className="whitespace-pre-wrap break-words">{item.codeData.code}</pre>
                          </div>

                          {/* Result Block (if available) */}
                          {item.codeData.result && (
                            <div className="mt-2">
                              <div className="text-xs text-neutral-600 dark:text-neutral-400 font-medium mb-1">
                                Result:
                              </div>
                              <div className="bg-neutral-100 dark:bg-neutral-800 p-2 rounded-md overflow-auto max-h-[100px] text-xs font-mono">
                                <pre className="whitespace-pre-wrap break-words">{item.codeData.result}</pre>
                              </div>
                            </div>
                          )}

                          {/* Charts Block (if available) */}
                          {item.codeData.charts && item.codeData.charts.length > 0 && (
                            <div className="mt-3 mb-1 space-y-4">
                              {item.codeData.charts.map((chart, chartIndex) => (
                                <div key={chartIndex} className="w-full">
                                  <ExtremeChart chart={chart} />
                                </div>
                              ))}
                            </div>
                          )}

                          {/* If still running */}
                          {item.codeData.status === 'running' && state !== 'result' && (
                            <TextShimmer className="text-xs py-0.5 mt-1" duration={2.5}>
                              Executing code...
                            </TextShimmer>
                          )}
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );

  // Add horizontal scroll support with mouse wheel
  const handleWheelScroll = (e: React.WheelEvent<HTMLDivElement>) => {
    const container = e.currentTarget;

    // Only handle vertical scrolling
    if (e.deltaY === 0) return;

    // Check if container can scroll horizontally
    const canScrollHorizontally = container.scrollWidth > container.clientWidth;
    if (!canScrollHorizontally) return;

    // Always stop propagation first to prevent page scroll interference
    e.stopPropagation();

    // Check scroll position to determine if we should handle the event
    const isAtLeftEdge = container.scrollLeft <= 1; // Small tolerance for edge detection
    const isAtRightEdge = container.scrollLeft >= container.scrollWidth - container.clientWidth - 1;

    // Only prevent default if we're not at edges OR if we're scrolling in the direction that would move within bounds
    if (!isAtLeftEdge && !isAtRightEdge) {
      // In middle of scroll area - always handle
      e.preventDefault();
      container.scrollLeft += e.deltaY;
    } else if (isAtLeftEdge && e.deltaY > 0) {
      // At left edge, scrolling right - handle it
      e.preventDefault();
      container.scrollLeft += e.deltaY;
    } else if (isAtRightEdge && e.deltaY < 0) {
      // At right edge, scrolling left - handle it
      e.preventDefault();
      container.scrollLeft += e.deltaY;
    }
    // If at edge and scrolling in direction that would go beyond bounds, let the event continue but without propagation
  };

  // Rendering the sources card for result state
  const renderSources = (uniqueSources: Array<any>) => {
    // Get content for sources from timeline data
    const getSourceContent = (sourceUrl: string) => {
      return (
        timelineItems
          .filter((item) => item.type === 'search' && item.searchData)
          .flatMap((item) => item.searchData!.content.filter((c) => c.url === sourceUrl))[0]?.text || ''
      );
    };

    // Show first 5 sources in preview
    const previewSources = uniqueSources.slice(0, 5);

    return (
      <Card className="w-full mx-auto gap-0 py-0 mb-3 shadow-none overflow-hidden bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800/50 rounded-lg">
        <div
          className={cn(
            'flex items-center justify-between py-3 px-4 cursor-pointer',
            'border-b border-neutral-200 dark:border-neutral-800/50',
            'data-[state=open]:rounded-b-none',
          )}
          onClick={() => setSourcesAccordionOpen(!sourcesAccordionOpen)}
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-neutral-100 dark:bg-neutral-800">
                <Globe className="h-3.5 w-3.5 text-neutral-500" />
              </div>
              <h2 className="font-medium text-sm">Sources</h2>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="rounded-full text-xs px-2.5 py-0.5">
                {uniqueSources.length}
              </Badge>
              {uniqueSources.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSourcesSheetOpen(true);
                  }}
                >
                  View all
                  <ArrowUpRight className="w-3 h-3 ml-1" />
                </Button>
              )}
              {sourcesAccordionOpen ? (
                <ChevronDown className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400 ml-1" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400 ml-1" />
              )}
            </div>
          </div>
        </div>
        <AnimatePresence>
          {sourcesAccordionOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{
                height: { duration: 0.2, ease: 'easeOut' },
                opacity: { duration: 0.15 },
              }}
            >
              <CardContent className="p-3 space-y-3">
                {uniqueSources.length > 0 ? (
                  <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1" onWheel={handleWheelScroll}>
                    {previewSources.map((source, index) => (
                      <a
                        key={index}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block flex-shrink-0 w-[320px]"
                      >
                        <ExtremeSourceCard source={source} content={getSourceContent(source.url)} />
                      </a>
                    ))}
                  </div>
                ) : (
                  <motion.p
                    className="text-neutral-500 dark:text-neutral-400 text-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    No sources found for this research.
                  </motion.p>
                )}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    );
  };

  // Collect all charts from code executions for the final result view
  const allCharts = useMemo(() => {
    if (state !== 'result') return []; // Only calculate if in result state

    // Get charts from result data if available
    if (state === 'result') {
      const { result } = toolInvocation;
      const researchData = result as { research: Research } | null;
      const research = researchData?.research;

      if (research && research.charts && research.charts.length > 0) {
        return research.charts;
      }
    }

    // Fallback to getting charts from timeline items
    return timelineItems
      .filter((item) => item.type === 'code' && item.codeData?.charts && item.codeData.charts.length > 0)
      .flatMap((item) => item.codeData?.charts || []);
  }, [timelineItems, state, toolInvocation]);

  if (state === 'result') {
    const { result } = toolInvocation;

    // Ensure result is not null and has the expected structure
    const researchData = result as { research: Research } | null;
    const research = researchData?.research;

    // Deduplicate sources based on URL for the final display
    const uniqueSources = Array.from(
      new Map(
        (research?.sources || []).map((s) => [
          s.url,
          {
            ...s,
            favicon:
              s.favicon ||
              `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(new URL(s.url).hostname)}`,
          },
        ]),
      ).values(),
    ).filter((source) => source && source.url);

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="space-y-4"
      >
        {/* Show the timeline view first */}
        <Card className="w-full mx-auto gap-0 py-0 mb-3 shadow-none overflow-hidden">
          <div
            className="py-2 px-3 border-b bg-neutral-50 dark:bg-neutral-900 flex justify-between items-center cursor-pointer"
            onClick={() => setResearchProcessOpen(!researchProcessOpen)}
          >
            <div className="text-xs font-medium text-neutral-800 dark:text-neutral-200 truncate">Research Process</div>
            {researchProcessOpen ? (
              <ChevronDown className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
            )}
          </div>
          <AnimatePresence>
            {researchProcessOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{
                  height: { duration: 0.2, ease: 'easeOut' },
                  opacity: { duration: 0.15 },
                }}
              >
                <CardContent className="p-3 pt-2">{renderTimeline()}</CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        {/* Show charts if any */}
        {allCharts.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-1.5 mb-2">
              <h3 className="text-xs font-medium text-neutral-800 dark:text-neutral-200">Visualizations</h3>
              <div className="text-[10px] px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded-md text-neutral-500 dark:text-neutral-400">
                {allCharts.length} chart{allCharts.length !== 1 ? 's' : ''}
              </div>
            </div>

            <div className="space-y-3">
              {allCharts.map((chart: any, index: number) => {
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: index * 0.03 }}
                    className="w-full"
                  >
                    <ExtremeChart chart={chart} />
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Then show the sources view */}
        {renderSources(uniqueSources)}

        {/* Sources Sheet */}
        <ExtremeSourcesSheet sources={uniqueSources} open={sourcesSheetOpen} onOpenChange={setSourcesSheetOpen} />
      </motion.div>
    );
  }

  // In-progress view
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{
        duration: 0.2,
        ease: 'easeOut',
      }}
    >
      <Card className="w-full mx-auto gap-0 py-0 mb-3 shadow-none overflow-hidden rounded-lg">
        <div className="py-2 px-3 border-b bg-neutral-50 dark:bg-neutral-900">
          <div className="text-xs font-medium text-neutral-800 dark:text-neutral-200 truncate">{latestStatusTitle}</div>
        </div>
        <CardContent className="p-3 pt-2">
          <AnimatePresence>
            {timelineItems.length === 0 && (state === 'call' || state === 'partial-call') && (
              <motion.div
                key="initial-loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-4 relative ml-5"
              >
                {planData ? (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-neutral-800 dark:text-neutral-200 mb-3">Research Plan</h3>
                    {planData.map((plan: any, index: number) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="relative"
                      >
                        {/* Background circle to prevent line showing through */}
                        <div
                          className="absolute w-2.5 h-2.5 rounded-full bg-white dark:bg-neutral-900 z-5"
                          style={{
                            left: '-1rem',
                            top: '6px',
                            transform: 'translateX(-50%)',
                          }}
                        />

                        {/* Status bullet */}
                        <div
                          className="absolute size-2 rounded-full bg-[#4ade80] z-10"
                          style={{
                            left: '-1rem',
                            top: '7px',
                            transform: 'translateX(-50%)',
                          }}
                        />

                        {/* Add vertical line above bullet for non-first items */}
                        {index > 0 && (
                          <div
                            className="absolute w-0.25 bg-neutral-200 dark:bg-neutral-700"
                            style={{
                              left: '-1rem',
                              top: '-12px',
                              height: '19px',
                              transform: 'translateX(-50%)',
                            }}
                          />
                        )}

                        {/* Add vertical line below bullet */}
                        <div
                          className="absolute w-0.25 bg-neutral-200 dark:bg-neutral-700"
                          style={{
                            left: '-1rem',
                            top: '9px',
                            height: index === planData.length - 1 ? '10px' : '24px',
                            transform: 'translateX(-50%)',
                          }}
                        />

                        <h3 className="text-sm text-neutral-800 dark:text-neutral-200 pl-2">{plan.title}</h3>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3 py-2">
                    <h3 className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                      Preparing Research Plan
                    </h3>
                    <Skeleton className="h-5 w-full bg-[#4ade80]/20" />
                    <Skeleton className="h-5 w-3/4 bg-[#4ade80]/20" />
                    <Skeleton className="h-5 w-5/6 bg-[#4ade80]/20" />
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
          <div
            ref={timelineContainerRef}
            className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-neutral-200 hover:scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-700 dark:hover:scrollbar-thumb-neutral-600 scrollbar-track-transparent"
          >
            {renderTimeline()}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export const ExtremeSearch = memo(ExtremeSearchComponent);
