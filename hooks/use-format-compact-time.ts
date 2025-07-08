import { useLocale } from 'gt-next';
import {
  differenceInSeconds,
  differenceInMinutes,
  differenceInHours,
  differenceInDays,
  differenceInWeeks,
  differenceInMonths,
  differenceInYears,
} from 'date-fns';

export function useFormatCompactTime() {
  const currentLocale = useLocale();
  
  const formatCompactTime = (date: Date): string => {
    const now = new Date();
    const rtf = new Intl.RelativeTimeFormat(currentLocale, { 
      numeric: 'always', 
      style: 'narrow'
    });

    const seconds = differenceInSeconds(now, date);

    if (seconds < 60) {
      return rtf.format(-seconds, 'second');
    }
    
    const minutes = differenceInMinutes(now, date);
    if (minutes < 60) {
      return rtf.format(-minutes, 'minute');
    }
    
    const hours = differenceInHours(now, date);
    if (hours < 24) {
      return rtf.format(-hours, 'hour');
    }
    
    const days = differenceInDays(now, date);
    if (days < 7) {
      return rtf.format(-days, 'day');
    }
    
    const weeks = differenceInWeeks(now, date);
    if (weeks < 4) {
      return rtf.format(-weeks, 'week');
    }
    
    const months = differenceInMonths(now, date);
    if (months < 12) {
      return rtf.format(-months, 'month');
    }
    
    const years = differenceInYears(now, date);
    return rtf.format(-years, 'year');
  };

  return formatCompactTime;
}