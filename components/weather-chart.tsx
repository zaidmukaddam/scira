import React, { useMemo, useState } from 'react';
import {
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Area,
  AreaChart,
  Tooltip,
  Legend,
} from 'recharts';
import { Card, CardHeader, CardContent, CardTitle, CardFooter } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Cloud, Droplets, Thermometer, Wind } from 'lucide-react';
import Image from 'next/image';

interface WeatherDataPoint {
  date: string;
  timestamp: number;
  minTemp: number;
  maxTemp: number;
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  description: string;
  icon: string;
  pressure: number;
  clouds: number;
  pop: number; // probability of precipitation
  hour: number; // hour of day
}

interface AirPollutionData {
  dt: number;
  main: {
    aqi: number;
  };
  components: {
    co: number;
    no: number;
    no2: number;
    o3: number;
    so2: number;
    pm2_5: number;
    pm10: number;
    nh3: number;
  };
}

interface DailyForecastData {
  dt: number;
  sunrise: number;
  sunset: number;
  temp: {
    day: number;
    min: number;
    max: number;
    night: number;
    eve: number;
    morn: number;
  };
  feels_like: {
    day: number;
    night: number;
    eve: number;
    morn: number;
  };
  pressure: number;
  humidity: number;
  weather: Array<{
    id: number;
    main: string;
    description: string;
    icon: string;
  }>;
  speed: number;
  deg: number;
  clouds: number;
  pop: number;
  rain?: number;
  snow?: number;
}

interface ProcessedDailyForecast {
  date: string;
  dateFormatted: string;
  timestamp: number;
  day: number;
  minTemp: number;
  maxTemp: number;
  dayTemp: number;
  nightTemp: number;
  humidity: number;
  windSpeed: number;
  description: string;
  icon: string;
  pop: number;
  rain?: number;
  snow?: number;
}

interface WeatherChartProps {
  result: any;
}

// Convert wind speed from m/s to km/h
const convertWindSpeed = (speed: number): number => {
  return Math.round(speed * 3.6);
};

// Get weather icon URL from code
const getWeatherIconUrl = (iconCode: string): string => {
  return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
};

// Format timestamp to readable time
const formatTime = (timestamp: number): string => {
  return new Date(timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Format date for grouped data headers
const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
};

// Get air quality label and color from AQI value
const getAirQualityInfo = (aqi: number): { label: string; colorClass: string } => {
  switch (aqi) {
    case 0:
      return {
        label: 'None',
        colorClass: 'bg-neutral-50 text-neutral-500 dark:bg-neutral-800/60 dark:text-neutral-400',
      };
    case 1:
      return {
        label: 'Good',
        colorClass: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      };
    case 2:
      return {
        label: 'Fair',
        colorClass: 'bg-lime-50 text-lime-700 dark:bg-lime-900/30 dark:text-lime-300',
      };
    case 3:
      return {
        label: 'Moderate',
        colorClass: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
      };
    case 4:
      return {
        label: 'Poor',
        colorClass: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
      };
    case 5:
      return {
        label: 'Very Poor',
        colorClass: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
      };
    default:
      return {
        label: 'Unknown',
        colorClass: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
      };
  }
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip bg-white dark:bg-neutral-800 p-2 border border-neutral-200 dark:border-neutral-700 rounded-md text-xs shadow-sm">
        <p className="mb-1 font-medium">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={`item-${index}`} style={{ color: entry.color }} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
            <span>
              {entry.name}: {entry.value}
              {entry.dataKey === 'precipitation' || entry.name === 'Precipitation' ? '%' : '°C'}
            </span>
          </p>
        ))}
      </div>
    );
  }

  return null;
};

const WeatherChart: React.FC<WeatherChartProps> = React.memo(({ result }) => {
  const [selectedDay, setSelectedDay] = useState<string>('');

  const {
    chartData,
    hourlyDataByDay,
    currentWeather,
    minTemp,
    maxTemp,
    days,
    airPollution,
    airPollutionForecast,
    dailyForecast,
  } = useMemo(() => {
    // Process data for the line chart (daily min/max temperatures)
    const weatherData = result.list.map((item: any) => {
      const date = new Date(item.dt * 1000);
      return {
        date: date.toLocaleDateString(),
        timestamp: item.dt,
        hour: date.getHours(),
        minTemp: Number((item.main.temp_min - 273.15).toFixed(1)),
        maxTemp: Number((item.main.temp_max - 273.15).toFixed(1)),
        temp: Number((item.main.temp - 273.15).toFixed(1)),
        feelsLike: Number((item.main.feels_like - 273.15).toFixed(1)),
        humidity: item.main.humidity,
        windSpeed: convertWindSpeed(item.wind.speed),
        description: item.weather[0].description,
        icon: item.weather[0].icon,
        pressure: item.main.pressure,
        clouds: item.clouds.all,
        pop: Math.round(item.pop * 100), // convert to percentage
      };
    });

    // Process air pollution data
    const airPollution = result.air_pollution?.list?.[0] || null;

    // Process air pollution forecast data
    const airPollutionForecast =
      result.air_pollution_forecast?.list?.map((item: AirPollutionData) => {
        return {
          ...item,
          dateTime: new Date(item.dt * 1000),
          date: new Date(item.dt * 1000).toLocaleDateString(),
          hour: new Date(item.dt * 1000).getHours(),
        };
      }) || [];

    // Process daily forecast data (16 days)
    const dailyForecast =
      result.daily_forecast?.list?.map((item: DailyForecastData) => {
        return {
          date: new Date(item.dt * 1000).toLocaleDateString(),
          dateFormatted: formatDate(new Date(item.dt * 1000).toLocaleDateString()),
          timestamp: item.dt,
          day: new Date(item.dt * 1000).getDay(),
          minTemp: Number((item.temp.min - 273.15).toFixed(1)),
          maxTemp: Number((item.temp.max - 273.15).toFixed(1)),
          dayTemp: Number((item.temp.day - 273.15).toFixed(1)),
          nightTemp: Number((item.temp.night - 273.15).toFixed(1)),
          humidity: item.humidity,
          windSpeed: convertWindSpeed(item.speed),
          description: item.weather[0].description,
          icon: item.weather[0].icon,
          pop: Math.round(item.pop * 100), // convert to percentage
          rain: item.rain,
          snow: item.snow,
        } as ProcessedDailyForecast;
      }) || [];

    // Group by date for the chart
    const groupedData: { [key: string]: WeatherDataPoint } = weatherData.reduce(
      (acc: { [key: string]: WeatherDataPoint }, curr: WeatherDataPoint) => {
        if (!acc[curr.date]) {
          acc[curr.date] = { ...curr };
        } else {
          acc[curr.date].minTemp = Math.min(acc[curr.date].minTemp, curr.minTemp);
          acc[curr.date].maxTemp = Math.max(acc[curr.date].maxTemp, curr.maxTemp);
        }
        return acc;
      },
      {} as { [key: string]: WeatherDataPoint },
    );

    const chartData = Object.values(groupedData);

    // Group by date for hourly forecast charts
    const hourlyDataByDay: { [key: string]: WeatherDataPoint[] } = weatherData.reduce(
      (acc: { [key: string]: WeatherDataPoint[] }, curr: WeatherDataPoint) => {
        if (!acc[curr.date]) {
          acc[curr.date] = [];
        }
        acc[curr.date].push(curr);
        return acc;
      },
      {} as { [key: string]: WeatherDataPoint[] },
    );

    // Get min and max temperatures for chart scaling
    const minTemp = Math.min(...weatherData.map((d: WeatherDataPoint) => d.minTemp));
    const maxTemp = Math.max(...weatherData.map((d: WeatherDataPoint) => d.maxTemp));

    // Get current weather (first item in the list)
    const currentWeather = weatherData[0];

    // Get sorted days
    const days = Object.keys(hourlyDataByDay).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    return {
      chartData,
      hourlyDataByDay,
      currentWeather,
      minTemp,
      maxTemp,
      days,
      airPollution,
      airPollutionForecast,
      dailyForecast,
    };
  }, [result]);

  // Set initial selected day
  React.useEffect(() => {
    if (days.length > 0 && !selectedDay) {
      setSelectedDay(days[0]);
    }
  }, [days, selectedDay]);

  const chartConfig: ChartConfig = useMemo(
    () => ({
      minTemp: {
        label: 'Min Temp.',
        color: 'hsl(var(--chart-1))',
      },
      maxTemp: {
        label: 'Max Temp.',
        color: 'hsl(var(--chart-2))',
      },
    }),
    [],
  );

  // Function to render weather condition badge
  const renderWeatherBadge = (description: string) => {
    const getColorClass = (desc: string) => {
      const lowerDesc = desc.toLowerCase();
      if (lowerDesc.includes('rain') || lowerDesc.includes('drizzle'))
        return 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      if (lowerDesc.includes('cloud'))
        return 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300';
      if (lowerDesc.includes('clear')) return 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
      if (lowerDesc.includes('snow')) return 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300';
      if (lowerDesc.includes('thunder') || lowerDesc.includes('storm'))
        return 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
      if (lowerDesc.includes('mist') || lowerDesc.includes('fog'))
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
      return 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300';
    };

    return (
      <Badge className={`font-normal capitalize py-0.5 text-xs ${getColorClass(description)}`}>{description}</Badge>
    );
  };

  return (
    <Card className="my-2 py-0 shadow-none bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 gap-0">
      <CardHeader className="py-2 px-3 sm:px-4">
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-neutral-800 dark:text-neutral-100 text-base truncate">
              {result.geocoding?.name || result.city.name}, {result.geocoding?.country || result.city.country}
            </CardTitle>
            <div className="flex items-center mt-1 gap-2">
              {renderWeatherBadge(currentWeather.description)}
              {currentWeather.pop > 0 && (
                <Badge className="font-normal bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 py-0.5 text-xs">
                  {currentWeather.pop}% rain
                </Badge>
              )}
              {airPollution &&
                (() => {
                  const { label, colorClass } = getAirQualityInfo(airPollution.main.aqi);
                  return <Badge className={`font-normal py-0.5 text-xs ${colorClass}`}>AQI: {label}</Badge>;
                })()}
            </div>
          </div>

          {/* Current Weather Brief */}
          <div className="flex items-center ml-4">
            <div className="text-right">
              <div className="text-2xl sm:text-3xl font-light text-neutral-800 dark:text-neutral-100">
                {currentWeather.temp}°C
              </div>
              <div className="text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400">
                Feels like {currentWeather.feelsLike}°C
              </div>
            </div>
            <div className="h-12 w-12 flex items-center justify-center ml-2">
              <Image
                src={getWeatherIconUrl(currentWeather.icon)}
                alt={currentWeather.description}
                className="h-10 w-10"
                width={40}
                height={40}
                unoptimized
              />
            </div>
          </div>
        </div>

        {/* Current weather details - compact layout with icons */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          <Badge
            variant="outline"
            className="flex items-center gap-1 py-1 px-3 border rounded-full bg-white/50 dark:bg-neutral-800/50"
          >
            <Thermometer className="h-3 w-3 text-rose-500 dark:text-rose-400" />
            <span className="font-medium text-neutral-800 dark:text-neutral-200">
              {currentWeather.humidity}% Humidity
            </span>
          </Badge>
          <Badge
            variant="outline"
            className="flex items-center gap-1 py-1 px-3 border rounded-full bg-white/50 dark:bg-neutral-800/50"
          >
            <Wind className="h-3 w-3 text-blue-500 dark:text-blue-400" />
            <span className="font-medium text-neutral-800 dark:text-neutral-200">{currentWeather.windSpeed} km/h</span>
          </Badge>
          <Badge
            variant="outline"
            className="flex items-center gap-1 py-1 px-3 border rounded-full bg-white/50 dark:bg-neutral-800/50"
          >
            <Droplets className="h-3 w-3 text-sky-500 dark:text-sky-400" />
            <span className="font-medium text-neutral-800 dark:text-neutral-200">{currentWeather.pressure} hPa</span>
          </Badge>
          <Badge
            variant="outline"
            className="flex items-center gap-1 py-1 px-3 border rounded-full bg-white/50 dark:bg-neutral-800/50"
          >
            <Cloud className="h-3 w-3 text-gray-500 dark:text-gray-400" />
            <span className="font-medium text-neutral-800 dark:text-neutral-200">{currentWeather.clouds}% Clouds</span>
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <Tabs defaultValue="chart" className="w-full">
          <TabsList className="mx-2 sm:mx-4">
            <TabsTrigger value="chart" className="text-[10px] sm:text-xs px-2 sm:px-3">
              5-Day Overview
            </TabsTrigger>
            <TabsTrigger value="detailed" className="text-[10px] sm:text-xs px-2 sm:px-3">
              Hourly Forecast
            </TabsTrigger>
            <TabsTrigger value="daily" className="text-[10px] sm:text-xs px-2 sm:px-3">
              16-Day Forecast
            </TabsTrigger>
            <TabsTrigger value="airquality" className="text-[10px] sm:text-xs px-2 sm:px-3">
              Air Quality
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chart" className="pt-2 px-2 sm:px-4 pb-0">
            {/* Legend for 5-day overview */}
            <div className="flex items-center justify-center gap-4 mb-2">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[oklch(0.488_0.243_264.376)]" />
                <span className="text-[9px] sm:text-[10px] text-neutral-600 dark:text-neutral-400">
                  Min Temperature
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[oklch(0.696_0.17_162.48)]" />
                <span className="text-[9px] sm:text-[10px] text-neutral-600 dark:text-neutral-400">
                  Max Temperature
                </span>
              </div>
            </div>
            <ChartContainer config={chartConfig} className="aspect-auto! h-[180px] sm:h-[200px]">
              <ResponsiveContainer width="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { weekday: 'short' })}
                    stroke="#9CA3AF"
                    tick={{ fontSize: 9 }}
                    height={30}
                  />
                  <YAxis
                    domain={[Math.floor(minTemp) - 2, Math.ceil(maxTemp) + 2]}
                    tickFormatter={(value) => `${value}°C`}
                    stroke="#9CA3AF"
                    tick={{ fontSize: 9 }}
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

            {/* 5-day forecast details in columns */}
            <div className="mt-3 mb-2">
              <div className="flex justify-between overflow-x-auto no-scrollbar pb-2">
                {chartData.map((day, index) => (
                  <div
                    key={index}
                    className="flex flex-col items-center min-w-[60px] sm:min-w-[70px] p-1.5 sm:p-2 mx-0.5"
                  >
                    <div className="text-xs font-medium text-neutral-800 dark:text-neutral-200">
                      {index === 0
                        ? 'Today'
                        : index === 1
                          ? 'Tmrw'
                          : new Date(day.date).toLocaleDateString(undefined, { weekday: 'short' })}
                    </div>

                    <Image
                      src={getWeatherIconUrl(day.icon)}
                      alt={day.description}
                      className="h-8 w-8 my-1"
                      width={32}
                      height={32}
                      unoptimized
                    />

                    <div className="flex items-center gap-1 text-xs">
                      <span className="font-medium text-rose-500 dark:text-rose-400">{day.maxTemp}°</span>
                      <span className="text-neutral-400 dark:text-neutral-500">{day.minTemp}°</span>
                    </div>

                    {day.pop > 20 && (
                      <div className="mt-1 flex items-center gap-0.5 text-[10px] text-blue-500 dark:text-blue-400">
                        <Droplets className="h-3 w-3" />
                        {day.pop}%
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="detailed" className="px-2 sm:px-4 pb-2">
            {/* Day selector tabs */}
            <div className="mb-3 -mx-1 px-1">
              <div className="flex overflow-x-auto no-scrollbar gap-1 py-1">
                {days.map((day, index) => (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`px-3 py-1 text-xs rounded-full transition-colors whitespace-nowrap flex-shrink-0 ${
                      selectedDay === day
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-800/50 dark:text-blue-200 font-medium'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800/40 dark:text-neutral-400 dark:hover:bg-neutral-800/60'
                    }`}
                  >
                    {index === 0
                      ? 'Today'
                      : index === 1
                        ? 'Tomorrow'
                        : new Date(day).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}
                  </button>
                ))}
              </div>
            </div>

            {/* Hourly forecast chart for selected day */}
            {selectedDay && hourlyDataByDay[selectedDay] && (
              <div className="mt-2">
                {/* Legend for hourly forecast */}
                <div className="flex items-center justify-center gap-4 mb-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-[#ff9500]" />
                    <span className="text-[10px] text-neutral-600 dark:text-neutral-400">Temperature</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-[#0ea5e9]" />
                    <span className="text-[10px] text-neutral-600 dark:text-neutral-400">Precipitation</span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart
                    data={hourlyDataByDay[selectedDay].map((item) => ({
                      ...item,
                      time: formatTime(item.timestamp),
                      precipitation: item.pop,
                    }))}
                    margin={{ top: 5, right: 5, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ff9500" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ff9500" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="precipGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="#9CA3AF" />
                    <YAxis
                      yAxisId="temp"
                      domain={[Math.floor(minTemp) - 2, Math.ceil(maxTemp) + 2]}
                      tickFormatter={(value) => `${value}°C`}
                      tick={{ fontSize: 10 }}
                      stroke="#9CA3AF"
                    />
                    <YAxis
                      yAxisId="precip"
                      orientation="right"
                      domain={[0, 100]}
                      tickFormatter={(value) => `${value}%`}
                      tick={{ fontSize: 10 }}
                      stroke="#9CA3AF"
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="temp"
                      name="Temperature"
                      stroke="#ff9500"
                      fillOpacity={1}
                      fill="url(#tempGradient)"
                      yAxisId="temp"
                    />
                    <Area
                      type="monotone"
                      dataKey="precipitation"
                      name="Precipitation (%)"
                      stroke="#0ea5e9"
                      fillOpacity={1}
                      fill="url(#precipGradient)"
                      yAxisId="precip"
                    />
                  </AreaChart>
                </ResponsiveContainer>

                {/* Icons and conditions underneath the chart */}
                <div className="flex justify-between overflow-x-auto py-2 mt-1 -mx-1 px-1">
                  {hourlyDataByDay[selectedDay].map((item, i) => (
                    <div key={i} className="flex flex-col items-center px-1 min-w-[40px]">
                      <div className="text-[10px] text-neutral-500 dark:text-neutral-400">
                        {formatTime(item.timestamp)}
                      </div>
                      <Image
                        src={getWeatherIconUrl(item.icon)}
                        alt={item.description}
                        className="h-6 w-6"
                        width={24}
                        height={24}
                        unoptimized
                      />
                      <div className="text-[10px] font-medium text-neutral-800 dark:text-neutral-200">
                        {item.temp}°C
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="daily" className="px-2 sm:px-4 pb-2">
            {dailyForecast && dailyForecast.length > 0 ? (
              <div className="mt-2">
                {/* Legend for daily forecast */}
                <div className="flex items-center justify-center gap-4 mb-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-[#ff9500]" />
                    <span className="text-[10px] text-neutral-600 dark:text-neutral-400">Max Temp</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-[#0ea5e9]" />
                    <span className="text-[10px] text-neutral-600 dark:text-neutral-400">Min Temp</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-[#6366f1]" />
                    <span className="text-[10px] text-neutral-600 dark:text-neutral-400">Precipitation</span>
                  </div>
                </div>
                {/* Daily forecast chart */}
                <div className="h-[180px] sm:h-[200px] mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyForecast} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                      <defs>
                        <linearGradient id="maxTempGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ff9500" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#ff9500" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="minTempGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="precipGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                      <XAxis
                        dataKey="timestamp"
                        tickFormatter={(value) =>
                          new Date(value * 1000).toLocaleDateString(undefined, {
                            weekday: 'short',
                            day: 'numeric',
                          })
                        }
                        tick={{ fontSize: 10 }}
                        stroke="#9CA3AF"
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={50}
                      />
                      <YAxis
                        yAxisId="temp"
                        domain={[
                          Math.floor(Math.min(...dailyForecast.map((d: ProcessedDailyForecast) => d.minTemp)) - 2),
                          Math.ceil(Math.max(...dailyForecast.map((d: ProcessedDailyForecast) => d.maxTemp)) + 2),
                        ]}
                        tickFormatter={(value) => `${value}°C`}
                        tick={{ fontSize: 10 }}
                        stroke="#9CA3AF"
                      />
                      <YAxis
                        yAxisId="precip"
                        orientation="right"
                        domain={[0, 100]}
                        tickFormatter={(value) => `${value}%`}
                        tick={{ fontSize: 10 }}
                        stroke="#9CA3AF"
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="custom-tooltip bg-white dark:bg-neutral-800 p-2 border border-neutral-200 dark:border-neutral-700 rounded-md text-xs shadow-sm">
                                <p className="mb-1 font-medium">
                                  {new Date(data.timestamp * 1000).toLocaleDateString(undefined, {
                                    weekday: 'long',
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </p>
                                <div className="space-y-1">
                                  <p className="flex items-center justify-between">
                                    <span className="flex items-center gap-1">
                                      <span className="w-2 h-2 rounded-full bg-[#ff9500]"></span>
                                      Max Temperature
                                    </span>
                                    <span className="font-medium">{data.maxTemp}°C</span>
                                  </p>
                                  <p className="flex items-center justify-between">
                                    <span className="flex items-center gap-1">
                                      <span className="w-2 h-2 rounded-full bg-[#0ea5e9]"></span>
                                      Min Temperature
                                    </span>
                                    <span className="font-medium">{data.minTemp}°C</span>
                                  </p>
                                  <p className="flex items-center justify-between">
                                    <span className="flex items-center gap-1">
                                      <span className="w-2 h-2 rounded-full bg-[#6366f1]"></span>
                                      Precipitation
                                    </span>
                                    <span className="font-medium">{data.pop}%</span>
                                  </p>
                                  {data.rain && (
                                    <p className="flex items-center justify-between text-neutral-600 dark:text-neutral-400">
                                      <span>Rain</span>
                                      <span>{data.rain} mm</span>
                                    </p>
                                  )}
                                  {data.snow && (
                                    <p className="flex items-center justify-between text-neutral-600 dark:text-neutral-400">
                                      <span>Snow</span>
                                      <span>{data.snow} mm</span>
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="maxTemp"
                        name="Max Temperature"
                        stroke="#ff9500"
                        fillOpacity={0.3}
                        fill="url(#maxTempGradient)"
                        yAxisId="temp"
                      />
                      <Area
                        type="monotone"
                        dataKey="minTemp"
                        name="Min Temperature"
                        stroke="#0ea5e9"
                        fillOpacity={0.3}
                        fill="url(#minTempGradient)"
                        yAxisId="temp"
                      />
                      <Area
                        type="monotone"
                        dataKey="pop"
                        name="Precipitation"
                        stroke="#6366f1"
                        fillOpacity={0.3}
                        fill="url(#precipGradient)"
                        yAxisId="precip"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Daily forecast cards - scrollable */}
                <div className="max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-700 scrollbar-track-transparent pr-1">
                  <div className="space-y-2">
                    {dailyForecast.map((day: ProcessedDailyForecast, index: number) => (
                      <div
                        key={day.timestamp}
                        className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
                      >
                        <div className="flex items-center gap-2 sm:gap-3 flex-1">
                          <div className="w-8 sm:w-10 text-center flex-shrink-0">
                            <div className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                              {index === 0
                                ? 'Today'
                                : index === 1
                                  ? 'Tmrw'
                                  : new Date(day.timestamp * 1000).toLocaleDateString(undefined, { weekday: 'short' })}
                            </div>
                            <div className="text-[10px] text-neutral-500 dark:text-neutral-500">
                              {new Date(day.timestamp * 1000).toLocaleDateString(undefined, { day: 'numeric' })}
                            </div>
                          </div>

                          <div className="w-8 sm:w-10 flex-shrink-0">
                            <Image
                              src={getWeatherIconUrl(day.icon)}
                              alt={day.description}
                              className="h-10 w-10"
                              width={40}
                              height={40}
                              unoptimized
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="text-xs capitalize text-neutral-600 dark:text-neutral-400 truncate">
                              {day.description}
                            </div>
                            {day.pop > 20 && (
                              <div className="text-[10px] text-blue-500 dark:text-blue-400 flex items-center gap-0.5">
                                <Droplets className="h-3 w-3" />
                                {day.pop}% chance of rain
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                          <div className="text-right">
                            <div className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                              {day.maxTemp}°
                            </div>
                            <div className="text-xs text-neutral-500 dark:text-neutral-400">{day.minTemp}°</div>
                          </div>

                          <div className="border-l border-neutral-200 dark:border-neutral-700 pl-2 flex flex-col items-end">
                            <div className="text-[10px] text-neutral-500 flex items-center">
                              <Wind className="h-3 w-3 mr-0.5 text-blue-500 dark:text-blue-400" />
                              {day.windSpeed}
                            </div>
                            <div className="text-[10px] text-neutral-500 flex items-center">
                              <Droplets className="h-3 w-3 mr-0.5 text-sky-500 dark:text-sky-400" />
                              {day.humidity}%
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-neutral-500 dark:text-neutral-400">
                16-day forecast data not available for this location
              </div>
            )}
          </TabsContent>

          <TabsContent value="airquality" className="px-2 sm:px-4 pb-2">
            <div className="mb-3">
              {airPollution ? (
                <div className="space-y-4">
                  {/* Current Air Quality Card */}
                  <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                          Current Air Quality
                        </h3>
                        <div className="mt-1">
                          {(() => {
                            const { label, colorClass } = getAirQualityInfo(airPollution.main.aqi);
                            return (
                              <Badge className={`font-normal py-1 px-2 ${colorClass}`}>
                                {label} (AQI: {airPollution.main.aqi})
                              </Badge>
                            );
                          })()}
                        </div>
                      </div>
                      <div className="text-sm text-right text-neutral-500 dark:text-neutral-400">
                        {new Date(airPollution.dt * 1000).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>

                    {/* Air Quality Components */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                      <div className="rounded-md bg-neutral-50 dark:bg-neutral-800 p-2">
                        <div className="text-[10px] uppercase text-neutral-500 dark:text-neutral-400">PM2.5</div>
                        <div className="font-medium text-sm">{airPollution.components.pm2_5.toFixed(1)} µg/m³</div>
                      </div>
                      <div className="rounded-md bg-neutral-50 dark:bg-neutral-800 p-2">
                        <div className="text-[10px] uppercase text-neutral-500 dark:text-neutral-400">PM10</div>
                        <div className="font-medium text-sm">{airPollution.components.pm10.toFixed(1)} µg/m³</div>
                      </div>
                      <div className="rounded-md bg-neutral-50 dark:bg-neutral-800 p-2">
                        <div className="text-[10px] uppercase text-neutral-500 dark:text-neutral-400">NO₂</div>
                        <div className="font-medium text-sm">{airPollution.components.no2.toFixed(1)} µg/m³</div>
                      </div>
                      <div className="rounded-md bg-neutral-50 dark:bg-neutral-800 p-2">
                        <div className="text-[10px] uppercase text-neutral-500 dark:text-neutral-400">O₃</div>
                        <div className="font-medium text-sm">{airPollution.components.o3.toFixed(1)} µg/m³</div>
                      </div>
                      <div className="rounded-md bg-neutral-50 dark:bg-neutral-800 p-2">
                        <div className="text-[10px] uppercase text-neutral-500 dark:text-neutral-400">SO₂</div>
                        <div className="font-medium text-sm">{airPollution.components.so2.toFixed(1)} µg/m³</div>
                      </div>
                      <div className="rounded-md bg-neutral-50 dark:bg-neutral-800 p-2">
                        <div className="text-[10px] uppercase text-neutral-500 dark:text-neutral-400">CO</div>
                        <div className="font-medium text-sm">{airPollution.components.co.toFixed(1)} µg/m³</div>
                      </div>
                    </div>
                  </div>

                  {/* Air Pollution Forecast Chart */}
                  <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
                    <h3 className="text-sm font-medium mb-4 text-neutral-800 dark:text-neutral-200">
                      Air Quality Forecast
                    </h3>

                    {airPollutionForecast.length > 0 ? (
                      <>
                        {/* Legend for air quality forecast */}
                        <div className="flex items-center justify-center gap-4 mb-2">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-[#8884d8]" />
                            <span className="text-[10px] text-neutral-600 dark:text-neutral-400">
                              Air Quality Index
                            </span>
                          </div>
                        </div>
                        <div className="h-[180px] sm:h-[200px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                              data={airPollutionForecast.slice(0, 24)}
                              margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                              <XAxis
                                dataKey="dt"
                                tickFormatter={(value) =>
                                  new Date(value * 1000).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                }
                                tick={{ fontSize: 10 }}
                                stroke="#9CA3AF"
                              />
                              <YAxis
                                domain={[0, 5]}
                                tickFormatter={(value) => value.toString()}
                                tick={{ fontSize: 10 }}
                                stroke="#9CA3AF"
                              />
                              <Tooltip
                                content={({ active, payload }) => {
                                  if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    const { label } = getAirQualityInfo(data.main.aqi);
                                    return (
                                      <div className="custom-tooltip bg-white dark:bg-neutral-800 p-2 border border-neutral-200 dark:border-neutral-700 rounded-md text-xs shadow-sm">
                                        <p className="mb-1 font-medium">
                                          {new Date(data.dt * 1000).toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                          })}
                                        </p>
                                        <p>
                                          AQI: {data.main.aqi} ({label})
                                        </p>
                                        <p>PM2.5: {data.components.pm2_5.toFixed(1)} µg/m³</p>
                                        <p>PM10: {data.components.pm10.toFixed(1)} µg/m³</p>
                                      </div>
                                    );
                                  }
                                  return null;
                                }}
                              />
                              <Area type="monotone" dataKey="main.aqi" stroke="#8884d8" fill="url(#aqiGradient)" />
                              <defs>
                                <linearGradient id="aqiGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                  <stop offset="95%" stopColor="#8884d8" stopOpacity={0.2} />
                                </linearGradient>
                              </defs>
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </>
                    ) : (
                      <div className="text-sm text-neutral-500 dark:text-neutral-400 text-center py-8">
                        No forecast data available
                      </div>
                    )}

                    {/* AQI Legend */}
                    <div className="mt-4 flex flex-wrap gap-2 justify-center">
                      <Badge className="bg-neutral-50 text-neutral-500 dark:bg-neutral-800/60 dark:text-neutral-400 font-normal">
                        0: None
                      </Badge>
                      <Badge className="bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 font-normal">
                        1: Good
                      </Badge>
                      <Badge className="bg-lime-50 text-lime-700 dark:bg-lime-900/30 dark:text-lime-300 font-normal">
                        2: Fair
                      </Badge>
                      <Badge className="bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 font-normal">
                        3: Moderate
                      </Badge>
                      <Badge className="bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 font-normal">
                        4: Poor
                      </Badge>
                      <Badge className="bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 font-normal">
                        5: Very Poor
                      </Badge>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 text-neutral-500 dark:text-neutral-400">
                  Air quality data not available for this location
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      <CardFooter className="border-t border-neutral-200 dark:border-neutral-800 py-0! px-4 m-0!">
        <div className="w-full flex justify-end items-center text-[9px] text-neutral-400 dark:text-neutral-500 py-1">
          OpenWeatherMap • {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </CardFooter>
    </Card>
  );
});

WeatherChart.displayName = 'WeatherChart';

export default WeatherChart;
