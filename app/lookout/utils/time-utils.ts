// Helper functions for time conversion and formatting

export const convertTo12Hour = (hour24: number): number => {
  if (hour24 === 0) return 12;
  if (hour24 > 12) return hour24 - 12;
  return hour24;
};

export const convertTo24Hour = (hour12: number, ampm: string): number => {
  if (ampm === 'AM') {
    return hour12 === 12 ? 0 : hour12;
  } else {
    return hour12 === 12 ? 12 : hour12 + 12;
  }
};

export const formatTime12Hour = (time24: string) => {
  const [hour, minute] = time24.split(':');
  const hour24 = parseInt(hour);
  const hour12 = convertTo12Hour(hour24);
  const ampm = hour24 < 12 ? 'AM' : 'PM';
  return { hour12: hour12.toString(), minute, ampm };
};

export const formatNextRun = (date: Date | string, timezone: string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(dateObj);
};

export const formatFrequency = (frequency: string, time: string): string => {
  // Convert time to 12-hour format for display
  const { hour12, minute, ampm } = formatTime12Hour(time);
  const displayTime = `${hour12}:${minute} ${ampm}`;

  switch (frequency) {
    case 'daily':
      return `Daily at ${displayTime}`;
    case 'weekly':
      return `Thursdays at ${displayTime}`;
    case 'monthly':
      return `Monthly on the 1st at ${displayTime}`;
    case 'once':
      return `Once at ${displayTime}`;
    default:
      return `${frequency} at ${displayTime}`;
  }
};

export const formatRelativeTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return dateObj.toLocaleDateString();
};

export const isTimeInPast = (time: string, selectedDate?: Date): boolean => {
  if (!selectedDate) return false;

  const [hours, minutes] = time.split(':').map(Number);
  const targetDateTime = new Date(selectedDate);
  targetDateTime.setHours(hours, minutes, 0, 0);

  return targetDateTime < new Date();
};
