import React from 'react';
import ReactECharts, { EChartsOption } from 'echarts-for-react';
import { Card } from "@/components/ui/card";
import { useTheme } from 'next-themes';
import { motion } from 'framer-motion';

interface BaseChart {
  type: string;
  title: string;
  x_label?: string;
  y_label?: string;
  elements: any[];
}

export function InteractiveChart({ chart }: { chart: BaseChart }) {
  const { theme } = useTheme();
  const textColor = theme === 'dark' ? '#e5e5e5' : '#171717';
  const gridColor = theme === 'dark' ? '#404040' : '#e5e5e5';

  const sharedOptions: EChartsOption = {
    backgroundColor: 'transparent',
    grid: { top: 50, right: 20, bottom: 40, left: 40 },
    legend: {
      textStyle: { color: textColor },
      top: 8
    },
    tooltip: {
      backgroundColor: theme === 'dark' ? '#333' : '#fff',
      borderColor: gridColor,
      borderWidth: 1,
      textStyle: { color: textColor },
      trigger: 'axis',
      className: '!rounded-lg !border !border-neutral-200 dark:!border-neutral-800'
    },
  };

  const getChartOptions = (): EChartsOption => {
    if (chart.type === 'line' || chart.type === 'scatter') {
      const series = chart.elements.map((e) => ({
        name: e.label,
        type: chart.type,
        data: e.points.map((p: [number, number]) => [p[0], p[1]]),
        smooth: true,
        symbolSize: chart.type === 'scatter' ? 10 : 6
      }));

      return {
        ...sharedOptions,
        xAxis: {
          type: 'category',
          name: chart.x_label,
          nameLocation: 'middle',
          nameGap: 25,
          axisLabel: { color: textColor },
          axisLine: { lineStyle: { color: gridColor } }
        },
        yAxis: {
          name: chart.y_label,
          nameLocation: 'middle',
          nameGap: 30,
          axisLabel: { color: textColor },
          axisLine: { lineStyle: { color: gridColor } }
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
      
      const series = Object.entries(data).map(([group, elements]) => ({
        name: group,
        type: 'bar',
        stack: 'total',
        data: elements?.map((e) => [e.label, e.value]),
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
          axisLabel: { color: textColor },
          axisLine: { lineStyle: { color: gridColor } }
        },
        yAxis: {
          name: chart.y_label,
          nameLocation: 'middle',
          nameGap: 30,
          axisLabel: { color: textColor },
          axisLine: { lineStyle: { color: gridColor } }
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
          />
        </div>
      </Card>
    </motion.div>
  );
}

export default InteractiveChart;