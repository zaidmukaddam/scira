/* eslint-disable @next/next/no-img-element */
'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { useOptimizedScroll } from '@/hooks/use-optimized-scroll';
import type { extremeSearchTool, Research } from '@/lib/tools/extreme-search';
import type { UIToolInvocation } from 'ai';
import React, { useEffect, useState, memo, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronRight,
  ArrowUpRight,
  Globe,
  Search,
  ExternalLink,
  Target,
  Zap,
  Brain,
  FlaskConical,
} from 'lucide-react';
import { TextShimmer } from '@/components/core/text-shimmer';
import { Skeleton } from '@/components/ui/skeleton';
import ReactECharts, { EChartsOption } from 'echarts-for-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { DataExtremeSearchPart } from '@/lib/types';
import XSearch from '@/components/x-search';
import { XLogoIcon } from '@phosphor-icons/react/dist/ssr';

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
    // Handle composite charts separately (no options needed, handled in render)
    if (chart.type === 'composite_chart') {
      return {};
    }

    const baseOption: EChartsOption = {
      backgroundColor: 'transparent',
      grid: {
        top: isMobile ? 55 : 70,
        right: isMobile ? 25 : 35,
        bottom: isMobile ? 55 : 65,
        left: isMobile ? 55 : 70,
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
          backgroundColor: isDark ? '#1c1c1c' : '#ffffff',
          borderWidth: 0,
          shadowBlur: 16,
          shadowColor: isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.1)',
          textStyle: {
            color: isDark ? '#ffffff' : '#1a1a1a',
            fontSize: isMobile ? 11 : 12,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontWeight: 500,
          },
          padding: [12, 16],
          borderRadius: 8,
          formatter: function (params: any) {
            const percentage = params.percent % 1 === 0 ? params.percent.toFixed(0) : params.percent.toFixed(1);
            const value = typeof params.value === 'number' ? params.value.toLocaleString() : params.value;
            let result = `<div style="display: flex; align-items: center; margin-bottom: 8px;">`;
            result += `<span style="display: inline-block; width: 12px; height: 12px; background-color: ${params.color}; border-radius: 3px; margin-right: 8px; flex-shrink: 0;"></span>`;
            result += `<span style="font-weight: 600; color: ${isDark ? '#ffffff' : '#1a1a1a'}; font-size: ${isMobile ? '12px' : '13px'};">${params.name}</span>`;
            result += `</div>`;
            result += `<div style="display: flex; justify-content: space-between; align-items: center;">`;
            result += `<span style="color: ${isDark ? '#d1d5db' : '#6b7280'}; font-size: ${isMobile ? '10px' : '11px'};">Value:</span>`;
            result += `<span style="font-weight: 600; color: ${isDark ? '#ffffff' : '#1a1a1a'}; font-size: ${isMobile ? '11px' : '12px'};">${value}</span>`;
            result += `</div>`;
            result += `<div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">`;
            result += `<span style="color: ${isDark ? '#d1d5db' : '#6b7280'}; font-size: ${isMobile ? '10px' : '11px'};">Percentage:</span>`;
            result += `<span style="font-weight: 600; color: ${isDark ? '#ffffff' : '#1a1a1a'}; font-size: ${isMobile ? '11px' : '12px'};">${percentage}%</span>`;
            result += `</div>`;
            return result;
          },
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

    // Handle line charts with points data
    if (chart.type === 'line') {
      const colorPalette = Object.values(CHART_COLORS);

      return {
        ...baseOption,
        tooltip: {
          ...baseOption.tooltip,
          trigger: 'axis',
          backgroundColor: isDark ? '#1c1c1c' : '#ffffff',
          borderWidth: 0,
          shadowBlur: 16,
          shadowColor: isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.1)',
          textStyle: {
            color: isDark ? '#ffffff' : '#1a1a1a',
            fontSize: isMobile ? 11 : 12,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontWeight: 500,
          },
          padding: [12, 16],
          borderRadius: 8,
          formatter: function (params: any) {
            let axisValue = params[0].axisValueLabel;
            // Format X-axis value (remove unnecessary .0 from whole numbers like "2017.0" -> "2017")
            if (axisValue && typeof axisValue === 'string') {
              axisValue = axisValue.replace(/\.0+$/, '');
            } else if (typeof axisValue === 'number' && axisValue % 1 === 0) {
              axisValue = Math.round(axisValue).toString();
            }
            let result = `<div style="font-weight: 600; margin-bottom: 8px; color: ${isDark ? '#ffffff' : '#1a1a1a'}; font-size: ${isMobile ? '12px' : '13px'};">${axisValue}</div>`;

            params.forEach((param: any) => {
              // For line charts, param.value is [x, y] array - we want the y value
              let displayValue;
              if (Array.isArray(param.value) && param.value.length >= 2) {
                displayValue = typeof param.value[1] === 'number' ? param.value[1].toLocaleString() : param.value[1];
              } else {
                displayValue = typeof param.value === 'number' ? param.value.toLocaleString() : param.value;
              }

              result += `<div style="display: flex; align-items: center; margin-bottom: 4px;">`;
              result += `<span style="display: inline-block; width: 8px; height: 8px; background-color: ${param.color}; border-radius: 50%; margin-right: 8px; flex-shrink: 0;"></span>`;
              result += `<span style="color: ${isDark ? '#d1d5db' : '#6b7280'}; margin-right: 8px; font-size: ${isMobile ? '10px' : '11px'};">${param.seriesName}:</span>`;
              result += `<span style="font-weight: 600; color: ${isDark ? '#ffffff' : '#1a1a1a'}; font-size: ${isMobile ? '11px' : '12px'};">${displayValue}</span>`;
              result += `</div>`;
            });

            return result;
          },
        },
        xAxis: {
          type: 'value',
          name: chart.x_label || '',
          nameLocation: 'middle',
          nameGap: isMobile ? 25 : 30,
          nameTextStyle: {
            color: isDark ? '#d4d4d4' : '#525252',
            fontSize: isMobile ? 9 : 10,
            fontFamily: 'system-ui, -apple-system, sans-serif',
          },
          // Smart axis scaling - start from nearby values, not zero
          scale: true,
          ...axisStyle,
          // Prevent label overlapping
          axisLabel: {
            ...axisStyle.axisLabel,
            interval: 'auto',
            rotate: isMobile ? 45 : 0,
            formatter: function (value: number) {
              // Don't format years (4-digit numbers like 2017, 2018)
              if (value >= 1900 && value <= 2100 && value % 1 === 0) {
                return value.toString();
              }
              // Format large numbers with K/M
              if (value >= 1000000) {
                const millions = value / 1000000;
                return (millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)) + 'M';
              } else if (value >= 10000) {
                const thousands = value / 1000;
                return (thousands % 1 === 0 ? thousands.toFixed(0) : thousands.toFixed(1)) + 'K';
              }
              return value.toString();
            },
          },
        },
        yAxis: {
          type: 'value',
          name: chart.y_label || '',
          nameLocation: 'middle',
          nameGap: isMobile ? 35 : 40,
          nameRotate: 90,
          nameTextStyle: {
            color: isDark ? '#d4d4d4' : '#525252',
            fontSize: isMobile ? 9 : 10,
            fontFamily: 'system-ui, -apple-system, sans-serif',
          },
          // Smart axis scaling - start from nearby values, not zero
          scale: true,
          ...axisStyle,
          // Prevent label overlapping
          axisLabel: {
            ...axisStyle.axisLabel,
            formatter: function (value: number) {
              // Format numbers nicely - use K for thousands, M for millions
              if (value >= 1000000) {
                const millions = value / 1000000;
                return (millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)) + 'M';
              } else if (value >= 1000) {
                const thousands = value / 1000;
                return (thousands % 1 === 0 ? thousands.toFixed(0) : thousands.toFixed(1)) + 'K';
              }
              return value.toString();
            },
          },
        },
        series:
          chart.elements?.map((element: any, index: number) => {
            const colorSet = colorPalette[index % colorPalette.length];
            return {
              name: element.label,
              type: 'line',
              data: element.points || [],
              smooth: false,
              symbol: 'circle',
              symbolSize: isMobile ? 4 : 6,
              lineStyle: {
                width: isMobile ? 2 : 3,
                color: colorSet[0],
              },
              itemStyle: {
                color: colorSet[0],
                borderColor: isDark ? '#262626' : '#ffffff',
                borderWidth: 1,
              },
              emphasis: {
                itemStyle: {
                  color: colorSet[1],
                  shadowBlur: 8,
                  shadowColor: `rgba(0, 0, 0, ${isDark ? '0.4' : '0.2'})`,
                },
              },
            };
          }) || [],
      };
    }

    // Handle bar charts
    if (chart.type === 'bar') {
      const colorPalette = Object.values(CHART_COLORS);

      return {
        ...baseOption,
        tooltip: {
          ...baseOption.tooltip,
          trigger: 'axis',
          backgroundColor: isDark ? '#1c1c1c' : '#ffffff',
          borderWidth: 0,
          shadowBlur: 16,
          shadowColor: isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.1)',
          textStyle: {
            color: isDark ? '#ffffff' : '#1a1a1a',
            fontSize: isMobile ? 11 : 12,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontWeight: 500,
          },
          padding: [12, 16],
          borderRadius: 8,
          formatter: function (params: any) {
            let result = `<div style="font-weight: 600; margin-bottom: 8px; color: ${isDark ? '#ffffff' : '#1a1a1a'}; font-size: ${isMobile ? '12px' : '13px'};">${params[0].name}</div>`;

            params.forEach((param: any) => {
              const value = typeof param.value === 'number' ? param.value.toLocaleString() : param.value;
              result += `<div style="display: flex; align-items: center; margin-bottom: 4px;">`;
              result += `<span style="display: inline-block; width: 8px; height: 8px; background-color: ${param.color}; border-radius: 2px; margin-right: 8px; flex-shrink: 0;"></span>`;
              result += `<span style="color: ${isDark ? '#d1d5db' : '#6b7280'}; margin-right: 8px; font-size: ${isMobile ? '10px' : '11px'};">${param.seriesName}:</span>`;
              result += `<span style="font-weight: 600; color: ${isDark ? '#ffffff' : '#1a1a1a'}; font-size: ${isMobile ? '11px' : '12px'};">${value}</span>`;
              result += `</div>`;
            });

            return result;
          },
        },
        xAxis: {
          type: 'category',
          name: chart.x_label || '',
          nameLocation: 'middle',
          nameGap: isMobile ? 25 : 30,
          nameTextStyle: {
            color: isDark ? '#d4d4d4' : '#525252',
            fontSize: isMobile ? 9 : 10,
            fontFamily: 'system-ui, -apple-system, sans-serif',
          },
          data: chart.x_tick_labels || chart.elements?.map((el: any) => el.label) || [],
          ...axisStyle,
        },
        yAxis: {
          type: 'value',
          name: chart.y_label || '',
          nameLocation: 'middle',
          nameGap: isMobile ? 35 : 40,
          nameRotate: 90,
          nameTextStyle: {
            color: isDark ? '#d4d4d4' : '#525252',
            fontSize: isMobile ? 9 : 10,
            fontFamily: 'system-ui, -apple-system, sans-serif',
          },
          // Smart axis scaling - start from nearby values, not zero
          scale: true,
          ...axisStyle,
          // Prevent label overlapping
          axisLabel: {
            ...axisStyle.axisLabel,
            formatter: function (value: number) {
              // Format numbers nicely - use K for thousands, M for millions
              if (value >= 1000000) {
                const millions = value / 1000000;
                return (millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)) + 'M';
              } else if (value >= 1000) {
                const thousands = value / 1000;
                return (thousands % 1 === 0 ? thousands.toFixed(0) : thousands.toFixed(1)) + 'K';
              }
              return value.toString();
            },
          },
        },
        series: [
          {
            name: chart.title || 'Data',
            type: 'bar',
            data: chart.elements?.map((element: any) => element.value) || [],
            itemStyle: {
              color: colorPalette[0][0],
              borderRadius: [4, 4, 0, 0],
            },
            emphasis: {
              itemStyle: {
                color: colorPalette[0][1],
                shadowBlur: 8,
                shadowColor: `rgba(0, 0, 0, ${isDark ? '0.4' : '0.2'})`,
              },
            },
            barWidth: isMobile ? '60%' : '50%',
          },
        ],
      };
    }

    // Handle scatter charts
    if (chart.type === 'scatter') {
      const colorPalette = Object.values(CHART_COLORS);

      return {
        ...baseOption,
        tooltip: {
          ...baseOption.tooltip,
          trigger: 'item',
          backgroundColor: isDark ? '#1c1c1c' : '#ffffff',
          borderWidth: 0,
          shadowBlur: 16,
          shadowColor: isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.1)',
          textStyle: {
            color: isDark ? '#ffffff' : '#1a1a1a',
            fontSize: isMobile ? 11 : 12,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontWeight: 500,
          },
          padding: [12, 16],
          borderRadius: 8,
          formatter: function (params: any) {
            let result = `<div style="font-weight: 600; margin-bottom: 8px; color: ${isDark ? '#ffffff' : '#1a1a1a'}; font-size: ${isMobile ? '12px' : '13px'};">${params.seriesName}</div>`;

            const xValue = Array.isArray(params.value) ? params.value[0] : params.value;
            const yValue = Array.isArray(params.value) ? params.value[1] : params.value;

            result += `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">`;
            result += `<span style="color: ${isDark ? '#d1d5db' : '#6b7280'}; font-size: ${isMobile ? '10px' : '11px'};">X:</span>`;
            result += `<span style="font-weight: 600; color: ${isDark ? '#ffffff' : '#1a1a1a'}; font-size: ${isMobile ? '11px' : '12px'};">${typeof xValue === 'number' ? xValue.toLocaleString() : xValue}</span>`;
            result += `</div>`;
            result += `<div style="display: flex; justify-content: space-between; align-items: center;">`;
            result += `<span style="color: ${isDark ? '#d1d5db' : '#6b7280'}; font-size: ${isMobile ? '10px' : '11px'};">Y:</span>`;
            result += `<span style="font-weight: 600; color: ${isDark ? '#ffffff' : '#1a1a1a'}; font-size: ${isMobile ? '11px' : '12px'};">${typeof yValue === 'number' ? yValue.toLocaleString() : yValue}</span>`;
            result += `</div>`;

            return result;
          },
        },
        xAxis: {
          type: 'value',
          name: chart.x_label || '',
          nameLocation: 'middle',
          nameGap: isMobile ? 25 : 30,
          nameTextStyle: {
            color: isDark ? '#d4d4d4' : '#525252',
            fontSize: isMobile ? 9 : 10,
            fontFamily: 'system-ui, -apple-system, sans-serif',
          },
          scale: true,
          ...axisStyle,
          axisLabel: {
            ...axisStyle.axisLabel,
            formatter: function (value: number) {
              if (value >= 1900 && value <= 2100 && value % 1 === 0) {
                return value.toString();
              }
              if (value >= 1000000) {
                const millions = value / 1000000;
                return (millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)) + 'M';
              } else if (value >= 10000) {
                const thousands = value / 1000;
                return (thousands % 1 === 0 ? thousands.toFixed(0) : thousands.toFixed(1)) + 'K';
              }
              return value.toString();
            },
          },
        },
        yAxis: {
          type: 'value',
          name: chart.y_label || '',
          nameLocation: 'middle',
          nameGap: isMobile ? 35 : 40,
          nameRotate: 90,
          nameTextStyle: {
            color: isDark ? '#d4d4d4' : '#525252',
            fontSize: isMobile ? 9 : 10,
            fontFamily: 'system-ui, -apple-system, sans-serif',
          },
          scale: true,
          ...axisStyle,
          axisLabel: {
            ...axisStyle.axisLabel,
            formatter: function (value: number) {
              if (value >= 1000000) {
                const millions = value / 1000000;
                return (millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)) + 'M';
              } else if (value >= 1000) {
                const thousands = value / 1000;
                return (thousands % 1 === 0 ? thousands.toFixed(0) : thousands.toFixed(1)) + 'K';
              }
              return value.toString();
            },
          },
        },
        series:
          chart.elements?.map((element: any, index: number) => {
            const colorSet = colorPalette[index % colorPalette.length];
            return {
              name: element.label || `Series ${index + 1}`,
              type: 'scatter',
              data: element.points || element.data || [],
              symbolSize: isMobile ? 6 : 8,
              itemStyle: {
                color: colorSet[0],
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
          }) || [],
      };
    }

    // Handle box and whisker charts
    if (chart.type === 'box_and_whisker') {
      const colorPalette = Object.values(CHART_COLORS);

      return {
        ...baseOption,
        tooltip: {
          ...baseOption.tooltip,
          trigger: 'item',
          backgroundColor: isDark ? '#1c1c1c' : '#ffffff',
          borderWidth: 0,
          shadowBlur: 16,
          shadowColor: isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.1)',
          textStyle: {
            color: isDark ? '#ffffff' : '#1a1a1a',
            fontSize: isMobile ? 11 : 12,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontWeight: 500,
          },
          padding: [12, 16],
          borderRadius: 8,
          formatter: function (params: any) {
            let result = `<div style="font-weight: 600; margin-bottom: 8px; color: ${isDark ? '#ffffff' : '#1a1a1a'}; font-size: ${isMobile ? '12px' : '13px'};">${params.name}</div>`;

            if (Array.isArray(params.value) && params.value.length >= 5) {
              const [min, q1, median, q3, max] = params.value;
              const stats = [
                ['Min', min],
                ['Q1', q1],
                ['Median', median],
                ['Q3', q3],
                ['Max', max],
              ];

              stats.forEach(([label, value]) => {
                result += `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">`;
                result += `<span style="color: ${isDark ? '#d1d5db' : '#6b7280'}; font-size: ${isMobile ? '10px' : '11px'};">${label}:</span>`;
                result += `<span style="font-weight: 600; color: ${isDark ? '#ffffff' : '#1a1a1a'}; font-size: ${isMobile ? '11px' : '12px'};">${typeof value === 'number' ? value.toLocaleString() : value}</span>`;
                result += `</div>`;
              });
            }

            return result;
          },
        },
        xAxis: {
          type: 'category',
          name: chart.x_label || '',
          nameLocation: 'middle',
          nameGap: isMobile ? 25 : 30,
          nameTextStyle: {
            color: isDark ? '#d4d4d4' : '#525252',
            fontSize: isMobile ? 9 : 10,
            fontFamily: 'system-ui, -apple-system, sans-serif',
          },
          data: chart.x_tick_labels || chart.elements?.map((el: any) => el.label) || [],
          ...axisStyle,
        },
        yAxis: {
          type: 'value',
          name: chart.y_label || '',
          nameLocation: 'middle',
          nameGap: isMobile ? 35 : 40,
          nameRotate: 90,
          nameTextStyle: {
            color: isDark ? '#d4d4d4' : '#525252',
            fontSize: isMobile ? 9 : 10,
            fontFamily: 'system-ui, -apple-system, sans-serif',
          },
          scale: true,
          ...axisStyle,
          axisLabel: {
            ...axisStyle.axisLabel,
            formatter: function (value: number) {
              if (value >= 1000000) {
                const millions = value / 1000000;
                return (millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)) + 'M';
              } else if (value >= 1000) {
                const thousands = value / 1000;
                return (thousands % 1 === 0 ? thousands.toFixed(0) : thousands.toFixed(1)) + 'K';
              }
              return value.toString();
            },
          },
        },
        series: [
          {
            name: chart.title || 'Box Plot',
            type: 'boxplot',
            data:
              chart.elements?.map((element: any) => {
                // Handle different data formats for box plots
                if (element.boxplot_data) {
                  return element.boxplot_data; // [min, q1, median, q3, max]
                } else if (element.values) {
                  return element.values; // Raw values that ECharts will process
                } else if (element.data) {
                  return element.data;
                }
                return element.value || [];
              }) || [],
            itemStyle: {
              color: colorPalette[0][0],
              borderColor: colorPalette[0][0],
              borderWidth: 2,
            },
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowColor: `rgba(0, 0, 0, ${isDark ? '0.4' : '0.2'})`,
              },
            },
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
      className="bg-background border border-border rounded-lg shadow-none overflow-hidden h-full"
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

// Types for Extreme Search
interface ExtremeSearchSource {
  title: string;
  url: string;
  content: string; // 🔧 FIX: Content is always provided by the tool, should not be optional
  favicon?: string;
  publishedDate?: string;
  published_date?: string;
  author?: string;
}

// Utility function for favicon (matching multi-search)
const getFaviconUrl = (url: string) => {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?sz=128&domain=${domain}`;
  } catch {
    return null;
  }
};

// Source Card Component for Extreme Search (matching multi-search design)
const ExtremeSourceCard: React.FC<{
  source: ExtremeSearchSource;
  onClick?: () => void;
}> = ({ source, onClick }) => {
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const faviconUrl = source.favicon || getFaviconUrl(source.url);

  let hostname = '';
  try {
    hostname = new URL(source.url).hostname.replace('www.', '');
  } catch {
    hostname = source.url;
  }

  return (
    <div
      className={cn(
        'group relative bg-background',
        'border border-neutral-200 dark:border-neutral-800',
        'rounded-xl p-4 transition-all duration-200',
        'hover:border-neutral-300 dark:hover:border-neutral-700',
        onClick && 'cursor-pointer',
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="relative w-10 h-10 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center overflow-hidden shrink-0">
          {!imageLoaded && <div className="absolute inset-0 animate-pulse" />}
          {faviconUrl ? (
            <img
              src={faviconUrl}
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
            {source.author && (
              <>
                <span>•</span>
                <span className="truncate">{source.author}</span>
              </>
            )}
            <ExternalLink className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </div>

      {/* Content */}
      <p className="text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2 leading-relaxed">
        {source.content || 'Loading content...'}
      </p>
    </div>
  );
};

// Sources Sheet Component for Extreme Search
const ExtremeSourcesSheet: React.FC<{
  sources: ExtremeSearchSource[];
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
                <a key={index} href={source.url} target="_blank" className="block">
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

interface SearchQuery {
  id: string;
  query: string;
  status: 'started' | 'reading_content' | 'completed' | 'error';
  sources: ExtremeSearchSource[];
  content: Array<{ title: string; url: string; text: string; favicon?: string }>;
}

interface CodeExecution {
  id: string;
  title: string;
  code: string;
  status: 'running' | 'completed' | 'error';
  result?: string;
  charts?: any[];
}

interface XSearchExecution {
  id: string;
  query: string;
  startDate: string;
  endDate: string;
  handles?: string[];
  status: 'started' | 'completed' | 'error';
  result?: {
    content: string;
    citations: any[];
    sources: Array<{ text: string; link: string; title?: string }>;
    dateRange: string;
    handles: string[];
  };
}

const ExtremeSearchComponent = ({
  toolInvocation,
  annotations,
}: {
  toolInvocation: UIToolInvocation<ReturnType<typeof extremeSearchTool>>;
  annotations?: DataExtremeSearchPart[];
}) => {
  const { state } = toolInvocation;
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [userExpandedItems, setUserExpandedItems] = useState<Record<string, boolean>>({});
  const [researchProcessOpen, setResearchProcessOpen] = useState(false);
  const [sourcesAccordionOpen, setSourcesAccordionOpen] = useState(true);
  const [sourcesSheetOpen, setSourcesSheetOpen] = useState(false);
  const [visualizationsOpen, setVisualizationsOpen] = useState(true);

  // Timeline container ref for auto-scroll
  const timelineRef = useRef<HTMLDivElement>(null);
  const { scrollToBottom, markManualScroll, resetManualScroll } = useOptimizedScroll(timelineRef);

  // Check if we're in final result state
  const isCompleted = useMemo(() => {
    // First check if tool has output
    if ('output' in toolInvocation) {
      return true;
    }

    // Also check if annotations indicate completion
    if (annotations?.length) {
      const planAnnotations = annotations.filter(
        (ann) => ann.type === 'data-extreme_search' && ann.data.kind === 'plan',
      );
      const latestPlan = planAnnotations[planAnnotations.length - 1];
      const isResearchCompleted =
        latestPlan?.data?.kind === 'plan' && latestPlan.data.status?.title === 'Research completed';

      if (isResearchCompleted) {
        return true;
      }
    }

    return false;
  }, [toolInvocation, annotations]);

  // Extract current status and plan from annotations
  const { currentStatus, planData } = useMemo(() => {
    // Check if we're completed first
    if (isCompleted) {
      return { currentStatus: 'Research completed', planData: null };
    }

    if (!annotations?.length) {
      return {
        currentStatus:
          state === 'input-streaming' || state === 'input-available' ? 'Processing research...' : 'Initializing...',
        planData: null,
      };
    }

    // Get the latest plan annotation for plan data
    const planAnnotations = annotations.filter((ann) => ann.type === 'data-extreme_search' && ann.data.kind === 'plan');

    const latestPlan = planAnnotations[planAnnotations.length - 1];
    const plan = latestPlan?.data.kind === 'plan' && 'plan' in latestPlan.data ? latestPlan.data.plan : null;

    // Derive dynamic status from current tool states (query, x_search, code)
    const toolAnnotations = annotations.filter(
      (ann) =>
        ann.type === 'data-extreme_search' &&
        (ann.data.kind === 'query' || ann.data.kind === 'x_search' || ann.data.kind === 'code'),
    );

    let dynamicStatus = 'Processing research...';

    if (toolAnnotations.length > 0) {
      // Get the latest tool annotation
      const latestTool = toolAnnotations[toolAnnotations.length - 1];
      const data = latestTool.data;

      if (data.kind === 'query') {
        const queryStatus = data.status;
        const queryText = data.query;

        switch (queryStatus) {
          case 'started':
            dynamicStatus = `Searching: "${queryText}"`;
            break;
          case 'reading_content':
            dynamicStatus = `Reading content for: "${queryText}"`;
            break;
          case 'completed':
            dynamicStatus = 'Analyzing results...';
            break;
          default:
            dynamicStatus = 'Processing research...';
        }
      } else if (data.kind === 'x_search') {
        const xSearchStatus = data.status;
        const queryText = data.query;

        switch (xSearchStatus) {
          case 'started':
            dynamicStatus = `Searching X posts: "${queryText}"`;
            break;
          case 'completed':
            dynamicStatus = 'Analyzing X search results...';
            break;
          case 'error':
            dynamicStatus = 'X search encountered an error';
            break;
          default:
            dynamicStatus = 'Processing X search...';
        }
      } else if (data.kind === 'code') {
        const codeStatus = data.status;
        const title = data.title;

        switch (codeStatus) {
          case 'running':
            dynamicStatus = `Executing: "${title}"`;
            break;
          case 'completed':
            dynamicStatus = 'Code execution completed';
            break;
          case 'error':
            dynamicStatus = 'Code execution encountered an error';
            break;
          default:
            dynamicStatus = 'Processing code execution...';
        }
      }
    } else {
      // Fallback to plan status if no tool annotations yet
      const planStatus = latestPlan?.data?.kind === 'plan' && latestPlan.data.status?.title;
      dynamicStatus = planStatus || 'Processing research...';
    }

    return {
      currentStatus: dynamicStatus,
      planData: plan,
    };
  }, [annotations, toolInvocation, state, isCompleted]);

  // Extract search queries from the ACTUAL tool invocation structure
  const searchQueries = useMemo(() => {
    // Check if we have results in the completed tool
    if ('output' in toolInvocation) {
      const { output } = toolInvocation;
      const researchData = output as { research?: Research } | null;

      if (researchData?.research?.toolResults) {
        const webSearchResults = researchData.research.toolResults.filter((result) => result.toolName === 'webSearch');

        return webSearchResults.map((result, index) => {
          const query = result.args?.query || result.input?.query || `Query ${index + 1}`;

          const sources = (result.result || result.output || []).map((source: any) => ({
            title: source.title || '',
            url: source.url || '',
            content: source.content || '', // 🔧 FIX: Include content from tool results
            publishedDate: source.publishedDate || '',
            favicon:
              source.favicon ||
              `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(new URL(source.url || 'example.com').hostname)}`,
          }));

          return {
            id: result.toolCallId || `query-${index}`,
            query,
            status: 'completed' as const,
            sources,
            content: [],
          };
        });
      }
    }

    // For in-progress, try to extract from annotations
    if (annotations?.length) {
      const queryMap = new Map<string, SearchQuery>();

      annotations.forEach((ann) => {
        if (ann.type !== 'data-extreme_search') return;

        const { data } = ann;

        if (data.kind === 'query') {
          // Either create new query or update existing one
          const existingQuery = queryMap.get(data.queryId);
          if (existingQuery) {
            // Update existing query status
            existingQuery.status = data.status;
          } else {
            // Create new query
            queryMap.set(data.queryId, {
              id: data.queryId,
              query: data.query,
              status: data.status,
              sources: [],
              content: [],
            });
          }
        } else if (data.kind === 'source' && data.source) {
          const query = queryMap.get(data.queryId);
          if (query && !query.sources.find((s) => s.url === data.source.url)) {
            query.sources.push({
              title: data.source.title || '',
              url: data.source.url,
              content: '', // 🔧 Initialize with empty content, will be populated by content annotations
              favicon:
                data.source.favicon ||
                `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(new URL(data.source.url).hostname)}`,
            });
          }
        } else if (data.kind === 'content' && data.content) {
          const query = queryMap.get(data.queryId);
          if (query && !query.content.find((c) => c.url === data.content.url)) {
            query.content.push({
              title: data.content.title || '',
              url: data.content.url,
              text: data.content.text || '',
              favicon:
                data.content.favicon ||
                `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(new URL(data.content.url).hostname)}`,
            });
          }
        }
      });

      const queries = Array.from(queryMap.values());

      // 🔧 MERGE content data into sources for each query
      queries.forEach((query) => {
        query.sources.forEach((source) => {
          const matchingContent = query.content.find((c) => c.url === source.url);
          if (matchingContent && matchingContent.text) {
            source.content = matchingContent.text;
          }
        });
      });

      return queries;
    }

    return [];
  }, [toolInvocation, annotations]);

  // Extract X search executions from the ACTUAL tool invocation structure
  const xSearchExecutions = useMemo(() => {
    // Check if we have results in the completed tool
    if ('output' in toolInvocation) {
      const { output } = toolInvocation;
      const researchData = output as { research?: Research } | null;

      if (researchData?.research?.toolResults) {
        const xSearchResults = researchData.research.toolResults.filter((result) => result.toolName === 'xSearch');

        return xSearchResults.map((result, index) => {
          const query = result.args?.query || result.input?.query || `X Search ${index + 1}`;
          const startDate = result.args?.startDate || result.input?.startDate || '';
          const endDate = result.args?.endDate || result.input?.endDate || '';
          const handles = result.args?.xHandles || result.input?.xHandles || [];
          const resultData = result.result || result.output || null;

          return {
            id: result.toolCallId || `x-search-${index}`,
            query,
            startDate,
            endDate,
            handles,
            status: 'completed' as const,
            result: resultData,
          };
        });
      }
    }

    // For in-progress, try to extract from annotations
    if (annotations?.length) {
      const xSearchMap = new Map<string, XSearchExecution>();

      annotations.forEach((ann) => {
        if (ann.type !== 'data-extreme_search' || ann.data.kind !== 'x_search') return;

        const { data } = ann;
        xSearchMap.set(data.xSearchId, {
          id: data.xSearchId,
          query: data.query,
          startDate: data.startDate,
          endDate: data.endDate,
          handles: data.handles,
          status: data.status,
          result: data.result,
        });
      });

      return Array.from(xSearchMap.values());
    }

    return [];
  }, [toolInvocation, annotations]);

  // Extract code executions from the ACTUAL tool invocation structure
  const codeExecutions = useMemo(() => {
    // Check if we have results in the completed tool
    if ('output' in toolInvocation) {
      const { output } = toolInvocation;
      const researchData = output as { research?: Research } | null;

      if (researchData?.research?.toolResults) {
        const codeResults = researchData.research.toolResults.filter((result) => result.toolName === 'codeRunner');

        return codeResults.map((result, index) => {
          const title = result.args?.title || result.input?.title || `Code Execution ${index + 1}`;
          const code = result.args?.code || result.input?.code || '';
          const resultData = result.result || result.output || {};

          return {
            id: result.toolCallId || `code-${index}`,
            title,
            code,
            status: 'completed' as const,
            result: resultData.result || '',
            charts: resultData.charts || [],
          };
        });
      }
    }

    // For in-progress, try to extract from annotations
    if (annotations?.length) {
      const codeMap = new Map<string, CodeExecution>();

      annotations.forEach((ann) => {
        if (ann.type !== 'data-extreme_search' || ann.data.kind !== 'code') return;

        const { data } = ann;
        codeMap.set(data.codeId, {
          id: data.codeId,
          title: data.title,
          code: data.code,
          status: data.status,
          result: data.result,
          charts: data.charts,
        });
      });

      return Array.from(codeMap.values());
    }

    return [];
  }, [toolInvocation, annotations]);

  // Build a single chronological list for the timeline
  type TimelineItem =
    | { kind: 'query'; item: SearchQuery }
    | { kind: 'x_search'; item: XSearchExecution }
    | { kind: 'code'; item: CodeExecution };

  const combinedTimelineItems = useMemo<TimelineItem[]>(() => {
    // Completed state: preserve order from toolResults
    if (isCompleted && 'output' in toolInvocation) {
      const { output } = toolInvocation;
      const researchData = output as { research?: Research } | null;
      const toolResults = researchData?.research?.toolResults || [];

      return toolResults
        .map((tr: any): TimelineItem | null => {
          if (tr.toolName === 'webSearch') {
            const sources = (tr.result || tr.output || []).map((source: any) => ({
              title: source.title || '',
              url: source.url || '',
              content: source.content || '',
              publishedDate: source.publishedDate || '',
              favicon:
                source.favicon ||
                `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(new URL(source.url || 'example.com').hostname)}`,
            }));
            const query: SearchQuery = {
              id: tr.toolCallId || `query-${Math.random().toString(36).slice(2)}`,
              query: tr.args?.query || tr.input?.query || 'Search',
              status: 'completed',
              sources,
              content: [],
            };
            return { kind: 'query', item: query };
          }
          if (tr.toolName === 'xSearch') {
            const xItem: XSearchExecution = {
              id: tr.toolCallId || `x-${Math.random().toString(36).slice(2)}`,
              query: tr.args?.query || tr.input?.query || 'X search',
              startDate: tr.args?.startDate || tr.input?.startDate || '',
              endDate: tr.args?.endDate || tr.input?.endDate || '',
              handles: tr.args?.xHandles || tr.input?.xHandles || [],
              status: 'completed',
              result: tr.result || tr.output || undefined,
            };
            return { kind: 'x_search', item: xItem };
          }
          if (tr.toolName === 'codeRunner') {
            const codeItem: CodeExecution = {
              id: tr.toolCallId || `code-${Math.random().toString(36).slice(2)}`,
              title: tr.args?.title || tr.input?.title || 'Code Execution',
              code: tr.args?.code || tr.input?.code || '',
              status: 'completed',
              result: (tr.result || tr.output || {}).result || '',
              charts: (tr.result || tr.output || {}).charts || [],
            };
            return { kind: 'code', item: codeItem };
          }
          return null;
        })
        .filter(Boolean) as TimelineItem[];
    }

    // In-progress: order by annotations arrival
    if (annotations?.length) {
      const seen: Record<string, boolean> = {};
      const items: TimelineItem[] = [];
      for (const ann of annotations) {
        if (ann.type !== 'data-extreme_search') continue;
        const d = ann.data as any;
        if (d.kind === 'query') {
          const q = searchQueries.find((sq) => sq.id === d.queryId);
          if (q && !seen[`q:${q.id}`]) {
            items.push({ kind: 'query', item: q });
            seen[`q:${q.id}`] = true;
          }
        } else if (d.kind === 'x_search') {
          const x = xSearchExecutions.find((xe) => xe.id === d.xSearchId);
          if (x && !seen[`x:${x.id}`]) {
            items.push({ kind: 'x_search', item: x });
            seen[`x:${x.id}`] = true;
          }
        } else if (d.kind === 'code') {
          const c = codeExecutions.find((ce) => ce.id === d.codeId);
          if (c && !seen[`c:${c.id}`]) {
            items.push({ kind: 'code', item: c });
            seen[`c:${c.id}`] = true;
          }
        }
      }
      if (items.length === 0) {
        return [
          ...searchQueries.map((q) => ({ kind: 'query', item: q }) as TimelineItem),
          ...xSearchExecutions.map((x) => ({ kind: 'x_search', item: x }) as TimelineItem),
          ...codeExecutions.map((c) => ({ kind: 'code', item: c }) as TimelineItem),
        ];
      }
      return items;
    }

    return [
      ...searchQueries.map((q) => ({ kind: 'query', item: q }) as TimelineItem),
      ...xSearchExecutions.map((x) => ({ kind: 'x_search', item: x }) as TimelineItem),
      ...codeExecutions.map((c) => ({ kind: 'code', item: c }) as TimelineItem),
    ];
  }, [isCompleted, toolInvocation, annotations, searchQueries, xSearchExecutions, codeExecutions]);

  // Auto-scroll effects
  useEffect(() => {
    // Reset manual scroll when new search starts
    if (state === 'input-streaming' || state === 'input-available') {
      resetManualScroll();
    }
  }, [state, resetManualScroll]);

  useEffect(() => {
    // Auto-scroll when new timeline items are added during streaming
    if (combinedTimelineItems.length > 0 && (state === 'input-streaming' || state === 'input-available')) {
      scrollToBottom();
    }
  }, [combinedTimelineItems.length, state, scrollToBottom]);

  // Get all sources for final result view
  const allSources = useMemo(() => {
    if (isCompleted && 'output' in toolInvocation) {
      // Completed with tool output
      const { output } = toolInvocation;
      const researchData = output as { research?: Research } | null;
      const research = researchData?.research;

      if (research?.sources?.length) {
        return research.sources.map((s) => ({
          ...s,
          favicon:
            s.favicon ||
            `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(new URL(s.url).hostname)}`,
        }));
      }

      if (research?.toolResults) {
        return research.toolResults
          .filter((result) => result.toolName === 'webSearch')
          .flatMap((result) =>
            (result.result || result.output || []).map((source: any) => ({
              title: source.title || '',
              url: source.url || '',
              content: source.content || '',
              publishedDate: source.publishedDate || '',
              favicon:
                source.favicon ||
                `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(new URL(source.url || 'example.com').hostname)}`,
            })),
          );
      }
    }

    // Use sources from search queries (whether completed or not)
    const querySources = searchQueries.flatMap((q) => q.sources);

    // Remove duplicates by URL
    return Array.from(new Map(querySources.map((s) => [s.url, s])).values());
  }, [isCompleted, toolInvocation, searchQueries]);

  // Get all charts for final result view
  const allCharts = useMemo(() => {
    if (isCompleted && 'output' in toolInvocation) {
      const { output } = toolInvocation;
      const researchData = output as { research: Research } | null;
      const research = researchData?.research;

      if (research?.charts?.length) {
        return research.charts;
      }
    }

    // Use charts from code executions (whether completed or not)
    return codeExecutions.flatMap((c) => c.charts || []);
  }, [isCompleted, toolInvocation, codeExecutions]);

  const toggleItemExpansion = (itemId: string) => {
    setExpandedItems((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
    // Track that user manually interacted with this item
    setUserExpandedItems((prev) => ({ ...prev, [itemId]: true }));
  };

  // Simple auto-expand logic - only expand currently active items
  useEffect(() => {
    // Skip auto-logic in completed state - full manual control
    if (isCompleted) {
      return;
    }

    setExpandedItems((prevExpanded) => {
      const newExpanded = { ...prevExpanded };
      let shouldUpdate = false;

      // Only auto-expand currently active items (not user-controlled)
      searchQueries.forEach((query) => {
        const isActive = query.status === 'started' || query.status === 'reading_content';
        const wasUserControlled = userExpandedItems[query.id];

        // Auto-expand active items (unless user manually controlled)
        if (isActive && !prevExpanded[query.id] && !wasUserControlled) {
          newExpanded[query.id] = true;
          shouldUpdate = true;
        }

        // Auto-collapse completed items that were auto-expanded (not user-controlled)
        if (query.status === 'completed' && prevExpanded[query.id] && !wasUserControlled) {
          newExpanded[query.id] = false;
          shouldUpdate = true;
        }
      });

      codeExecutions.forEach((code) => {
        const isActive = code.status === 'running';
        const wasUserControlled = userExpandedItems[code.id];

        // Auto-expand active code executions (unless user manually controlled)
        if (isActive && !prevExpanded[code.id] && !wasUserControlled) {
          newExpanded[code.id] = true;
          shouldUpdate = true;
        }

        // Auto-collapse completed code that was auto-expanded (not user-controlled)
        if (code.status === 'completed' && prevExpanded[code.id] && !wasUserControlled) {
          newExpanded[code.id] = false;
          shouldUpdate = true;
        }
      });

      xSearchExecutions.forEach((xSearch) => {
        const isActive = xSearch.status === 'started';
        const wasUserControlled = userExpandedItems[xSearch.id];

        // Auto-expand active X search executions (unless user manually controlled)
        if (isActive && !prevExpanded[xSearch.id] && !wasUserControlled) {
          newExpanded[xSearch.id] = true;
          shouldUpdate = true;
        }

        // Auto-collapse completed X search that was auto-expanded (not user-controlled)
        if (xSearch.status === 'completed' && prevExpanded[xSearch.id] && !wasUserControlled) {
          newExpanded[xSearch.id] = false;
          shouldUpdate = true;
        }
      });

      return shouldUpdate ? newExpanded : prevExpanded;
    });
  }, [searchQueries, codeExecutions, xSearchExecutions, userExpandedItems, isCompleted]);

  const renderTimeline = () => (
    <div className="space-y-1 relative ml-4 mb-2">
      <AnimatePresence>
        {combinedTimelineItems.map((timelineItem, itemIndex) => {
          if (timelineItem.kind === 'query') {
            const query = timelineItem.item as SearchQuery;
            const isActive = state === 'input-streaming' || state === 'input-available';
            const isLoading = query.status === 'started' || query.status === 'reading_content';
            const hasResults = query.sources.length > 0;
            const isReadingContent = query.status === 'reading_content';

            const bulletColor = isLoading
              ? 'bg-primary/80 animate-[pulse_0.8s_ease-in-out_infinite]!'
              : hasResults
                ? 'bg-primary'
                : 'bg-yellow-500';

            return (
              <motion.div
                key={query.id}
                className="space-y-0 relative"
                initial={{ opacity: 0, y: 2 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1, delay: itemIndex * 0.01 }}
              >
                <div
                  className="absolute rounded-full bg-background z-5"
                  style={{ left: '-0.6rem', top: '4px', width: '10px', height: '10px', transform: 'translateX(-50%)' }}
                />

                <div
                  className={`absolute rounded-full ${bulletColor} transition-colors duration-300 z-10`}
                  style={{ left: '-0.6rem', top: '6px', width: '8px', height: '8px', transform: 'translateX(-50%)' }}
                  title={`Status: ${query.status}`}
                />

                {itemIndex > 0 && (
                  <div
                    className="absolute bg-neutral-300 dark:bg-neutral-700"
                    style={{
                      left: '-0.6rem',
                      top: '-6px',
                      width: '2px',
                      height: '14px',
                      transform: 'translateX(-50%)',
                    }}
                  />
                )}

                <div
                  className="absolute bg-neutral-300 dark:bg-neutral-700"
                  style={{
                    left: '-0.6rem',
                    top: '7px',
                    width: '2px',
                    height: expandedItems[query.id]
                      ? itemIndex === combinedTimelineItems.length - 1
                        ? 'calc(100% - 9px)'
                        : '100%'
                      : itemIndex === combinedTimelineItems.length - 1
                        ? '9px'
                        : '16px',
                    transform: 'translateX(-50%)',
                  }}
                />

                <div
                  className="flex items-center gap-1 cursor-pointer py-0.5 px-1 hover:bg-muted rounded-sm relative min-h-[18px]"
                  onClick={() => toggleItemExpansion(query.id)}
                >
                  <Search className="w-2.5 h-2.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-foreground text-xs min-w-0 flex-1">
                    {isLoading && !isCompleted ? (
                      <TextShimmer className="w-full" duration={1.5}>
                        {query.query}
                      </TextShimmer>
                    ) : (
                      query.query
                    )}
                  </span>
                  {expandedItems[query.id] ? (
                    <ChevronDown className="w-2.5 h-2.5 text-muted-foreground flex-shrink-0 ml-auto" />
                  ) : (
                    <ChevronRight className="w-2.5 h-2.5 text-muted-foreground flex-shrink-0 ml-auto" />
                  )}
                </div>

                <AnimatePresence>
                  {expandedItems[query.id] && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ height: { duration: 0.2, ease: 'easeOut' }, opacity: { duration: 0.15 } }}
                      className="dark:border-neutral-700 overflow-hidden"
                    >
                      <div className="pl-0.5 py-0.5">
                        {query.sources.length > 0 && (
                          <motion.div
                            className="flex flex-wrap gap-1 py-0.5"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.15 }}
                          >
                            {query.sources.map((source: any, index: number) => (
                              <motion.a
                                key={index}
                                href={source.url}
                                target="_blank"
                                className="flex items-center gap-1 bg-muted px-1.5 py-0.5 rounded-full text-xs hover:bg-muted/80 transition-colors"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.15, delay: index * 0.02 }}
                              >
                                <img
                                  src={source.favicon}
                                  alt=""
                                  className="w-3 h-3 rounded-full"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).src =
                                      'https://www.google.com/s2/favicons?sz=128&domain=example.com';
                                    (e.currentTarget as HTMLImageElement).style.filter = 'grayscale(100%)';
                                  }}
                                />
                                <span
                                  className="text-muted-foreground truncate max-w-[100px]"
                                  title={source.title || 'source'}
                                >
                                  {source.title || 'source'}
                                </span>
                              </motion.a>
                            ))}
                          </motion.div>
                        )}

                        {(() => {
                          if (isReadingContent && query.sources.length > 0 && !isCompleted) {
                            return (
                              <TextShimmer className="text-xs py-0.5" duration={2.5}>
                                Reading content...
                              </TextShimmer>
                            );
                          } else if (isLoading && !isCompleted) {
                            return (
                              <TextShimmer className="text-xs py-0.5" duration={2.5}>
                                Searching sources...
                              </TextShimmer>
                            );
                          } else if (query.sources.length === 0 && !isLoading) {
                            return (
                              <p className="text-xs text-muted-foreground py-1 mt-1">
                                No sources found for this query.
                              </p>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          }

          if (timelineItem.kind === 'x_search') {
            const xSearch = timelineItem.item as XSearchExecution;
            const isActive = state === 'input-streaming' || state === 'input-available';
            const isLoading = xSearch.status === 'started';
            const hasResults = xSearch.result && xSearch.result.citations.length > 0;

            const bulletColor = isLoading
              ? 'bg-primary/80 animate-[pulse_0.8s_ease-in-out_infinite]!'
              : hasResults
                ? 'bg-primary'
                : 'bg-yellow-500';

            return (
              <motion.div
                key={xSearch.id}
                className="space-y-0 relative"
                initial={{ opacity: 0, y: 2 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1, delay: itemIndex * 0.01 }}
              >
                <div
                  className="absolute w-1.5 h-1.5 rounded-full bg-background z-5"
                  style={{ left: '-0.6rem', top: '5px', transform: 'translateX(-50%)' }}
                />

                <div
                  className={`absolute rounded-full ${bulletColor} transition-colors duration-300 z-10`}
                  style={{ left: '-0.6rem', top: '6px', width: '8px', height: '8px', transform: 'translateX(-50%)' }}
                  title={`Status: ${xSearch.status}`}
                />

                {itemIndex > 0 && (
                  <div
                    className="absolute bg-neutral-300 dark:bg-neutral-700"
                    style={{
                      left: '-0.6rem',
                      top: '-6px',
                      width: '2px',
                      height: '14px',
                      transform: 'translateX(-50%)',
                    }}
                  />
                )}

                <div
                  className="absolute bg-neutral-300 dark:bg-neutral-700"
                  style={{
                    left: '-0.6rem',
                    top: '7px',
                    width: '2px',
                    height: expandedItems[xSearch.id]
                      ? itemIndex === combinedTimelineItems.length - 1
                        ? 'calc(100% - 9px)'
                        : '100%'
                      : itemIndex === combinedTimelineItems.length - 1
                        ? '9px'
                        : '16px',
                    transform: 'translateX(-50%)',
                  }}
                />

                <div
                  className="flex items-center gap-1 cursor-pointer py-0.5 px-1 hover:bg-muted rounded-sm relative min-h-[18px]"
                  onClick={() => toggleItemExpansion(xSearch.id)}
                >
                  <div className="p-0.5 rounded bg-black dark:bg-white flex-shrink-0">
                    <XLogoIcon className="size-2.5 text-white dark:text-black" />
                  </div>
                  <span className="text-foreground text-xs min-w-0 flex-1">
                    {isLoading && !isCompleted ? (
                      <TextShimmer className="w-full" duration={1.5}>{`X search: ${xSearch.query}`}</TextShimmer>
                    ) : (
                      `X search: ${xSearch.query}`
                    )}
                  </span>
                  {xSearch.handles && xSearch.handles.length > 0 && (
                    <Badge variant="secondary" className="rounded-full px-1.5 py-0 text-[10px] h-4">
                      {xSearch.handles.length} handles
                    </Badge>
                  )}
                  {expandedItems[xSearch.id] ? (
                    <ChevronDown className="w-2.5 h-2.5 text-muted-foreground flex-shrink-0 ml-auto" />
                  ) : (
                    <ChevronRight className="w-2.5 h-2.5 text-muted-foreground flex-shrink-0 ml-auto" />
                  )}
                </div>

                <AnimatePresence>
                  {expandedItems[xSearch.id] && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ height: { duration: 0.2, ease: 'easeOut' }, opacity: { duration: 0.15 } }}
                      className="dark:border-neutral-700 overflow-hidden"
                    >
                      <div className="pl-0.5 py-0.5">
                        <div className="text-[10px] text-muted-foreground mb-1">
                          {xSearch.startDate} to {xSearch.endDate}
                        </div>
                        {xSearch.result && xSearch.result.citations.length > 0 && (
                          <motion.div
                            className="flex flex-wrap gap-1 py-0.5"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.15 }}
                          >
                            {xSearch.result.citations.map((citation: any, index: number) => {
                              const url = typeof citation === 'string' ? citation : citation.url;
                              let title = typeof citation === 'object' ? citation.title : '';
                              if (!title && xSearch.result?.sources) {
                                const matchingSource = xSearch.result.sources.find(
                                  (source: any) => source.link === url,
                                );
                                title = matchingSource?.title || 'X post';
                              }
                              return (
                                <motion.a
                                  key={index}
                                  href={url}
                                  target="_blank"
                                  className="flex items-center gap-1 bg-muted px-1.5 py-0.5 rounded-full text-xs hover:bg-muted/80 transition-colors"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ duration: 0.15, delay: index * 0.02 }}
                                >
                                  <div className="p-0.5 rounded bg-black dark:bg-white flex-shrink-0">
                                    <XLogoIcon className="size-2.5 text-white dark:text-black" />
                                  </div>
                                  <span className="text-muted-foreground truncate max-w-[140px]" title={title}>
                                    {title}
                                  </span>
                                </motion.a>
                              );
                            })}
                          </motion.div>
                        )}

                        {isLoading && !isCompleted && (
                          <TextShimmer className="text-xs py-0.5" duration={2.5}>
                            Searching X posts...
                          </TextShimmer>
                        )}

                        {xSearch.status === 'completed' &&
                          (!xSearch.result || xSearch.result.citations.length === 0) && (
                            <p className="text-xs text-muted-foreground py-1 mt-1">No X posts found for this query.</p>
                          )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          }

          // code
          const code = timelineItem.item as CodeExecution;
          const isLoading = code.status === 'running';
          const bulletColor = isLoading ? 'bg-primary/80 animate-[pulse_0.8s_ease-in-out_infinite]!' : 'bg-primary';

          return (
            <motion.div
              key={code.id}
              className="space-y-0 relative"
              initial={{ opacity: 0, y: 2 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1, delay: itemIndex * 0.01 }}
            >
              <div
                className="absolute rounded-full bg-background z-5"
                style={{ left: '-0.6rem', top: '4px', width: '10px', height: '10px', transform: 'translateX(-50%)' }}
              />

              <div
                className={`absolute rounded-full ${bulletColor} transition-colors duration-300 z-10`}
                style={{ left: '-0.6rem', top: '6px', width: '8px', height: '8px', transform: 'translateX(-50%)' }}
                title={`Status: ${code.status}`}
              />

              {itemIndex > 0 && (
                <div
                  className="absolute bg-neutral-300 dark:bg-neutral-700"
                  style={{ left: '-0.6rem', top: '-6px', width: '2px', height: '14px', transform: 'translateX(-50%)' }}
                />
              )}

              <div
                className="absolute bg-neutral-300 dark:bg-neutral-700"
                style={{
                  left: '-0.6rem',
                  top: '7px',
                  width: '2px',
                  height: expandedItems[code.id]
                    ? itemIndex === combinedTimelineItems.length - 1
                      ? 'calc(100% - 9px)'
                      : '100%'
                    : itemIndex === combinedTimelineItems.length - 1
                      ? '9px'
                      : '16px',
                  transform: 'translateX(-50%)',
                }}
              />

              <div
                className="flex items-center gap-1 cursor-pointer py-0.5 px-1 hover:bg-muted rounded-sm relative min-h-[18px]"
                onClick={() => toggleItemExpansion(code.id)}
              >
                <Zap className="w-2.5 h-2.5 text-primary flex-shrink-0" />
                <span className="text-foreground text-xs min-w-0 flex-1">
                  {isLoading && !isCompleted ? (
                    <TextShimmer className="w-full" duration={1.5}>
                      {code.title}
                    </TextShimmer>
                  ) : (
                    code.title
                  )}
                </span>
                {expandedItems[code.id] ? (
                  <ChevronDown className="w-2.5 h-2.5 text-muted-foreground flex-shrink-0 ml-auto" />
                ) : (
                  <ChevronRight className="w-2.5 h-2.5 text-muted-foreground flex-shrink-0 ml-auto" />
                )}
              </div>

              <AnimatePresence>
                {expandedItems[code.id] && (
                  <motion.div
                    key="content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ height: { duration: 0.2, ease: 'easeOut' }, opacity: { duration: 0.15 } }}
                    className="dark:border-neutral-700 overflow-hidden"
                  >
                    <div className="pl-0.5 py-0.5">
                      <div className="bg-neutral-100 dark:bg-neutral-800 p-2 rounded-md my-1 overflow-auto max-h-[150px] text-xs font-mono">
                        <pre className="whitespace-pre-wrap break-words">{code.code}</pre>
                      </div>
                      {code.result && (
                        <div className="mt-2">
                          <div className="text-xs text-neutral-600 dark:text-neutral-400 font-medium mb-1">Result:</div>
                          <div className="bg-neutral-100 dark:bg-neutral-800 p-2 rounded-md overflow-auto max-h-[100px] text-xs font-mono">
                            <pre className="whitespace-pre-wrap break-words">{code.result}</pre>
                          </div>
                        </div>
                      )}
                      {code.charts && code.charts.length > 0 && (
                        <div className="mt-3 mb-1 space-y-4">
                          {code.charts.map((chart: any, chartIndex: number) => (
                            <div key={chartIndex} className="w-full">
                              <ExtremeChart chart={chart} />
                            </div>
                          ))}
                        </div>
                      )}
                      {code.status === 'running' && !isCompleted && (
                        <TextShimmer className="text-xs py-0.5 mt-1" duration={2.5}>
                          Executing code...
                        </TextShimmer>
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

  // Add horizontal scroll support with mouse wheel (matching multi-search)
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
    const isAtLeftEdge = container.scrollLeft <= 1;
    const isAtRightEdge = container.scrollLeft >= container.scrollWidth - container.clientWidth - 1;

    // Only prevent default if we're not at edges OR if we're scrolling in the direction that would move within bounds
    if (!isAtLeftEdge && !isAtRightEdge) {
      e.preventDefault();
      container.scrollLeft += e.deltaY;
    } else if (isAtLeftEdge && e.deltaY > 0) {
      e.preventDefault();
      container.scrollLeft += e.deltaY;
    } else if (isAtRightEdge && e.deltaY < 0) {
      e.preventDefault();
      container.scrollLeft += e.deltaY;
    }
  };

  // Render sources section (matching multi-search design)
  const renderSources = (sources: ExtremeSearchSource[]) => {
    console.log('[ExtremeSearch] renderSources called with:', sources.length, 'sources');
    console.log('[ExtremeSearch] Sources data:', sources);

    return (
      <div className="w-full">
        <div
          className={cn(
            'py-3 px-4 hover:no-underline group',
            'bg-white dark:bg-neutral-900',
            'border border-neutral-200 dark:border-neutral-800',
            'data-[state=open]:rounded-b-none cursor-pointer',
            sourcesAccordionOpen ? 'rounded-t-lg' : 'rounded-lg',
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
                {sources.length}
              </Badge>
              {sources.length > 0 && (
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
              <ChevronDown
                className={cn(
                  'h-4 w-4 text-neutral-500 shrink-0 transition-transform duration-200',
                  sourcesAccordionOpen ? 'rotate-180' : '',
                )}
              />
            </div>
          </div>
        </div>

        <AnimatePresence>
          {sourcesAccordionOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className={cn(
                'overflow-hidden',
                'bg-white dark:bg-neutral-900',
                'border-x border-b border-neutral-200 dark:border-neutral-800',
                'rounded-b-lg',
              )}
            >
              <div className="p-3 space-y-3">
                {sources.length > 0 ? (
                  <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1" onWheel={handleWheelScroll}>
                    {sources.map((source, index) => (
                      <a key={index} href={source.url} target="_blank" className="block flex-shrink-0 w-[320px]">
                        <ExtremeSourceCard source={source} />
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-neutral-500 text-sm">No sources found</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  // Final result view
  if (isCompleted) {
    console.log('[ExtremeSearch] 🎯 RENDERING COMPLETED STATE');
    console.log('[ExtremeSearch] allSources length:', allSources.length);
    console.log('[ExtremeSearch] allCharts length:', allCharts.length);

    return (
      <div className="space-y-2">
        {/* Research Process */}
        <Card className="!p-0 !gap-0 rounded-lg shadow-none">
          <div
            className="flex items-center justify-between p-3 cursor-pointer gap-2"
            onClick={() => setResearchProcessOpen(!researchProcessOpen)}
          >
            {/* icon */}
            <div className="rounded-md flex items-center gap-2">
              <FlaskConical className="h-3.5 w-3.5 text-neutral-500" />
              <h3 className="font-medium">Research Process</h3>
            </div>
            {/* title */}

            {researchProcessOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
          <AnimatePresence>
            {researchProcessOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
              >
                <CardContent className="mx-3 mb-0 !p-0">
                  <div className="max-h-[300px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-neutral-200 hover:scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-700 dark:hover:scrollbar-thumb-neutral-600 scrollbar-track-transparent">
                    {renderTimeline()}
                  </div>
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        {/* Charts */}
        {allCharts.length > 0 && (
          <Card className="!p-0 !gap-0 rounded-lg shadow-none">
            <div
              className={`flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors ${visualizationsOpen ? 'rounded-t-lg' : 'rounded-lg'}`}
              onClick={() => setVisualizationsOpen(!visualizationsOpen)}
            >
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-primary/10">
                  <svg className="h-3.5 w-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <h3 className="font-medium text-sm">Visualizations</h3>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="rounded-full text-xs px-2.5 py-0.5">
                  {allCharts.length}
                </Badge>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200',
                    visualizationsOpen ? 'rotate-180' : '',
                  )}
                />
              </div>
            </div>
            <AnimatePresence>
              {visualizationsOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{
                    height: { duration: 0.3, ease: 'easeOut' },
                    opacity: { duration: 0.2 },
                  }}
                  className="overflow-hidden border-t border-border"
                >
                  <div className="p-3 space-y-4">
                    {allCharts.map((chart, index) => (
                      <ExtremeChart key={index} chart={chart} />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        )}

        {/* X Search Results (combined) */}
        {(() => {
          const completedX = xSearchExecutions.filter((x) => x.status === 'completed' && x.result);
          if (completedX.length === 0) return null;
          const combined = {
            content: completedX.map((x) => x.result!.content).join('\n\n'),
            citations: completedX.flatMap((x) => x.result!.citations || []),
            sources: completedX.flatMap((x) => x.result!.sources || []),
            query: completedX.map((x) => x.query).join(' | '),
            dateRange: `${completedX[0].startDate || ''} to ${completedX[completedX.length - 1].endDate || ''}`,
            handles: Array.from(new Set(completedX.flatMap((x) => x.handles || []))),
          };
          const combinedArgs = {
            query: combined.query,
            startDate: completedX[0].startDate,
            endDate: completedX[completedX.length - 1].endDate,
            xHandles: Array.from(new Set(completedX.flatMap((x) => x.handles || []))),
          };
          return (
            <div className="space-y-3">
              <XSearch result={combined as any} args={combinedArgs} />
            </div>
          );
        })()}

        {/* Sources */}
        {allSources.length > 0 && renderSources(allSources)}

        {allSources.length > 0 && (
          <ExtremeSourcesSheet sources={allSources} open={sourcesSheetOpen} onOpenChange={setSourcesSheetOpen} />
        )}
      </div>
    );
  }

  // In-progress view
  return (
    <Card className="!p-0 !m-0 !gap-0 rounded-lg shadow-none">
      <div className="py-3 px-4 border-b bg-neutral-50 dark:bg-neutral-900 rounded-t-lg">
        <div className="text-sm font-medium">
          {state === 'input-streaming' || state === 'input-available' ? (
            <TextShimmer duration={2}>{currentStatus}</TextShimmer>
          ) : (
            currentStatus
          )}
        </div>
      </div>

      <CardContent className="p-4">
        {/* Show plan if available and no timeline items yet */}
        {planData && searchQueries.length === 0 && codeExecutions.length === 0 && xSearchExecutions.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Target className="w-3.5 h-3.5 text-primary" />
              <h4 className="text-sm font-medium text-foreground">Research Strategy</h4>
            </div>

            <div className="space-y-1 relative ml-3">
              {planData.map((item: any, index: number) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 2 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="space-y-0 relative"
                >
                  {/* Background circle to prevent line showing through */}
                  <div
                    className="absolute w-1.5 h-1.5 rounded-full bg-background z-5"
                    style={{
                      left: '-0.6rem',
                      top: '5px',
                      transform: 'translateX(-50%)',
                    }}
                  />

                  {/* Timeline bullet */}
                  <div
                    className="absolute size-1 rounded-full bg-primary transition-colors duration-300 z-10"
                    style={{
                      left: '-0.6rem',
                      top: '5.5px',
                      transform: 'translateX(-50%)',
                    }}
                  />

                  {/* Vertical line above bullet */}
                  {index > 0 && (
                    <div
                      className="absolute w-0.25 bg-border"
                      style={{
                        left: '-0.6rem',
                        top: '-6px',
                        height: '12px',
                        transform: 'translateX(-50%)',
                      }}
                    />
                  )}

                  {/* Vertical line below bullet */}
                  {index < planData.length - 1 && (
                    <div
                      className="absolute w-0.25 bg-border"
                      style={{
                        left: '-0.6rem',
                        top: '6px',
                        height: '14px',
                        transform: 'translateX(-50%)',
                      }}
                    />
                  )}

                  <div className="flex items-center gap-1 py-0.5 px-1 rounded-sm relative min-h-[18px]">
                    <span className="text-foreground text-xs min-w-0 flex-1 font-medium">{item.title}</span>
                    <span className="text-xs text-muted-foreground">{item.todos?.length || 0} tasks</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Show loading skeletons when no plan and no items */}
        {!planData && searchQueries.length === 0 && codeExecutions.length === 0 && xSearchExecutions.length === 0 && (
          <div className="mb-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Target className="w-3.5 h-3.5 text-primary/50" />
              <h4 className="text-sm font-medium text-foreground">Preparing Research Strategy</h4>
            </div>

            <div className="space-y-1 relative ml-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-0 relative">
                  {/* Background circle skeleton */}
                  <div
                    className="absolute w-1.5 h-1.5 rounded-full bg-background z-5"
                    style={{
                      left: '-0.6rem',
                      top: '5px',
                      transform: 'translateX(-50%)',
                    }}
                  />

                  {/* Timeline bullet skeleton */}
                  <Skeleton
                    className="absolute size-1 rounded-full z-10"
                    style={{
                      left: '-0.6rem',
                      top: '5.5px',
                      transform: 'translateX(-50%)',
                    }}
                  />

                  {/* Vertical line above bullet */}
                  {i > 1 && (
                    <div
                      className="absolute w-0.25 bg-border"
                      style={{
                        left: '-0.6rem',
                        top: '-6px',
                        height: '12px',
                        transform: 'translateX(-50%)',
                      }}
                    />
                  )}

                  {/* Vertical line below bullet */}
                  {i < 3 && (
                    <div
                      className="absolute w-0.25 bg-border"
                      style={{
                        left: '-0.6rem',
                        top: '6px',
                        height: '14px',
                        transform: 'translateX(-50%)',
                      }}
                    />
                  )}

                  <div className="flex items-center gap-1 py-0.5 px-1 rounded-sm relative min-h-[18px]">
                    <Skeleton className="w-2.5 h-2.5 rounded-full flex-shrink-0" />
                    <Skeleton className="h-3 flex-1" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Show timeline when items are available */}
        {(searchQueries.length > 0 || codeExecutions.length > 0 || xSearchExecutions.length > 0) && (
          <div
            ref={timelineRef}
            className="max-h-[300px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-neutral-200 hover:scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-700 dark:hover:scrollbar-thumb-neutral-600 scrollbar-track-transparent"
            onScroll={markManualScroll}
          >
            {renderTimeline()}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const ExtremeSearch = memo(ExtremeSearchComponent);
