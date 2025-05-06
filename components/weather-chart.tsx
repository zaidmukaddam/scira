import React, { useMemo } from 'react';
import { Line, LineChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface WeatherDataPoint {
    date: string;
    minTemp: number;
    maxTemp: number;
}

interface WeatherChartProps {
    result: any;
}

const WeatherChart: React.FC<WeatherChartProps> = React.memo(({ result }) => {
    const { chartData, minTemp, maxTemp } = useMemo(() => {
        const weatherData: WeatherDataPoint[] = result.list.map((item: any) => ({
            date: new Date(item.dt * 1000).toLocaleDateString(),
            minTemp: Number((item.main.temp_min - 273.15).toFixed(1)),
            maxTemp: Number((item.main.temp_max - 273.15).toFixed(1)),
        }));

        const groupedData: { [key: string]: WeatherDataPoint } = weatherData.reduce((acc, curr) => {
            if (!acc[curr.date]) {
                acc[curr.date] = { ...curr };
            } else {
                acc[curr.date].minTemp = Math.min(acc[curr.date].minTemp, curr.minTemp);
                acc[curr.date].maxTemp = Math.max(acc[curr.date].maxTemp, curr.maxTemp);
            }
            return acc;
        }, {} as { [key: string]: WeatherDataPoint });

        const chartData = Object.values(groupedData);

        const minTemp = Math.min(...chartData.map(d => d.minTemp));
        const maxTemp = Math.max(...chartData.map(d => d.maxTemp));

        return { chartData, minTemp, maxTemp };
    }, [result]);

    const chartConfig: ChartConfig = useMemo(() => ({
        minTemp: {
            label: "Min Temp.",
            color: "hsl(var(--chart-1))",
        },
        maxTemp: {
            label: "Max Temp.",
            color: "hsl(var(--chart-2))",
        },
    }), []);

    return (
        <Card className="my-4 shadow-none bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700">
            <CardHeader>
                <CardTitle className="text-neutral-800 dark:text-neutral-100">Weather Forecast for {result.city.name}</CardTitle>
                <CardDescription className="text-neutral-600 dark:text-neutral-400">
                    Showing min and max temperatures for the next 5 days
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig}>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart
                            data={chartData}
                            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis
                                dataKey="date"
                                tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                stroke="#9CA3AF"
                            />
                            <YAxis
                                domain={[Math.floor(minTemp) - 2, Math.ceil(maxTemp) + 2]}
                                tickFormatter={(value) => `${value}°C`}
                                stroke="#9CA3AF"
                            />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Line
                                type="monotone"
                                dataKey="minTemp"
                                stroke="oklch(0.488 0.243 264.376)"
                                strokeWidth={2}
                                dot={false}
                                name="Min Temp."
                            />
                            <Line
                                type="monotone"
                                dataKey="maxTemp"
                                stroke="oklch(0.696 0.17 162.48)"
                                strokeWidth={2}
                                dot={false}
                                name="Max Temp."
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
            <CardFooter>
                <div className="flex w-full items-start gap-2 text-sm">
                    <div className="grid gap-2">
                        <div className="flex items-center gap-2 font-medium leading-none text-neutral-800 dark:text-neutral-100">
                            {result.city.name}, {result.city.country}
                        </div>
                        <div className="flex items-center gap-2 leading-none text-neutral-600 dark:text-neutral-400">
                            Next 5 days forecast
                        </div>
                    </div>
                </div>
            </CardFooter>
        </Card>
    );
});

WeatherChart.displayName = 'WeatherChart';

export default WeatherChart;