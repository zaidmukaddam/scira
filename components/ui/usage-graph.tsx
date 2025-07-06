import React from 'react';
import { cn } from '@/lib/utils';

interface UsageDay {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4; // 0 = no usage, 1-4 = increasing usage levels
}

interface UsageGraphProps {
  data: UsageDay[];
  className?: string;
}

export function UsageGraph({ data, className }: UsageGraphProps) {
  // Convert data array to a Map for O(1) lookup
  const dataMap = new Map(data.map((d) => [d.date, d]));

  // Generate the last 52 weeks of data ending with the current week
  const generateWeeks = () => {
    const weeks: UsageDay[][] = [];
    const today = new Date();

    // Find the most recent Saturday (or today if it's Saturday)
    const endDate = new Date(today);
    const todayDayOfWeek = today.getDay();
    const daysUntilSaturday = (6 - todayDayOfWeek + 7) % 7;
    endDate.setDate(today.getDate() + daysUntilSaturday);

    // Go back 52 weeks from the end date
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 52 * 7 + 1); // +1 to start on Sunday

    // Generate 52 weeks of data
    for (let week = 0; week < 52; week++) {
      const currentWeek: UsageDay[] = [];

      // Generate 7 days for this week (Sunday to Saturday)
      for (let day = 0; day < 7; day++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + week * 7 + day);

        // Skip future dates
        if (currentDate > today) {
          currentWeek.push({
            date: '',
            count: 0,
            level: 0,
          });
          continue;
        }

        const dateStr = currentDate.toISOString().split('T')[0];
        const dayData = dataMap.get(dateStr) || {
          date: dateStr,
          count: 0,
          level: 0 as const,
        };

        currentWeek.push(dayData);
      }

      weeks.push(currentWeek);
    }

    return weeks;
  };

  const weeks = generateWeeks();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Generate month labels based on actual weeks
  const getMonthLabels = () => {
    const labels: { month: string; position: number }[] = [];
    let lastMonth = -1;

    weeks.forEach((week, weekIndex) => {
      // Check the first day of each week
      const firstDayOfWeek = week[0];
      if (firstDayOfWeek && firstDayOfWeek.date) {
        const date = new Date(firstDayOfWeek.date);
        const month = date.getMonth();

        // Add label if it's a new month
        if (month !== lastMonth) {
          labels.push({
            month: monthNames[month],
            position: weekIndex,
          });
          lastMonth = month;
        }
      }
    });

    return labels;
  };

  const monthLabels = getMonthLabels();

  const getLevelColor = (level: number) => {
    switch (level) {
      case 0:
        return 'bg-muted';
      case 1:
        return 'bg-neutral-300 dark:bg-neutral-700';
      case 2:
        return 'bg-neutral-400 dark:bg-neutral-600';
      case 3:
        return 'bg-neutral-500 dark:bg-neutral-500';
      case 4:
        return 'bg-neutral-700 dark:bg-neutral-300';
      default:
        return 'bg-muted';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className={cn('w-full overflow-x-auto', className)}>
      <div className="flex flex-col gap-2">
        {/* Graph container with fixed aspect ratio */}
        <div className="inline-flex flex-col gap-2">
          {/* Month labels */}
          <div className="flex">
            <div className="w-8 mr-1" /> {/* Spacer for day labels */}
            <div className="flex gap-[3px]">
              {/* Create a placeholder grid to align month labels */}
              <div className="relative flex pb-4">
                {weeks.map((_, weekIndex) => (
                  <div key={`spacer-${weekIndex}`} className="w-[11px]" />
                ))}
                {/* Overlay month labels */}
                {monthLabels.map((label, index) => (
                  <span
                    key={index}
                    className="absolute text-[10px] text-muted-foreground"
                    style={{
                      left: `${label.position * 11 + label.position * 2.5}px`,
                    }}
                  >
                    {label.month}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Graph grid */}
          <div className="flex">
            {/* Day labels */}
            <div className="flex flex-col gap-[3px] mr-1">
              {days.map((day, index) => (
                <div key={index} className="h-[11px] flex items-center justify-end">
                  <span className="text-[10px] text-muted-foreground pr-1">
                    {index % 2 === 1 ? day.slice(0, 3) : ''}
                  </span>
                </div>
              ))}
            </div>

            {/* Graph squares */}
            <div className="flex gap-[3px]">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-[3px]">
                  {week.map((day, dayIndex) => (
                    <div
                      key={`${weekIndex}-${dayIndex}`}
                      className={cn('w-[11px] h-[11px] border border-border/20', getLevelColor(day.level))}
                      title={day.date ? `${day.count} messages on ${formatDate(day.date)}` : ''}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-[10px] text-muted-foreground mt-2">
          <span>Less</span>
          <div className="flex items-center gap-[3px]">
            {[0, 1, 2, 3, 4].map((level) => (
              <div key={level} className={cn('w-[11px] h-[11px] border border-border/20', getLevelColor(level))} />
            ))}
          </div>
          <span>More</span>
        </div>
      </div>
    </div>
  );
}

// Helper function to generate mock data for demonstration
export function generateMockUsageData(): UsageDay[] {
  const data: UsageDay[] = [];
  const today = new Date();

  for (let i = 0; i < 364; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);

    // Generate random usage data with some patterns
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const baseCount = isWeekend ? Math.floor(Math.random() * 5) : Math.floor(Math.random() * 15);

    let level: 0 | 1 | 2 | 3 | 4;
    if (baseCount === 0) level = 0;
    else if (baseCount <= 3) level = 1;
    else if (baseCount <= 7) level = 2;
    else if (baseCount <= 12) level = 3;
    else level = 4;

    data.push({
      date: date.toISOString().split('T')[0],
      count: baseCount,
      level,
    });
  }

  return data;
}
