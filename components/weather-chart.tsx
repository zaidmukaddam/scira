import React, { useMemo, useState } from 'react';
import { Card, CardHeader, CardContent, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs as KumoTabs } from '@cloudflare/kumo';
import { Cloud, Droplets, Thermometer, Wind } from 'lucide-react';
import Image from 'next/image';

// Custom chart components (visx-based)
import { LineChart } from '@/components/charts/line-chart';
import { Line } from '@/components/charts/line';
import { AreaChart } from '@/components/charts/area-chart';
import { Area } from '@/components/charts/area';
import { Grid } from '@/components/charts/grid';
import { ChartTooltip } from '@/components/charts/tooltip';
import type { TooltipRow } from '@/components/charts/tooltip/tooltip-content';

// Chart colors using CSS variables for theme support
const chartColors = {
  minTemp: 'var(--chart-1)',
  maxTemp: 'var(--chart-2)',
  temp: 'var(--chart-1)',
  feelsLike: 'var(--chart-3)',
  pop: 'var(--chart-4)',
  aqi: 'var(--chart-5)',
  muted: 'var(--chart-foreground-muted)',
};

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
  rain?: number;
  snow?: number;
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

interface DailyForecastSummary {
  date: string;
  timestamp: number;
  minTemp: number;
  maxTemp: number;
  humidity: number;
  windSpeed: number;
  description: string;
  icon: string;
  pop: number;
  rain?: number;
  snow?: number;
}

interface OpenMeteo16DayData {
  date: string;
  timestamp: number;
  minTemp: number;
  maxTemp: number;
  humidity: number;
  windSpeed: number;
  description: string;
  icon: string;
  pop: number;
}

interface WeatherChartProps {
  result: any;
}

// Convert wind speed from m/s to km/h
function convertWindSpeed(speed: number): number {
  return Math.round(speed * 3.6);
}

// Get weather icon URL from code
function getWeatherIconUrl(iconCode: string): string {
  return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
}

// Map Open-Meteo WMO weather codes to OpenWeather icon codes and descriptions
function mapWMOCodeToWeather(code: number): { description: string; icon: string } {
  const codeMap: { [key: number]: { description: string; icon: string } } = {
    0: { description: 'clear sky', icon: '01d' },
    1: { description: 'mainly clear', icon: '01d' },
    2: { description: 'partly cloudy', icon: '02d' },
    3: { description: 'overcast', icon: '04d' },
    45: { description: 'foggy', icon: '50d' },
    48: { description: 'depositing rime fog', icon: '50d' },
    51: { description: 'light drizzle', icon: '09d' },
    53: { description: 'moderate drizzle', icon: '09d' },
    55: { description: 'dense drizzle', icon: '09d' },
    56: { description: 'light freezing drizzle', icon: '09d' },
    57: { description: 'dense freezing drizzle', icon: '09d' },
    61: { description: 'slight rain', icon: '10d' },
    63: { description: 'moderate rain', icon: '10d' },
    65: { description: 'heavy rain', icon: '10d' },
    66: { description: 'light freezing rain', icon: '13d' },
    67: { description: 'heavy freezing rain', icon: '13d' },
    71: { description: 'slight snow', icon: '13d' },
    73: { description: 'moderate snow', icon: '13d' },
    75: { description: 'heavy snow', icon: '13d' },
    77: { description: 'snow grains', icon: '13d' },
    80: { description: 'slight rain showers', icon: '09d' },
    81: { description: 'moderate rain showers', icon: '09d' },
    82: { description: 'violent rain showers', icon: '09d' },
    85: { description: 'slight snow showers', icon: '13d' },
    86: { description: 'heavy snow showers', icon: '13d' },
    95: { description: 'thunderstorm', icon: '11d' },
    96: { description: 'thunderstorm with slight hail', icon: '11d' },
    99: { description: 'thunderstorm with heavy hail', icon: '11d' },
  };

  return codeMap[code] || { description: 'unknown', icon: '01d' };
}

// Format timestamp to readable time
function formatTime(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Get air quality label and color from AQI value
function getAirQualityInfo(aqi: number): { label: string; colorClass: string } {
  switch (aqi) {
    case 0:
      return {
        label: 'None',
        colorClass: 'bg-muted text-muted-foreground',
      };
    case 1:
      return {
        label: 'Good',
        colorClass: 'bg-green-500/10 text-green-600 dark:text-green-400',
      };
    case 2:
      return {
        label: 'Fair',
        colorClass: 'bg-lime-500/10 text-lime-600 dark:text-lime-400',
      };
    case 3:
      return {
        label: 'Moderate',
        colorClass: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
      };
    case 4:
      return {
        label: 'Poor',
        colorClass: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
      };
    case 5:
      return {
        label: 'Very Poor',
        colorClass: 'bg-red-500/10 text-red-600 dark:text-red-400',
      };
    default:
      return {
        label: 'Unknown',
        colorClass: 'bg-muted text-muted-foreground',
      };
  }
}

const WeatherChart: React.FC<WeatherChartProps> = React.memo(({ result }) => {
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [weatherTab, setWeatherTab] = useState('chart');

  const {
    chartData,
    hourlyDataByDay,
    currentWeather,
    minTemp,
    maxTemp,
    days,
    airPollution,
    airPollutionForecast,
    dailySummary,
    openMeteo16Day,
  } = useMemo(() => {
    // Process 5-day/3-hour forecast data
    const weatherData = result.list.map((item: any) => {
      const date = new Date(item.dt * 1000);
      const rainVolume = item.rain?.['3h'];
      const snowVolume = item.snow?.['3h'];
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
        rain: typeof rainVolume === 'number' ? rainVolume : undefined,
        snow: typeof snowVolume === 'number' ? snowVolume : undefined,
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

    // Get sorted days
    const days = Object.keys(hourlyDataByDay).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    // Build daily summaries from 3-hour forecasts
    const dailySummary: DailyForecastSummary[] = days.map((day) => {
      const entries = hourlyDataByDay[day];
      const sortedEntries = [...entries].sort((a, b) => a.timestamp - b.timestamp);
      const representativeEntry =
        sortedEntries.find((entry) => entry.hour === 12) ||
        sortedEntries[Math.floor(sortedEntries.length / 2)] ||
        sortedEntries[0];
      const minTemp = Math.min(...entries.map((entry) => entry.minTemp));
      const maxTemp = Math.max(...entries.map((entry) => entry.maxTemp));
      const pop = Math.max(...entries.map((entry) => entry.pop));
      const humidity = Math.round(entries.reduce((sum, entry) => sum + entry.humidity, 0) / entries.length);
      const windSpeed = Math.round(entries.reduce((sum, entry) => sum + entry.windSpeed, 0) / entries.length);
      const rainTotal = entries.reduce((sum, entry) => sum + (entry.rain ?? 0), 0);
      const snowTotal = entries.reduce((sum, entry) => sum + (entry.snow ?? 0), 0);

      return {
        date: day,
        timestamp: sortedEntries[0].timestamp,
        minTemp,
        maxTemp,
        humidity,
        windSpeed,
        description: representativeEntry.description,
        icon: representativeEntry.icon,
        pop,
        rain: rainTotal > 0 ? Number(rainTotal.toFixed(1)) : undefined,
        snow: snowTotal > 0 ? Number(snowTotal.toFixed(1)) : undefined,
      };
    });

    const chartData = dailySummary;

    // Get min and max temperatures for chart scaling
    const minTemp = Math.min(...weatherData.map((d: WeatherDataPoint) => d.minTemp));
    const maxTemp = Math.max(...weatherData.map((d: WeatherDataPoint) => d.maxTemp));

    // Get current weather (first item in the list)
    const currentWeather = weatherData[0];

    // Process Open-Meteo 16-day forecast
    const openMeteo16Day: OpenMeteo16DayData[] =
      result.open_meteo_forecast?.daily
        ? result.open_meteo_forecast.daily.time.map((dateStr: string, index: number) => {
            const weatherInfo = mapWMOCodeToWeather(result.open_meteo_forecast.daily.weathercode[index]);
            return {
              date: dateStr,
              timestamp: new Date(dateStr).getTime() / 1000,
              minTemp: result.open_meteo_forecast.daily.temperature_2m_min[index] != null ? Number(result.open_meteo_forecast.daily.temperature_2m_min[index].toFixed(1)) : 0,
              maxTemp: result.open_meteo_forecast.daily.temperature_2m_max[index] != null ? Number(result.open_meteo_forecast.daily.temperature_2m_max[index].toFixed(1)) : 0,
              humidity: result.open_meteo_forecast.daily.relative_humidity_2m_max[index],
              windSpeed: convertWindSpeed(result.open_meteo_forecast.daily.windspeed_10m_max[index]),
              description: weatherInfo.description,
              icon: weatherInfo.icon,
              pop: result.open_meteo_forecast.daily.precipitation_probability_max[index] || 0,
            };
          })
        : [];

    return {
      chartData,
      hourlyDataByDay,
      currentWeather,
      minTemp,
      maxTemp,
      days,
      airPollution,
      airPollutionForecast,
      dailySummary,
      openMeteo16Day,
    };
  }, [result]);

  // Set initial selected day
  React.useEffect(() => {
    if (days.length > 0 && !selectedDay) {
      setSelectedDay(days[0]);
    }
  }, [days, selectedDay]);

  // Transform chart data for custom LineChart (needs Date objects)
  const lineChartData = useMemo(() => {
    return chartData.map((d) => ({
      ...d,
      date: new Date(d.date),
    }));
  }, [chartData]);

  // Transform air pollution forecast for custom AreaChart
  const aqiChartData = useMemo(() => {
    return airPollutionForecast.slice(0, 24).map((item: any) => ({
      date: new Date(item.dt * 1000),
      aqi: item.main.aqi,
      pm2_5: item.components.pm2_5,
      pm10: item.components.pm10,
    }));
  }, [airPollutionForecast]);

  // Transform hourly data for custom AreaChart (for selected day)
  const hourlyChartData = useMemo(() => {
    if (!selectedDay || !hourlyDataByDay[selectedDay]) return [];
    return hourlyDataByDay[selectedDay].map((item) => ({
      date: new Date(item.timestamp * 1000),
      temp: item.temp,
      feelsLike: item.feelsLike,
      pop: item.pop,
    }));
  }, [selectedDay, hourlyDataByDay]);

  // Transform 16-day forecast for custom AreaChart
  const extendedChartData = useMemo(() => {
    return openMeteo16Day.map((d) => ({
      date: new Date(d.timestamp * 1000),
      minTemp: d.minTemp,
      maxTemp: d.maxTemp,
      pop: d.pop,
    }));
  }, [openMeteo16Day]);

  // Function to render weather condition badge
  const renderWeatherBadge = (description: string) => {
    const getColorClass = (desc: string) => {
      const lowerDesc = desc.toLowerCase();
      if (lowerDesc.includes('rain') || lowerDesc.includes('drizzle'))
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
      if (lowerDesc.includes('cloud'))
        return 'bg-muted text-muted-foreground';
      if (lowerDesc.includes('clear')) return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400';
      if (lowerDesc.includes('snow')) return 'bg-sky-500/10 text-sky-600 dark:text-sky-400';
      if (lowerDesc.includes('thunder') || lowerDesc.includes('storm'))
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400';
      if (lowerDesc.includes('mist') || lowerDesc.includes('fog'))
        return 'bg-muted text-muted-foreground';
      return 'bg-muted text-muted-foreground';
    };

    return (
      <Badge className={`font-normal capitalize py-0.5 text-xs ${getColorClass(description)}`}>{description}</Badge>
    );
  };

  return (
    <Card className="my-2 py-0 shadow-none bg-card border-border gap-0">
      <CardHeader className="py-2 px-3 sm:px-4">
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-card-foreground text-base truncate">
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
              <div className="text-2xl sm:text-3xl font-light text-foreground">
                {currentWeather.temp}°C
              </div>
              <div className="text-[10px] sm:text-xs text-muted-foreground">
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
            className="flex items-center gap-1 py-1 px-3 border-border rounded-full bg-muted/50"
          >
            <Thermometer className="h-3 w-3 text-rose-500" />
            <span className="font-medium text-foreground">
              {currentWeather.humidity}% Humidity
            </span>
          </Badge>
          <Badge
            variant="outline"
            className="flex items-center gap-1 py-1 px-3 border-border rounded-full bg-muted/50"
          >
            <Wind className="h-3 w-3 text-blue-500" />
            <span className="font-medium text-foreground">{currentWeather.windSpeed} km/h</span>
          </Badge>
          <Badge
            variant="outline"
            className="flex items-center gap-1 py-1 px-3 border-border rounded-full bg-muted/50"
          >
            <Droplets className="h-3 w-3 text-sky-500" />
            <span className="font-medium text-foreground">{currentWeather.pressure} hPa</span>
          </Badge>
          <Badge
            variant="outline"
            className="flex items-center gap-1 py-1 px-3 border-border rounded-full bg-muted/50"
          >
            <Cloud className="h-3 w-3 text-muted-foreground" />
            <span className="font-medium text-foreground">{currentWeather.clouds}% Clouds</span>
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="w-full">
          <div className="mx-2 sm:mx-4">
            <KumoTabs
              variant="segmented"
              value={weatherTab}
              onValueChange={setWeatherTab}
              className="mb-4 w-full [--color-kumo-tint:var(--muted)] [--text-color-kumo-strong:var(--muted-foreground)] [--text-color-kumo-default:var(--foreground)] [--color-kumo-overlay:var(--background)] [--color-kumo-fill-hover:var(--border)]"
              listClassName="w-full [&>button]:flex-1 [&>button]:justify-center"
              tabs={[
                { value: 'chart', label: '5-Day Overview' },
                { value: 'detailed', label: '3-Hour Forecast' },
                { value: 'extended', label: '16-Day Forecast' },
                { value: 'airquality', label: 'Air Quality' },
              ]}
            />
          </div>

          {weatherTab === 'chart' && <div className="pt-2 px-2 sm:px-4 pb-0">
            {/* Legend for 5-day overview */}
            <div className="flex items-center justify-center gap-4 mb-2">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-chart-1" />
                <span className="text-[9px] sm:text-[10px] text-muted-foreground">
                  Min Temperature
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-chart-2" />
                <span className="text-[9px] sm:text-[10px] text-muted-foreground">
                  Max Temperature
                </span>
              </div>
            </div>
            <div className="h-[180px] sm:h-[200px]">
              <LineChart
                data={lineChartData}
                xDataKey="date"
                margin={{ top: 10, right: 10, bottom: 30, left: 10 }}
                animationDuration={800}
                aspectRatio="auto"
                className="h-full"
              >
                <Grid horizontal numTicksRows={4} />
                <Line
                  dataKey="minTemp"
                  stroke={chartColors.minTemp}
                  strokeWidth={2}
                />
                <Line
                  dataKey="maxTemp"
                  stroke={chartColors.maxTemp}
                  strokeWidth={2}
                />
                <ChartTooltip
                  showDatePill
                  rows={(point) => [
                    {
                      color: chartColors.minTemp,
                      label: 'Min Temp',
                      value: `${point.minTemp}°C`,
                    },
                    {
                      color: chartColors.maxTemp,
                      label: 'Max Temp',
                      value: `${point.maxTemp}°C`,
                    },
                  ] as TooltipRow[]}
                />
              </LineChart>
            </div>

            {/* 5-day forecast details in columns */}
            <div className="mt-3 mb-2">
              <div className="flex justify-between overflow-x-auto no-scrollbar pb-2">
                {chartData.map((day, index) => (
                  <div
                    key={index}
                    className="flex flex-col items-center min-w-[60px] sm:min-w-[70px] p-1.5 sm:p-2 mx-0.5"
                  >
                    <div className="text-xs font-medium text-foreground">
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
                      <span className="text-muted-foreground">{day.minTemp}°</span>
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
          </div>}

          {weatherTab === 'detailed' && <div className="px-2 sm:px-4 pb-2">
            {/* Day selector tabs */}
            <div className="mb-3 -mx-1 px-1">
              <div className="flex overflow-x-auto no-scrollbar gap-1 py-1">
                {days.map((day, index) => (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`px-3 py-1 text-xs rounded-full transition-colors whitespace-nowrap shrink-0 ${
                      selectedDay === day
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
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
            {selectedDay && hourlyChartData.length > 0 && (
              <div className="mt-2">
                {/* Legend for hourly forecast */}
                <div className="flex items-center justify-center gap-4 mb-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-chart-1" />
                    <span className="text-[10px] text-muted-foreground">Temperature</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-chart-3" />
                    <span className="text-[10px] text-muted-foreground">Feels Like</span>
                  </div>
                </div>
                <div className="h-[200px]">
                  <AreaChart
                    data={hourlyChartData}
                    xDataKey="date"
                    margin={{ top: 10, right: 10, bottom: 30, left: 10 }}
                    animationDuration={800}
                    aspectRatio="auto"
                    className="h-full"
                  >
                    <Grid horizontal numTicksRows={4} />
                    <Area
                      dataKey="temp"
                      fill={chartColors.temp}
                      fillOpacity={0.3}
                      stroke={chartColors.temp}
                      strokeWidth={2}
                    />
                    <Area
                      dataKey="feelsLike"
                      fill={chartColors.feelsLike}
                      fillOpacity={0.2}
                      stroke={chartColors.feelsLike}
                      strokeWidth={1.5}
                    />
                    <ChartTooltip
                      showDatePill
                      rows={(point) => [
                        {
                          color: chartColors.temp,
                          label: 'Temperature',
                          value: `${point.temp}°C`,
                        },
                        {
                          color: chartColors.feelsLike,
                          label: 'Feels Like',
                          value: `${point.feelsLike}°C`,
                        },
                        {
                          color: chartColors.muted,
                          label: 'Rain Chance',
                          value: `${point.pop}%`,
                        },
                      ] as TooltipRow[]}
                    />
                  </AreaChart>
                </div>

                {/* Icons and conditions underneath the chart */}
                <div className="flex justify-between overflow-x-auto py-2 mt-1 -mx-1 px-1">
                  {hourlyDataByDay[selectedDay].map((item, i) => (
                    <div key={i} className="flex flex-col items-center px-1 min-w-[40px]">
                      <div className="text-[10px] text-muted-foreground">
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
                      <div className="text-[10px] font-medium text-foreground">
                        {item.temp}°C
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>}

          {weatherTab === 'extended' && <div className="px-2 sm:px-4 pb-2">
            {extendedChartData.length > 0 ? (
              <div className="mt-2">
                {/* Legend for 16-day forecast */}
                <div className="flex items-center justify-center gap-4 mb-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-chart-2" />
                    <span className="text-[10px] text-muted-foreground">Max Temp</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-chart-1" />
                    <span className="text-[10px] text-muted-foreground">Min Temp</span>
                  </div>
                </div>
                {/* 16-day forecast chart */}
                <div className="h-[180px] sm:h-[200px] mb-4">
                  <AreaChart
                    data={extendedChartData}
                    xDataKey="date"
                    margin={{ top: 10, right: 10, bottom: 30, left: 10 }}
                    animationDuration={800}
                    aspectRatio="auto"
                    className="h-full"
                  >
                    <Grid horizontal numTicksRows={4} />
                    <Area
                      dataKey="maxTemp"
                      fill={chartColors.maxTemp}
                      fillOpacity={0.3}
                      stroke={chartColors.maxTemp}
                      strokeWidth={2}
                    />
                    <Area
                      dataKey="minTemp"
                      fill={chartColors.minTemp}
                      fillOpacity={0.3}
                      stroke={chartColors.minTemp}
                      strokeWidth={2}
                    />
                    <ChartTooltip
                      showDatePill
                      rows={(point) => [
                        {
                          color: chartColors.maxTemp,
                          label: 'Max Temp',
                          value: `${point.maxTemp}°C`,
                        },
                        {
                          color: chartColors.minTemp,
                          label: 'Min Temp',
                          value: `${point.minTemp}°C`,
                        },
                        {
                          color: chartColors.muted,
                          label: 'Rain Chance',
                          value: `${point.pop}%`,
                        },
                      ] as TooltipRow[]}
                    />
                  </AreaChart>
                </div>

                {/* 16-day forecast cards - scrollable */}
                <div className="max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-700 scrollbar-track-transparent pr-1">
                  <div className="space-y-2">
                    {openMeteo16Day.map((day: OpenMeteo16DayData, index: number) => (
                      <div
                        key={day.timestamp}
                        className="flex items-center justify-between p-2 rounded-lg bg-card border border-border"
                      >
                        <div className="flex items-center gap-2 sm:gap-3 flex-1">
                          <div className="w-8 sm:w-10 text-center shrink-0">
                            <div className="text-xs font-medium text-foreground">
                              {index === 0
                                ? 'Today'
                                : index === 1
                                  ? 'Tmrw'
                                  : new Date(day.timestamp * 1000).toLocaleDateString(undefined, { weekday: 'short' })}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {new Date(day.timestamp * 1000).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </div>
                          </div>

                          <div className="w-8 sm:w-10 shrink-0">
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
                            <div className="text-xs capitalize text-muted-foreground truncate">
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

                        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                          <div className="text-right">
                            <div className="text-sm font-medium text-foreground">
                              {day.maxTemp}°
                            </div>
                            <div className="text-xs text-muted-foreground">{day.minTemp}°</div>
                          </div>

                          <div className="border-l border-border pl-2 flex flex-col items-end">
                            <div className="text-[10px] text-muted-foreground flex items-center">
                              <Wind className="h-3 w-3 mr-0.5 text-blue-500" />
                              {day.windSpeed}
                            </div>
                            <div className="text-[10px] text-muted-foreground flex items-center">
                              <Droplets className="h-3 w-3 mr-0.5 text-sky-500" />
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
              <div className="text-center py-10 text-muted-foreground">
                16-day forecast data not available for this location
              </div>
            )}
          </div>}

          {weatherTab === 'airquality' && <div className="px-2 sm:px-4 pb-2">
            <div className="mb-3">
              {airPollution ? (
                <div className="space-y-4">
                  {/* Current Air Quality Card */}
                  <div className="rounded-lg border border-border bg-card p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-sm font-medium text-card-foreground">
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
                      <div className="text-sm text-right text-muted-foreground">
                        {new Date(airPollution.dt * 1000).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>

                    {/* Air Quality Components */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                      <div className="rounded-md bg-muted p-2">
                        <div className="text-[10px] uppercase text-muted-foreground">PM2.5</div>
                        <div className="font-medium text-sm text-foreground">{airPollution.components.pm2_5.toFixed(1)} µg/m³</div>
                      </div>
                      <div className="rounded-md bg-muted p-2">
                        <div className="text-[10px] uppercase text-muted-foreground">PM10</div>
                        <div className="font-medium text-sm text-foreground">{airPollution.components.pm10.toFixed(1)} µg/m³</div>
                      </div>
                      <div className="rounded-md bg-muted p-2">
                        <div className="text-[10px] uppercase text-muted-foreground">NO₂</div>
                        <div className="font-medium text-sm text-foreground">{airPollution.components.no2.toFixed(1)} µg/m³</div>
                      </div>
                      <div className="rounded-md bg-muted p-2">
                        <div className="text-[10px] uppercase text-muted-foreground">O₃</div>
                        <div className="font-medium text-sm text-foreground">{airPollution.components.o3.toFixed(1)} µg/m³</div>
                      </div>
                      <div className="rounded-md bg-muted p-2">
                        <div className="text-[10px] uppercase text-muted-foreground">SO₂</div>
                        <div className="font-medium text-sm text-foreground">{airPollution.components.so2.toFixed(1)} µg/m³</div>
                      </div>
                      <div className="rounded-md bg-muted p-2">
                        <div className="text-[10px] uppercase text-muted-foreground">CO</div>
                        <div className="font-medium text-sm text-foreground">{airPollution.components.co.toFixed(1)} µg/m³</div>
                      </div>
                    </div>
                  </div>

                  {/* Air Pollution Forecast Chart */}
                  <div className="rounded-lg border border-border bg-card p-4">
                    <h3 className="text-sm font-medium mb-4 text-card-foreground">
                      Air Quality Forecast
                    </h3>

                    {aqiChartData.length > 0 ? (
                      <>
                        {/* Legend for air quality forecast */}
                        <div className="flex items-center justify-center gap-4 mb-2">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-chart-5" />
                            <span className="text-[10px] text-muted-foreground">
                              Air Quality Index
                            </span>
                          </div>
                        </div>
                        <div className="h-[180px] sm:h-[200px]">
                          <AreaChart
                            data={aqiChartData}
                            xDataKey="date"
                            margin={{ top: 10, right: 10, bottom: 30, left: 10 }}
                            animationDuration={800}
                            aspectRatio="auto"
                            className="h-full"
                          >
                            <Grid horizontal numTicksRows={5} />
                            <Area
                              dataKey="aqi"
                              fill={chartColors.aqi}
                              fillOpacity={0.4}
                              stroke={chartColors.aqi}
                              strokeWidth={2}
                            />
                            <ChartTooltip
                              showDatePill
                              rows={(point) => {
                                const { label } = getAirQualityInfo(point.aqi as number);
                                return [
                                  {
                                    color: chartColors.aqi,
                                    label: 'AQI',
                                    value: `${point.aqi} (${label})`,
                                  },
                                  {
                                    color: chartColors.muted,
                                    label: 'PM2.5',
                                    value: `${(point.pm2_5 as number).toFixed(1)} µg/m³`,
                                  },
                                  {
                                    color: chartColors.muted,
                                    label: 'PM10',
                                    value: `${(point.pm10 as number).toFixed(1)} µg/m³`,
                                  },
                                ] as TooltipRow[];
                              }}
                            />
                          </AreaChart>
                        </div>
                      </>
                    ) : (
                      <div className="text-sm text-muted-foreground text-center py-8">
                        No forecast data available
                      </div>
                    )}

                    {/* AQI Legend */}
                    <div className="mt-4 flex flex-wrap gap-2 justify-center">
                      <Badge className="bg-muted text-muted-foreground font-normal">
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
                <div className="text-center py-10 text-muted-foreground">
                  Air quality data not available for this location
                </div>
              )}
            </div>
          </div>}
        </div>
      </CardContent>

      <CardFooter className="border-t border-border py-0! px-4 m-0!">
        <div className="w-full flex justify-end items-center text-[9px] text-muted-foreground py-1">
          OpenWeatherMap • {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </CardFooter>
    </Card>
  );
});

WeatherChart.displayName = 'WeatherChart';

export default WeatherChart;
