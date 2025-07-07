import { useLocale } from 'gt-next';

export function useFormatRuntime() {
  const currentLocale = useLocale();

  const formatRuntime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    const hourFormatter = new Intl.NumberFormat(currentLocale, {
      style: 'unit',
      unit: 'hour',
      unitDisplay: 'narrow'
    });
    
    const minuteFormatter = new Intl.NumberFormat(currentLocale, {
      style: 'unit',
      unit: 'minute',
      unitDisplay: 'narrow'
    });

    if (hours > 0 && mins > 0) {
      return `${hourFormatter.format(hours)} ${minuteFormatter.format(mins)}`;
    } else if (hours > 0) {
      return hourFormatter.format(hours);
    } else {
      return minuteFormatter.format(mins);
    }
  };

  return formatRuntime;
}