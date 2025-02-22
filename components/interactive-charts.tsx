import React from 'react';
import ReactECharts, { EChartsOption } from 'echarts-for-react';
import { Card } from "@/components/ui/card";
import { useTheme } from 'next-themes';
import { motion } from 'framer-motion';

const CHART_COLORS = [
  '#22c55e', // green
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#ef4444', // red
  '#84cc16', // lime
];

interface BaseChart {
  type: string;
  title: string;
  x_label?: string;
  y_label?: string;
  elements: any[];
  x_scale?: string;
}

export function InteractiveChart({ chart }: { chart: BaseChart }) {
  const { theme } = useTheme();
  const textColor = theme === 'dark' ? '#e5e5e5' : '#171717';
  const gridColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
  const tooltipBg = theme === 'dark' ? '#171717' : '#ffffff';

  const sharedOptions: EChartsOption = {
    backgroundColor: 'transparent',
    grid: {
      top: 50,
      right: 16,
      bottom: 24,
      left: 16,
      containLabel: true
    },
    legend: {
      textStyle: { color: textColor },
      top: 8,
      icon: 'circle',
      itemWidth: 8,
      itemHeight: 8,
      itemGap: 16,
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: tooltipBg,
      borderWidth: 0,
      padding: [6, 10],
      className: 'echarts-tooltip !rounded-lg !border !border-neutral-200 dark:!border-neutral-800',
      textStyle: { 
        color: textColor,
        fontSize: 13,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      },
    },
  };

  const getChartOptions = (): EChartsOption => {
    const defaultAxisOptions = {
      axisLine: { show: true, lineStyle: { color: gridColor } },
      axisTick: { show: false },
      axisLabel: {
        color: textColor,
        margin: 8,
        fontSize: 11,
        hideOverlap: true
      },
      splitLine: {
        show: true,
        lineStyle: { color: gridColor, type: 'dashed' }
      },
    };

    if (chart.type === 'line' || chart.type === 'scatter') {
      const series = chart.elements.map((e, index) => ({
        name: e.label,
        type: chart.type,
        data: e.points.map((p: [number | string, number]) => {
          // Handle datetime x-axis
          const x = chart.x_scale === 'datetime' ? new Date(p[0]).getTime() : p[0];
          return [x, p[1]];
        }),
        smooth: true,
        symbolSize: chart.type === 'scatter' ? 10 : 0,
        lineStyle: {
          width: 2,
          color: CHART_COLORS[index % CHART_COLORS.length],
        },
        itemStyle: {
          color: CHART_COLORS[index % CHART_COLORS.length],
        },
        areaStyle: chart.type === 'line' ? {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [{
              offset: 0,
              color: `${CHART_COLORS[index % CHART_COLORS.length]}15` // 15 = 10% opacity
            }, {
              offset: 1,
              color: theme === 'dark' ? 'rgba(23, 23, 23, 0)' : 'rgba(255, 255, 255, 0)'
            }]
          }
        } : undefined
      }));

      return {
        ...sharedOptions,
        xAxis: {
          type: chart.x_scale === 'datetime' ? 'time' : 'value',
          name: chart.x_label,
          nameLocation: 'middle',
          nameGap: 25,
          ...defaultAxisOptions,
          axisLabel: {
            ...defaultAxisOptions.axisLabel,
            formatter: chart.x_scale === 'datetime' ? (value: number) => {
              const date = new Date(value);
              return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            } : undefined
          }
        },
        yAxis: {
          type: 'value',
          name: chart.y_label,
          nameLocation: 'middle',
          nameGap: 30,
          position: 'right',
          ...defaultAxisOptions
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
      
      const series = Object.entries(data).map(([group, elements], index) => ({
        name: group,
        type: 'bar',
        stack: 'total',
        data: elements?.map((e) => [e.label, e.value]),
        itemStyle: {
          color: CHART_COLORS[index % CHART_COLORS.length],
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0,0,0,0.3)'
          }
        }
      }));

      return {
        ...sharedOptions,
        xAxis: {
          type: 'category',
          name: chart.x_label,
          nameLocation: 'middle',
          nameGap: 25,
          ...defaultAxisOptions
        },
        yAxis: {
          type: 'value',
          name: chart.y_label,
          nameLocation: 'middle',
          nameGap: 30,
          position: 'right',
          ...defaultAxisOptions
        },
        series
      };
    }

    return sharedOptions;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="overflow-hidden bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
        <div className="p-6">
          {chart.title && (
            <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-4">
              {chart.title}
            </h3>
          )}
          <ReactECharts 
            option={getChartOptions()} 
            style={{ height: '400px', width: '100%' }}
            theme={theme === 'dark' ? 'dark' : undefined}
            notMerge={true}
          />
        </div>
      </Card>
    </motion.div>
  );
}

export default InteractiveChart;