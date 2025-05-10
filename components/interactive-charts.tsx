import React, { useMemo } from 'react';
import ReactECharts, { EChartsOption } from 'echarts-for-react';
import { Card, CardTitle, CardHeader } from "@/components/ui/card";
import { useTheme } from 'next-themes';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// Minimal, vibrant color palette
const CHART_COLORS = {
  blue: ['#3b82f6', '#60a5fa'],    // Primary & Hover
  green: ['#22c55e', '#4ade80'],   // Success & Hover
  amber: ['#f59e0b', '#fbbf24'],   // Warning & Hover
  violet: ['#8b5cf6', '#a78bfa'],  // Info & Hover
  pink: ['#ec4899', '#f472b6'],    // Secondary & Hover
  red: ['#ef4444', '#f87171'],     // Danger & Hover
};

interface BaseChart {
  type: string;
  title: string;
  x_label?: string;
  y_label?: string;
  elements: any[];
  x_scale?: string;
}

// Create a memoized chart component to prevent unnecessary rerenders
const InteractiveChart = React.memo(({ chart }: { chart: BaseChart }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Memoized theme-based styles
  const themeStyles = useMemo(() => ({
    text: isDark ? '#e5e5e5' : '#171717',
    subtext: isDark ? '#737373' : '#525252',
    grid: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
    tooltip: isDark ? '#171717' : '#ffffff',
  }), [isDark]);

  const sharedOptions: EChartsOption = useMemo(() => ({
    backgroundColor: 'transparent',
    grid: {
      top: chart.title ? 50 : 25,
      right: 25,
      bottom: 40,
      left: 35,
      containLabel: true
    },
    legend: {
      show: chart.elements.length > 1,
      type: 'scroll',
      top: chart.title ? 24 : 8,
      textStyle: { 
        color: themeStyles.subtext,
        fontSize: 10,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      },
      icon: 'circle',
      itemWidth: 6,
      itemHeight: 6,
      itemGap: 10,
      pageIconSize: 9,
      pageTextStyle: { color: themeStyles.subtext, fontSize: 10 },
      pageButtonItemGap: 5,
      tooltip: { show: true }
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: themeStyles.tooltip,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
      padding: [6, 10],
      className: cn(
        'rounded-md shadow-lg!',
        'border border-neutral-200 dark:border-neutral-800',
        'backdrop-blur-sm bg-white/90 dark:bg-neutral-900/90'
      ),
      textStyle: { 
        color: themeStyles.text,
        fontSize: 11,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      },
      axisPointer: {
        type: 'line',
        lineStyle: {
          color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
          width: 1
        }
      },
      position: function(
        pos: [number, number],
        params: any,
        dom: HTMLElement,
        rect: { x: number, y: number, width: number, height: number },
        size: { contentSize: [number, number], viewSize: [number, number] }
      ) {
        // Handle mobile positioning
        const isMobile = window.innerWidth < 640;
        if (isMobile) {
          return { top: 10, left: 'center' };
        }
        // Default positioning
        return [pos[0], pos[1]];
      },
      formatter: function(params: any) {
        // Shorten text for mobile
        const isMobile = window.innerWidth < 640;
        if (isMobile && Array.isArray(params)) {
          // Limit to just values for mobile
          let result = params[0].axisValueLabel + '<br/>';
          params.forEach((param: any) => {
            result += `<div style="display:flex;align-items:center;margin:3px 0">
              <span style="display:inline-block;width:6px;height:6px;margin-right:5px;border-radius:50%;background-color:${param.color};"></span>
              <span>${param.seriesName}: ${param.value[1]}</span>
            </div>`;
          });
          return result;
        }
        return undefined; // Use default formatter for non-mobile
      }
    },
    animation: true,
    animationDuration: 300,
    animationEasing: 'cubicOut',
    responsive: true,
    maintainAspectRatio: false
  }), [chart.title, chart.elements.length, themeStyles, isDark]);

  // Memoize the getChartOptions function to prevent recalculation during rerenders
  const chartOptions = useMemo(() => {
    const defaultAxisOptions = {
      axisLine: { 
        show: true, 
        lineStyle: { 
          color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
          width: 1
        }
      },
      axisTick: { 
        show: true,
        length: 3,
        lineStyle: {
          color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
        }
      },
      axisLabel: {
        show: true,
        color: themeStyles.subtext,
        margin: 8,
        fontSize: 10,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        hideOverlap: false,
        showMinLabel: true,
        showMaxLabel: true
      },
      splitLine: {
        show: true,
        lineStyle: { 
          color: themeStyles.grid,
          width: 1,
          type: [3, 3]
        }
      },
    };

    // Mobile optimizations
    const isMobileMediaQuery = '(max-width: 640px)';
    const isMobile = window.matchMedia(isMobileMediaQuery).matches;

    if (chart.type === 'pie') {
      // Prepare pie chart data
      const series = [{
        type: 'pie',
        radius: '75%',
        center: ['50%', '58%'],
        data: chart.elements.map((e, index) => {
          const colorSet = Object.values(CHART_COLORS)[index % Object.keys(CHART_COLORS).length];
          return {
            name: e.label,
            value: e.angle,
            itemStyle: {
              color: colorSet[0]
            },
            emphasis: {
              itemStyle: {
                color: colorSet[1],
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.2)'
              }
            }
          };
        }),
        label: {
          show: !isMobile,
          position: 'outside',
          formatter: '{b}: {d}%',
          fontSize: 10,
          color: themeStyles.text
        },
        labelLine: {
          show: !isMobile,
          lineStyle: {
            color: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'
          }
        },
        itemStyle: {
          borderRadius: 2,
          borderColor: isDark ? '#1e1e1e' : '#ffffff',
          borderWidth: 1
        },
        animationType: 'scale',
        animationEasing: 'elasticOut'
      }];

      return {
        ...sharedOptions,
        grid: {
          top: chart.title ? 50 : 25,
          bottom: 25,
          left: 10,
          right: 10,
          containLabel: true
        },
        tooltip: {
          ...sharedOptions.tooltip,
          trigger: 'item',
          formatter: '{a} <br/>{b}: {c} ({d}%)'
        },
        series
      };
    }

    if (chart.type === 'line' || chart.type === 'scatter') {
      const series = chart.elements.map((e, index) => {
        const colorSet = Object.values(CHART_COLORS)[index % Object.keys(CHART_COLORS).length];
        return {
          name: e.label,
          type: chart.type,
          data: e.points.map((p: [number | string, number]) => {
            const x = chart.x_scale === 'datetime' ? new Date(p[0]).getTime() : p[0];
            return [x, p[1]];
          }),
          smooth: 0.15,
          symbol: 'circle',
          symbolSize: 3,
          showSymbol: false,
          emphasis: {
            focus: 'series',
            scale: false,
            itemStyle: {
              color: colorSet[1]
            }
          },
          lineStyle: {
            width: 1.5,
            color: colorSet[0],
            cap: 'round',
            join: 'round',
          },
          itemStyle: {
            color: colorSet[0],
            borderWidth: 0
          },
          areaStyle: chart.type === 'line' ? {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [{
                offset: 0,
                color: `${colorSet[0]}0D`
              }, {
                offset: 1,
                color: `${colorSet[0]}00`
              }]
            }
          } : undefined
        };
      });

      return {
        ...sharedOptions,
        xAxis: {
          type: chart.x_scale === 'datetime' ? 'time' : 'value',
          name: isMobile ? '' : chart.x_label,
          nameLocation: 'middle',
          nameGap: 28,
          nameTextStyle: {
            color: themeStyles.subtext,
            fontSize: 10,
            fontWeight: 500,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            padding: [10, 0, 0, 0]
          },
          ...defaultAxisOptions,
          axisLabel: {
            ...defaultAxisOptions.axisLabel,
            formatter: chart.x_scale === 'datetime' ? (value: number) => {
              const date = new Date(value);
              return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            } : undefined,
            interval: isMobile ? 'auto' : 0,
            align: 'center'
          }
        },
        yAxis: {
          type: 'value',
          name: isMobile ? '' : chart.y_label,
          nameLocation: 'middle',
          nameGap: isMobile ? 20 : 25,
          nameTextStyle: {
            color: themeStyles.subtext,
            fontSize: 10,
            fontWeight: 500,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            padding: [0, 0, 0, 0]
          },
          ...defaultAxisOptions,
          axisLabel: {
            ...defaultAxisOptions.axisLabel,
            formatter: (value: number) => {
              if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
              if (value >= 1000) return (value / 1000).toFixed(0) + 'K';
              return value.toFixed(0);
            }
          }
        },
        series
      };
    }

    if (chart.type === 'bar') {
      const data = chart.elements.reduce((acc: Record<string, any[]>, item) => {
        const key = item.group;
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
      }, {});
      
      const series = Object.entries(data).map(([group, elements], index) => {
        const colorSet = Object.values(CHART_COLORS)[index % Object.keys(CHART_COLORS).length];
        return {
          name: group,
          type: 'bar',
          stack: 'total',
          data: elements?.map((e) => [e.label, e.value]),
          itemStyle: {
            color: colorSet[0],
            borderRadius: [2, 2, 0, 0]
          },
          emphasis: {
            focus: 'series',
            itemStyle: {
              color: colorSet[1]
            }
          },
          barMaxWidth: 30,
          barGap: '20%'
        };
      });

      return {
        ...sharedOptions,
        xAxis: {
          type: 'category',
          name: isMobile ? '' : chart.x_label,
          nameLocation: 'middle',
          nameGap: 28,
          nameTextStyle: {
            color: themeStyles.subtext,
            fontSize: 10,
            fontWeight: 500,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            padding: [10, 0, 0, 0]
          },
          ...defaultAxisOptions,
          axisLabel: {
            ...defaultAxisOptions.axisLabel,
            rotate: Object.values(data)[0]?.length > (isMobile ? 3 : 5) ? 30 : 0,
            interval: 0,
            formatter: (value: string) => {
              if (isMobile && value.length > 6) return value.substring(0, 5) + '…'; 
              if (value.length > 8) return value.substring(0, 7) + '…'; 
              return value;
            }
          }
        },
        yAxis: {
          type: 'value',
          name: isMobile ? '' : chart.y_label,
          nameLocation: 'middle',
          nameGap: isMobile ? 20 : 25,
          nameTextStyle: {
            color: themeStyles.subtext,
            fontSize: 10,
            fontWeight: 500,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            padding: [0, 0, 0, 0]
          },
          ...defaultAxisOptions,
          axisLabel: {
            ...defaultAxisOptions.axisLabel,
            formatter: (value: number) => {
              if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
              if (value >= 1000) return (value / 1000).toFixed(0) + 'K';
              return value.toFixed(0);
            }
          }
        },
        series
      };
    }

    return sharedOptions;
  }, [sharedOptions, chart, themeStyles, isDark]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="w-full min-w-0 overflow-hidden"
    >
      <Card className="overflow-hidden bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
        <CardHeader className='pt-3 pb-1 px-4'>
          <CardTitle className='p-0! m-0! text-xs sm:text-sm font-medium line-clamp-2'>
            {chart.title}
          </CardTitle>
        </CardHeader>
        <div className='m-0 px-3 sm:px-4 pb-3'>
          <div className="w-full h-80">
            <ReactECharts 
              option={chartOptions} 
              style={{ height: '100%', width: '100%' }}
              className='p-0! m-0! h-full w-full!'
              theme={theme === 'dark' ? 'dark' : undefined}
              notMerge={true}
              opts={{ renderer: 'canvas' }}
              onEvents={{
                resize: () => {
                  setTimeout(() => {
                    window.dispatchEvent(new Event('resize'));
                  }, 200);
                }
              }}
            />
          </div>
        </div>
      </Card>
    </motion.div>
  );
}, (prevProps, nextProps) => {
  // Deep comparison of chart props to prevent unnecessary rerenders
  // Only rerender if essential properties change
  if (prevProps.chart.title !== nextProps.chart.title) return false;
  if (prevProps.chart.type !== nextProps.chart.type) return false;
  
  // Check if elements array references are the same
  if (prevProps.chart.elements === nextProps.chart.elements) return true;
  
  // If elements references are different but lengths are different, they're definitely different
  if (prevProps.chart.elements.length !== nextProps.chart.elements.length) return false;
  
  // For streaming, consider charts equal if they have the same number of elements
  // and each element has the same label and value/points reference
  // This prevents rerenders when streaming adds more content but chart data is unchanged
  for (let i = 0; i < prevProps.chart.elements.length; i++) {
    const prevElement = prevProps.chart.elements[i];
    const nextElement = nextProps.chart.elements[i];
    
    if (prevElement.label !== nextElement.label) return false;
    
    // For pie charts, compare values directly
    if (prevProps.chart.type === 'pie') {
      if (prevElement.value !== nextElement.value) return false;
      continue;
    }
    
    // For line/scatter charts, compare points
    // If points reference is the same, elements are equivalent
    if (prevElement.points === nextElement.points) continue;
    
    // If lengths are different, they're definitely different
    if (prevElement.points?.length !== nextElement.points?.length) return false;
  }
  
  // If we reach here, consider them equal
  return true;
});

// Add display name to satisfy ESLint rule
InteractiveChart.displayName = 'InteractiveChart';

export { InteractiveChart };
export default InteractiveChart;