/* eslint-disable @next/next/no-img-element */
"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { Research } from "@/ai/extreme-search";
import type { JSONValue, ToolInvocation } from "ai";
import { useEffect, useState, memo, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight, ArrowUpRight, Globe, Search } from "lucide-react";
import { TextShimmer } from "@/components/core/text-shimmer";
import { Skeleton } from "@/components/ui/skeleton";
import ReactECharts, { EChartsOption } from 'echarts-for-react';
import { useTheme } from 'next-themes';

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
  overallToolState: ToolInvocation['state']
): QueryStatus => {
  const isLastQuery = queryIndex === allQueries.length - 1;
  const sourcesPresent = queryData.sources.length > 0;
  const toolIsActive = overallToolState === "call" || overallToolState === "partial-call";

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

// Update the ExtremeChart component to be more standalone without the card wrapper
const ExtremeChart = memo(({ chart }: { chart: any }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
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
    
    const chartColors = [
      { 
        main: '#3b82f6', // blue
        secondary: '#60a5fa',
        gradient: new Array(2).fill(['#3b82f6', '#93c5fd'])
      },
      { 
        main: '#22c55e', // green
        secondary: '#4ade80',
        gradient: new Array(2).fill(['#22c55e', '#86efac']) 
      },
      { 
        main: '#f59e0b', // amber
        secondary: '#fbbf24',
        gradient: new Array(2).fill(['#f59e0b', '#fcd34d'])
      },
      { 
        main: '#8b5cf6', // violet
        secondary: '#a78bfa',
        gradient: new Array(2).fill(['#8b5cf6', '#c4b5fd'])
      },
      { 
        main: '#ec4899', // pink
        secondary: '#f472b6',
        gradient: new Array(2).fill(['#ec4899', '#f9a8d4'])
      }
    ];

    const baseOption: EChartsOption = {
      backgroundColor: isDark ? 'rgba(23, 23, 23, 0.02)' : 'rgba(255, 255, 255, 0.02)',
      grid: {
        top: isMobile ? 50 : 70,
        right: isMobile ? 20 : 30,
        bottom: isMobile ? 35 : 50,
        left: isMobile ? 45 : 70,
        containLabel: true
      },
      title: {
        text: chart.title,
        left: 'center',
        top: isMobile ? 8 : 10,
        textStyle: {
          color: isDark ? '#e5e5e5' : '#171717',
          fontSize: isMobile ? 12 : 14,
          fontWeight: 500,
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }
      },
      tooltip: {
        backgroundColor: isDark ? 'rgba(23, 23, 23, 0.9)' : 'rgba(255, 255, 255, 0.9)',
        borderWidth: 1,
        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
        textStyle: {
          color: isDark ? '#e5e5e5' : '#171717',
          fontSize: isMobile ? 10 : 11,
          fontFamily: 'system-ui, -apple-system, sans-serif'
        },
        padding: [isMobile ? 4 : 6, isMobile ? 8 : 10],
        extraCssText: 'box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); border-radius: 4px;',
        confine: true,
        enterable: false,
        hideDelay: 0,
        triggerOn: 'mousemove|click',
        alwaysShowContent: false,
        position: function(
          pos: [number, number], 
          params: any, 
          dom: HTMLElement, 
          rect: { x: number, y: number, width: number, height: number }, 
          size: { contentSize: [number, number], viewSize: [number, number] }
        ) {
          if (isMobile && dom) {
              return [size.viewSize[0] / 2 - dom.offsetWidth / 2, 10];
          }
          return null;
        }
      },
      legend: {
        show: true,
        type: 'scroll',
        top: isMobile ? 28 : 36,
        left: isMobile ? 'center' : 'auto',
        orient: isMobile ? 'horizontal' : 'horizontal',
        textStyle: {
          color: isDark ? '#a3a3a3' : '#525252',
          fontSize: isMobile ? 9 : 11,
          fontFamily: 'system-ui, -apple-system, sans-serif'
        },
        icon: 'circle',
        itemWidth: isMobile ? 6 : 8,
        itemHeight: isMobile ? 6 : 8,
        itemGap: isMobile ? 8 : 12,
        pageIconSize: isMobile ? 8 : 10,
        pageTextStyle: {
          fontSize: isMobile ? 9 : 10,
          color: isDark ? '#a3a3a3' : '#525252'
        }
      },
      animation: true,
      animationDuration: 300,
      animationEasing: 'cubicOut'
    };

    const axisStyle = {
      axisLine: {
        lineStyle: {
          color: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)',
          width: 1
        }
      },
      axisTick: {
        lineStyle: {
          color: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'
        },
        length: 4
      },
      axisLabel: {
        color: isDark ? '#a3a3a3' : '#525252',
        fontSize: isMobile ? 9 : 10,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        margin: isMobile ? 8 : 12
      },
      splitLine: {
        lineStyle: {
          color: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
          width: 1,
          type: [3, 3]
        }
      }
    };

    // Handle different chart types
    if (chart.type === 'pie') {
      return {
        ...baseOption,
        tooltip: {
          ...baseOption.tooltip,
          trigger: 'item',
          formatter: "{b}: {c} ({d}%)"
        },
        legend: {
          ...baseOption.legend,
          show: !isMobile
        },
        series: [{
          type: 'pie',
          radius: isMobile ? '60%' : '70%',
          center: ['50%', '55%'],
          data: chart.elements.map((item: any, index: number) => {
            const colorIndex = index % chartColors.length;
            return {
              name: item.label,
              value: item.angle,
              itemStyle: {
                color: chartColors[colorIndex].main,
                borderRadius: 4,
                borderColor: isDark ? '#262626' : '#ffffff',
                borderWidth: 1
              },
              emphasis: {
                itemStyle: {
                  color: chartColors[colorIndex].secondary,
                  shadowBlur: 8,
                  shadowColor: 'rgba(0, 0, 0, 0.15)'
                }
              }
            };
          }),
          label: {
            show: !isMobile,
            position: 'outer',
            alignTo: 'labelLine',
            color: isDark ? '#c7c7c7' : '#373737',
            fontSize: 10
          },
          labelLine: {
            show: !isMobile,
            length: 8,
            length2: 10
          }
        }]
      };
    }

    const commonAxisOptions = (axisName?: string) => ({
        name: isMobile ? '' : axisName,
        nameLocation: 'middle',
        nameGap: isMobile ? 25 : (chart.type === 'bar' ? 45 : (axisName?.toLowerCase().includes('y') ? 50 : 45)),
        nameTextStyle: { color: isDark ? '#a3a3a3' : '#525252', fontSize: isMobile ? 9 : 11, fontFamily: 'system-ui, -apple-system, sans-serif' },
        ...axisStyle
    });

    if (chart.type === 'line' || chart.type === 'scatter') {
      return {
        ...baseOption,
        tooltip: {
          ...baseOption.tooltip,
          trigger: 'axis',
          axisPointer: {
            type: 'cross',
            crossStyle: {
              color: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'
            },
            lineStyle: {
              color: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'
            }
          }
        },
        xAxis: {
          type: chart.x_scale === 'datetime' ? 'time' : 'value',
          ...commonAxisOptions(chart.x_label)
        },
        yAxis: {
          type: 'value',
          ...commonAxisOptions(chart.y_label)
        },
        series: chart.elements.map((element: any, index: number) => {
          const colorIndex = index % chartColors.length;           
          return {
            name: element.label,
            type: chart.type,
            data: element.points.map((point: any) => {
              const x = chart.x_scale === 'datetime' ? new Date(point[0]).getTime() : point[0];
              return [x, point[1]];
            }),
            itemStyle: {
              color: chartColors[colorIndex].main,
              borderWidth: 0
            },
            lineStyle: {
              width: 2,
              color: chartColors[colorIndex].main,
              cap: 'round',
              join: 'round'
            },
            smooth: chart.type === 'line' ? 0.15 : undefined,
            symbol: chart.type === 'scatter' ? 'circle' : (isMobile ? 'circle' : 'emptyCircle'),
            symbolSize: chart.type === 'scatter' ? (isMobile ? 5 : 8) : (isMobile ? 4 : 5),
            showSymbol: isMobile ? true : (chart.type === 'scatter'),
            emphasis: {
              focus: 'series',
              scale: false,
              itemStyle: {
                color: chartColors[colorIndex].secondary
              }
            },
            areaStyle: chart.type === 'line' ? {
              color: {
                type: 'linear',
                x: 0, y: 0, x2: 0, y2: 1,
                colorStops: [{
                  offset: 0,
                  color: `${chartColors[colorIndex].main}25`
                }, {
                  offset: 1,
                  color: `${chartColors[colorIndex].main}05`
                }]
              }
            } : undefined
          };
        })
      };
    }

    if (chart.type === 'bar') {
      // Group data by categories
      const categories = Array.from(new Set(chart.elements.map((e: any) => e.label)));
      const seriesData: Record<string, number[]> = {};
      const seriesNames = Array.from(new Set(chart.elements.map((e: any) => e.group)));
      
      seriesNames.forEach(name => {
        seriesData[name as string] = categories.map(cat => {
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
            type: 'cross',
            crossStyle: {
              color: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'
            },
            lineStyle: {
              color: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'
            }
          }
        },
        xAxis: {
          type: 'category',
          data: categories,
          ...commonAxisOptions(chart.x_label),
          axisLabel: {
            ...axisStyle.axisLabel,
            rotate: categories.length > (isMobile ? 3 : 6) ? (isMobile ? 45 : 30) : 0,
            interval: categories.length > (isMobile ? 5 : 10) ? 'auto' : 0,
            formatter: isMobile ? function (value: string) { return value.length > 5 ? value.substring(0,4) + '...': value; } : undefined
          }
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
            }
          }
        },
        series: seriesNames.map((name, index) => {
          const colorIndex = index % chartColors.length;
          return {
            name: name as string,
            type: 'bar',
            data: seriesData[name as string],
            itemStyle: {
              color: chartColors[colorIndex].main,
              borderRadius: [isMobile ? 2:3, isMobile ? 2:3, 0, 0]
            },
            emphasis: {
              itemStyle: {
                color: chartColors[colorIndex].secondary
              }
            },
            barMaxWidth: isMobile ? 25 : 35,
            barGap: '30%'
          };
        })
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
            type: 'shadow'
          },
          formatter: function (params: any) {
            const data = params.data;
            return `${params.seriesName}<br/>
                   <strong>Maximum:</strong> ${data[4]}<br/>
                   <strong>Upper Quartile:</strong> ${data[3]}<br/>
                   <strong>Median:</strong> ${data[2]}<br/>
                   <strong>Lower Quartile:</strong> ${data[1]}<br/>
                   <strong>Minimum:</strong> ${data[0]}`;
          }
        },
        xAxis: {
          type: 'category',
          data: chart.elements.map((e: any) => e.label || e.name),
          boundaryGap: true,
          splitArea: { show: false },
          ...commonAxisOptions(chart.x_label)
        },
        yAxis: {
          type: 'value',
          ...commonAxisOptions(chart.y_label)
        },
        series: [{
          name: chart.title || 'Box Plot',
          type: 'boxplot',
          data: chart.elements.map((element: any) => {
            // If data is already in boxplot format [min, Q1, median, Q3, max]
            if (Array.isArray(element.data) && element.data.length === 5) {
              return element.data;
            }
            // If data points are provided, calculate box plot values
            else if (Array.isArray(element.points)) {
              const values = element.points.map((point: any) => 
                Array.isArray(point) ? point[1] : point
              ).sort((a: number, b: number) => a - b);
              
              if (values.length === 0) return [0, 0, 0, 0, 0];
              
              const min = values[0];
              const max = values[values.length - 1];
              const median = values.length % 2 === 0 
                ? (values[values.length/2 - 1] + values[values.length/2]) / 2 
                : values[Math.floor(values.length/2)];
              
              const lowerHalf = values.slice(0, Math.floor(values.length/2));
              const upperHalf = values.length % 2 === 0 
                ? values.slice(values.length/2) 
                : values.slice(Math.floor(values.length/2) + 1);
              
              const q1 = lowerHalf.length % 2 === 0 
                ? (lowerHalf[lowerHalf.length/2 - 1] + lowerHalf[lowerHalf.length/2]) / 2 
                : lowerHalf[Math.floor(lowerHalf.length/2)];
              
              const q3 = upperHalf.length % 2 === 0 
                ? (upperHalf[upperHalf.length/2 - 1] + upperHalf[upperHalf.length/2]) / 2 
                : upperHalf[Math.floor(upperHalf.length/2)];
              
              return [min, q1, median, q3, max];
            }
            // Default empty box
            return [0, 0, 0, 0, 0];
          }),
          itemStyle: {
            color: chartColors[0].secondary,
            borderColor: chartColors[0].main,
          },
          emphasis: {
            itemStyle: {
              borderWidth: 2,
              shadowBlur: 5,
              shadowColor: 'rgba(0,0,0,0.2)'
            }
          },
          boxWidth: [isMobile ? 30 : 50],
        }]
      };
    }

    // Default case - just return base options
    return {
      ...baseOption,
      tooltip: {
        ...baseOption.tooltip,
        trigger: 'axis'
      }
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
              <div className="w-full pt-1.5 pb-1 px-1.5 h-60 sm:h-70">
        <ReactECharts
          option={chartOptions}
          style={{ height: '100%', width: '100%' }}
          theme={isDark ? 'dark' : ''}
          opts={{ renderer: 'canvas' }}
          notMerge={true}
        />
      </div>
    </motion.div>
  );
});

ExtremeChart.displayName = 'ExtremeChart';

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
  const [sourcesOpen, setSourcesOpen] = useState(true);

  const latestStatusAnnotation = useMemo(() => 
    (annotations as any[])
      ?.filter(ann => ann && (ann.status || ann.plan) && (typeof ann.status?.title === 'string' || ann.plan))
      .pop(), 
  [annotations]);

  const latestStatusTitle = latestStatusAnnotation?.status?.title || (state === "call" || state === "partial-call" ? "Thinking..." : "Processing...");

  const planData = useMemo(() => 
    (annotations as any[])?.find(ann => ann.plan)?.plan,
  [annotations]);

  const queriesWithSources: QueryBlockData[] = useMemo(() => 
    (annotations as any[])
    ?.reduce((acc: QueryBlockData[], annotation: any) => {
      if (!annotation) return acc;

      if (annotation.type === "search_query" && typeof annotation.query === 'string') {
        // Use queryId as unique identifier, fallback to query text if no id
        const queryId = annotation.queryId || `fallback-${annotation.query}`;
        if (!acc.find(q => q.queryId === queryId)) {
          acc.push({ queryId, query: annotation.query, sources: [], content: [] });
        }
      } else if (annotation.type === "source" && annotation.source && typeof annotation.source.url === 'string') {
        // Find the query by queryId if available, otherwise use the last query
        const queryId = annotation.queryId;
        const targetQuery = queryId 
          ? acc.find(q => q.queryId === queryId)
          : (acc.length > 0 ? acc[acc.length - 1] : null);
        
        if(targetQuery && !targetQuery.sources.find(s => s.url === annotation.source.url)) {
          targetQuery.sources.push({
              title: annotation.source.title || '',
              url: annotation.source.url,
              favicon: annotation.source.favicon || `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(new URL(annotation.source.url).hostname)}`
          });
        }
      } else if (annotation.type === "content" && annotation.content && typeof annotation.content.url === 'string') {
        // Find the query by queryId if available, otherwise use the last query
        const queryId = annotation.queryId;
        const targetQuery = queryId 
          ? acc.find(q => q.queryId === queryId)
          : (acc.length > 0 ? acc[acc.length - 1] : null);
        
        if(targetQuery && !targetQuery.content.find(c => c.url === annotation.content.url)) {
          targetQuery.content.push({
              title: annotation.content.title || '',
              url: annotation.content.url,
              text: annotation.content.text || '',
              favicon: annotation.content.favicon || `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(new URL(annotation.content.url).hostname)}`
          });
        }
      }
      return acc;
    }, [] as QueryBlockData[])
    || [], 
  [annotations]);
  
  const codeExecutions: CodeExecutionData[] = useMemo(() => 
    (annotations as any[])
    ?.reduce((acc: CodeExecutionData[], annotation: any) => {
      if (!annotation || !annotation.status) return acc;
      
      // Handle code execution annotations
      if (annotation.status.type === "code" && typeof annotation.status.code === 'string') {
        // Generate a unique ID for this code block
        const codeId = `code-${acc.length}`;
        if (!acc.find(c => c.code === annotation.status.code)) {
          acc.push({ 
            codeId, 
            code: annotation.status.code,
            title: annotation.status.title || 'Python Code Execution',
            status: 'running'
          });
        }
      } 
      // Handle code results
      else if (annotation.status.type === "result" && typeof annotation.status.code === 'string') {
        // Find existing code execution or add a new one
        const existingCode = acc.find(c => c.code === annotation.status.code);
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
            status: 'complete' as const
          });
        }
      }
      
      return acc;
    }, [] as CodeExecutionData[])
    || [], 
  [annotations]);

  const annotationTimestamps: Record<string, number> = useMemo(() => {
    const timestamps: Record<string, number> = {};
    (annotations as any[])?.forEach((annotation, index) => {
      if (annotation?.type === "search_query" && annotation.queryId) {
        timestamps[annotation.queryId] = index;
      }
      if (annotation?.status?.type === "code" && annotation.status.code) {
        const codeHash = annotation.status.code.length.toString();
        timestamps[`code-${codeHash}`] = index;
      }
    });
    return timestamps;
  }, [annotations]);

  const timelineItems: TimelineItemData[] = useMemo(() => {
    const items: TimelineItemData[] = [];
    
    // If we're in result state and have research data available, use that instead of annotations
    if (state === "result") {
      const { result } = toolInvocation;
      const researchData = result as { research: Research } | null;
      const research = researchData?.research;
      
      if (research) {
        // Process tool calls for web searches
        const webSearchCalls = (research.toolResults || [])
          .filter(call => call.toolName === 'webSearch')
          .map((call, index) => {
            const query = call.args?.query || '';
            const queryId = call.toolCallId;
            // Find the corresponding result
            const resultData = (research.toolResults || [])
              .find(r => r.toolCallId === call.toolCallId);
            
            // Create a QueryBlockData object similar to what we get from annotations
            return {
              queryId,
              query,
              sources: (resultData?.result || []).map((source: any) => ({
                title: source.title || '',
                url: source.url || '',
                favicon: source.favicon || `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(new URL(source.url).hostname)}`
              })),
              content: (resultData?.result || []).map((source: any) => ({
                title: source.title || '',
                url: source.url || '',
                text: source.content || '',
                favicon: source.favicon || `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(new URL(source.url).hostname)}`
              }))
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
            searchData: queryData
          });
        });
        
        // Process tool calls for code executions
        const codeCalls = (research.toolResults || [])
          .filter(call => call.toolName === 'codeRunner')
          .map((call, index) => {
            const title = call.args?.title || 'Python Code Execution';
            const code = call.args?.code || '';
            const codeId = `code-result-${index}`;
            // Find the corresponding result
            const resultData = (research.toolResults || [])
              .find(r => r.toolCallId === call.toolCallId);
            
            // Create a CodeExecutionData object
            return {
              codeId,
              code,
              title,
              result: resultData?.result?.result || '',
              charts: resultData?.result?.charts || [],
              status: 'complete' as const
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
            codeData: codeData
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
          searchData: queryData
        });
      });

      codeExecutions.forEach((codeData, index) => {
        const codeHash = codeData.code.length.toString();
        items.push({
          id: codeData.codeId,
          type: 'code',
          title: codeData.title,
          status: codeData.status === 'running' ? 'loading' : 'success',
          timestamp: annotationTimestamps[`code-${codeHash}`] || (queriesWithSources.length + index),
          codeData: codeData
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
    setExpandedItems(prev => ({ ...prev, [itemId]: !prev[itemId] }));
    
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
          const bulletColor = item.status === 'loading' 
            ? 'bg-[#4ade80] animate-[pulse_1s_ease-in-out_infinite]!' 
            : (item.status === 'success' ? 'bg-neutral-500' : 'bg-amber-500');
          
          // For search queries, check if we're reading content
          let isReadingContent = false;
          if (item.type === 'search' && item.searchData) {
            isReadingContent = (state === "call" || state === "partial-call") && 
              latestStatusAnnotation?.status?.title?.includes(`Reading content from search results for "${item.searchData.query}"`);
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
                delay: itemIndex * 0.02
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
                  height: expandedItems[item.id] ? 
                    // If this is the last item, don't extend too far when expanded
                    (itemIndex === timelineItems.length - 1 ? 'calc(100% - 8px)' : '100%') : 
                    // If not the last item, extend to connect with next item
                    (itemIndex === timelineItems.length - 1 ? '10px' : '20px'),
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
                  <span className="text-neutral-500 dark:text-neutral-400 flex-shrink-0 font-mono text-[10px]">{'{}'}</span>
                )}
                
                <span className="text-neutral-800 dark:text-neutral-200 text-xs min-w-0 flex-1">
                  {(item.status === 'loading' || isReadingContent) && state !== "result" ? (
                    <TextShimmer className="w-full" duration={1.5}>
                      {item.title}
                    </TextShimmer>
                  ) : (
                    item.title
                  )}
                </span>
                {expandedItems[item.id] ? 
                  <ChevronDown className="w-3 h-3 text-neutral-500 dark:text-neutral-400 flex-shrink-0 ml-auto" /> : 
                  <ChevronRight className="w-3 h-3 text-neutral-500 dark:text-neutral-400 flex-shrink-0 ml-auto" />
                }
              </div>

              <AnimatePresence>
                {expandedItems[item.id] && (
                  <motion.div
                    key="content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{
                      height: { duration: 0.2, ease: "easeOut" },
                      opacity: { duration: 0.15 }
                    }}
                    className="dark:border-neutral-700 overflow-hidden" 
                  >
                    <div className="pl-1 py-1">
                      {/* Search query content */}
                      {item.type === 'search' && item.searchData && (
                        <>
                          {item.searchData.sources.length > 0 && (
                            <motion.div 
                              className="flex flex-wrap gap-1 py-0.5"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 0.15 }}
                            >
                              {item.searchData.sources.map((source, index) => (
                                <motion.a 
                                  key={index} 
                                  href={source.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded-md text-[10px] hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ duration: 0.15, delay: index * 0.01 }}
                                >
                                  <img
                                    src={source.favicon}
                                    alt=""
                                    className="w-3 h-3 rounded-full"
                                    onError={(e) => {
                                      e.currentTarget.src = 'https://www.google.com/s2/favicons?sz=128&domain=example.com';
                                      (e.currentTarget as HTMLImageElement).style.filter = 'grayscale(100%)';
                                    }}
                                  />
                                  <span className="text-neutral-600 dark:text-neutral-400 truncate max-w-[110px]" title={source.title || "source"}>
                                    {source.title || "source"}
                                  </span>
                                </motion.a>
                              ))}
                            </motion.div>
                          )}
                          {(() => {
                            if (isReadingContent && item.searchData.sources.length > 0 && state !== "result") {
                              return (
                                <TextShimmer className="text-[10px] py-0.5" duration={2}>
                                  Reading content...
                                </TextShimmer>
                              );
                            } else if (item.status === 'loading' && state !== "result") { 
                              return (
                                <TextShimmer className="text-[10px] py-0.5" duration={2}>
                                  Searching sources...
                                </TextShimmer>
                              );
                            } else if (item.status === 'no_results' && item.searchData.sources.length === 0) {
                              return (
                                <p className="text-[10px] text-neutral-500 dark:text-neutral-400 py-0.5 mt-0.5">
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
                              <div className="text-[10px] text-neutral-600 dark:text-neutral-400 font-medium mb-0.5">
                                Result:
                              </div>
                              <div className="bg-neutral-100 dark:bg-neutral-800 p-2 rounded-md overflow-auto max-h-[100px] text-xs font-mono">
                                <pre className="whitespace-pre-wrap break-words">{item.codeData.result}</pre>
                              </div>
                            </div>
                          )}
                          
                          {/* Charts Block (if available) */}
                          {item.codeData.charts && item.codeData.charts.length > 0 && (
                            <div className="mt-2 mb-1 space-y-3">
                              {item.codeData.charts.map((chart, chartIndex) => (
                                <div key={chartIndex} className="w-full">
                                  <ExtremeChart chart={chart} />
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* If still running */}
                          {item.codeData.status === 'running' && state !== "result" && (
                            <TextShimmer className="text-[10px] py-0.5 mt-0.5" duration={2}>
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

  // Rendering the sources card for result state
  const renderSources = (uniqueSources: Array<any>) => (
        <Card className="w-full mx-auto gap-0 py-0 mb-3 shadow-none overflow-hidden bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800/50 rounded-lg">
          <div 
            className="flex items-center justify-between py-2 px-3 border-b border-neutral-200 dark:border-neutral-800/50 cursor-pointer"
            onClick={() => setSourcesOpen(!sourcesOpen)}
          >
            <div className="flex items-center gap-2">
                              <Globe className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
              <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100">Sources Found</p>
            </div>
            <div className="flex items-center gap-1.5">
              {uniqueSources.length > 0 && (
                <div className="flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 rounded-xl">
                  <Search className="w-3 h-3 text-neutral-500 dark:text-neutral-400" />
                  <p className="text-[10px] text-neutral-600 dark:text-neutral-300">
                    {uniqueSources.length} Result{uniqueSources.length === 1 ? '' : 's'}
                  </p>
                </div>
              )}
                              {sourcesOpen ? 
                <ChevronDown className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400 ml-1" /> : 
                <ChevronRight className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400 ml-1" />
              }
            </div>
          </div>
          <AnimatePresence>
            {sourcesOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{
                  height: { duration: 0.2, ease: "easeOut" },
                  opacity: { duration: 0.15 }
                }}
              >
                <CardContent className="p-3 pt-2">
                  {uniqueSources.length > 0 ? (
                    <div className="relative">
                      <div className="absolute right-1.5 top-0 bottom-0 w-8 bg-gradient-to-l from-white dark:from-neutral-900 via-transparent to-transparent rounded opacity-0 transition-opacity hover:opacity-100" />
                      <div className="overflow-x-auto pb-2 -mx-3 px-3 scrollbar-thin scrollbar-thumb-neutral-200 hover:scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-700 dark:hover:scrollbar-thumb-neutral-600 scrollbar-track-transparent">
                        <div className="flex flex-row gap-3 min-w-min">
                          {uniqueSources.map((source, index) => {
                            let displayTitle = "View Source";
                            let displayHostname = "";
                            if (source && source.url) {
                                try {
                                  const urlObj = new URL(source.url);
                                  displayHostname = urlObj.hostname.replace('www.', '');
                                  displayTitle = source.title || displayHostname;
                                } catch (e) {
                                  console.warn("Invalid source URL for result display:", source.url);
                                  displayTitle = source.title || source.url;
                                }
                            } else if (source && source.title) {
                                displayTitle = source.title;
                            } else if (source && source.url) {
                                displayTitle = source.url;
                            }

                        const sourceContent = timelineItems
                          .filter(item => item.type === 'search' && item.searchData)
                          .flatMap(item => 
                            item.searchData!.content.filter(c => c.url === source.url)
                            )[0]?.text || "";

                            return (
                              <motion.div
                                key={index}
                                className="flex flex-col min-w-[180px] max-w-[250px] bg-neutral-50 dark:bg-neutral-900 rounded-md overflow-hidden border border-neutral-200 dark:border-neutral-800 flex-shrink-0"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.05 }}
                              >
                                <div className="flex items-center gap-2 p-2 pb-1.5">
                                                                      <img
                                    src={source.favicon}
                                    alt=""
                                    className="w-4 h-4 rounded-full flex-shrink-0 opacity-90"
                                    onError={(e) => {
                                      e.currentTarget.src = 'https://www.google.com/s2/favicons?sz=128&domain=example.com';
                                      (e.currentTarget as HTMLImageElement).style.filter = 'grayscale(100%) brightness(150%)';
                                    }}
                                  />
                                  <span className="truncate text-neutral-900 dark:text-neutral-100 text-xs font-medium flex-1" title={displayTitle}>
                                    {displayTitle}
                                  </span>
                                </div>

                                <div className="px-3 pb-2 text-xs">
                                  <a 
                                    href={source.url} 
                                    target="_blank"
                                    rel="noopener noreferrer" 
                                    className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300 truncate flex items-center gap-1 group w-fit"
                                  >
                                    {displayHostname}
                                    <ArrowUpRight className="w-3 h-3 opacity-70 group-hover:opacity-100 transition-opacity" />
                                  </a>
                                </div>
                                
                                {sourceContent && (
                                  <div className="px-3 pb-2 text-[10px] text-neutral-600 dark:text-neutral-400 overflow-y-auto max-h-[70px] leading-relaxed scrollbar-thin scrollbar-thumb-neutral-200 hover:scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-700 dark:hover:scrollbar-thumb-neutral-600 scrollbar-track-transparent">
                                    {sourceContent.length > 250 ? 
                                      sourceContent.substring(0, 250) + "..." : 
                                      sourceContent}
                                  </div>
                                )}
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <motion.p 
                      className="text-neutral-500 dark:text-neutral-400 text-[10px]"
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

  // Collect all charts from code executions for the final result view
  const allCharts = useMemo(() => {
    if (state !== "result") return []; // Only calculate if in result state
    
    // Get charts from result data if available
    if (state === "result") {
      const { result } = toolInvocation;
      const researchData = result as { research: Research } | null;
      const research = researchData?.research;
      
      if (research && research.charts && research.charts.length > 0) {
        return research.charts;
      }
    }
    
    // Fallback to getting charts from timeline items
    return timelineItems
      .filter(item => item.type === 'code' && item.codeData?.charts && item.codeData.charts.length > 0)
      .flatMap(item => item.codeData?.charts || []);
  }, [timelineItems, state, toolInvocation]);

  if (state === "result") {
    const { result } = toolInvocation;

    // Ensure result is not null and has the expected structure
    const researchData = result as { research: Research } | null;
    const research = researchData?.research;

    // Deduplicate sources based on URL for the final display
    const uniqueSources = Array.from(
      new Map(
        (research?.sources || []).map(s => [
          s.url,
          { ...s, favicon: s.favicon || `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(new URL(s.url).hostname)}` }
        ])
      ).values()
    ).filter(source => source && source.url);

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
            <div className="text-xs font-medium text-neutral-800 dark:text-neutral-200 truncate">
              Research Process
            </div>
                          {researchProcessOpen ? 
              <ChevronDown className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" /> : 
              <ChevronRight className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
            }
          </div>
          <AnimatePresence>
            {researchProcessOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{
                  height: { duration: 0.2, ease: "easeOut" },
                  opacity: { duration: 0.15 }
                }}
              >
                <CardContent className="p-3 pt-2">
                  {renderTimeline()}
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
        
        {/* Show charts if any */}
        {allCharts.length > 0 && (
                      <div className="mb-4">
              <div className="flex items-center gap-1.5 mb-2">
                        <h3 className="text-xs font-medium text-neutral-800 dark:text-neutral-200">
                    Visualizations
                  </h3>
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
        ease: "easeOut"
      }}
    >
      <Card className="w-full mx-auto gap-0 py-0 mb-3 shadow-none overflow-hidden rounded-lg">
        <div className="py-2 px-3 border-b bg-neutral-50 dark:bg-neutral-900">
          <div className="text-xs font-medium text-neutral-800 dark:text-neutral-200 truncate">
            {latestStatusTitle}
          </div>
        </div>
        <CardContent className="p-3 pt-2">
          <AnimatePresence>
            {timelineItems.length === 0 && (state === "call" || state === "partial-call") && (
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

                        <h3 className="text-sm text-neutral-800 dark:text-neutral-200 pl-2">
                          {plan.title}
                        </h3>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3 py-2">
                    <h3 className="text-sm font-medium text-neutral-800 dark:text-neutral-200">Preparing Research Plan</h3>
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