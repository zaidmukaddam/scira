'use client';

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { convertTo12Hour, convertTo24Hour, formatTime12Hour } from '../utils/time-utils';

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  name: string;
  selectedDate?: Date;
  filterPastTimes?: boolean;
}

export function TimePicker({
  value,
  onChange,
  name,
  selectedDate,
  filterPastTimes = false,
}: TimePickerProps) {
  const now = new Date();
  const isToday =
    selectedDate &&
    selectedDate.getDate() === now.getDate() &&
    selectedDate.getMonth() === now.getMonth() &&
    selectedDate.getFullYear() === now.getFullYear();

  // If filterPastTimes is true and no date is selected, assume today for filtering
  const shouldFilterPastTimes = filterPastTimes && (isToday || !selectedDate);

  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  // Generate hour:minute options
  const generateHourMinuteOptions = () => {
    const options = [];
    for (let hour = 1; hour <= 12; hour++) {
      for (const minute of ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55']) {
        options.push({
          value: `${hour}:${minute}`,
          label: `${hour}:${minute}`,
        });
      }
    }
    return options;
  };

  // Filter options based on current time if needed
  const getFilteredOptions = (amPeriod: string) => {
    const allOptions = generateHourMinuteOptions();

    if (!shouldFilterPastTimes) return allOptions;

    const currentHour12 = convertTo12Hour(currentHour);
    const currentAmPm = currentHour < 12 ? 'AM' : 'PM';

    // If current time is PM and we're showing AM options, all AM times are for tomorrow (valid)
    // If current time is AM and we're showing PM options, all PM times are for today (valid)
    if (amPeriod !== currentAmPm) {
      if (currentAmPm === 'PM' && amPeriod === 'AM') {
        return allOptions; // All AM times are for tomorrow
      }
      if (currentAmPm === 'AM' && amPeriod === 'PM') {
        return allOptions; // All PM times are for today
      }
    }

    // Same period, filter based on current time
    return allOptions.filter((option) => {
      const [hourStr, minuteStr] = option.value.split(':');
      const optionHour12 = parseInt(hourStr);
      const optionMinute = parseInt(minuteStr);

      // Convert option time to 24-hour format for proper comparison
      const optionHour24 = convertTo24Hour(optionHour12, amPeriod);
      const optionTimeInMinutes = optionHour24 * 60 + optionMinute;
      const currentTimeInMinutes = currentHour * 60 + currentMinute;

      return optionTimeInMinutes > currentTimeInMinutes;
    });
  };

  const { hour12, minute, ampm } = formatTime12Hour(value || '09:00');

  // Filter AM/PM options based on current time if needed
  const getAvailableAmPmOptions = () => {
    if (!shouldFilterPastTimes) {
      return ['AM', 'PM'];
    }

    const currentAmPm = currentHour < 12 ? 'AM' : 'PM';

    // If current time is PM, only show PM (AM times have passed)
    if (currentAmPm === 'PM') {
      return ['PM'];
    }

    // If current time is AM, show both AM and PM
    return ['AM', 'PM'];
  };

  const availableAmPmOptions = getAvailableAmPmOptions();

  // Auto-correct AM/PM if current selection is not available
  const correctedAmPm = availableAmPmOptions.includes(ampm) ? ampm : availableAmPmOptions[0];
  const { hour12: correctedHour12, minute: correctedMinute } = formatTime12Hour(
    correctedAmPm !== ampm
      ? `${convertTo24Hour(parseInt(hour12), correctedAmPm).toString().padStart(2, '0')}:${minute}`
      : value || '09:00',
  );

  const currentHourMinute = `${correctedHour12}:${correctedMinute}`;
  const filteredHourMinuteOptions = getFilteredOptions(correctedAmPm);

  const handleHourMinuteChange = (newHourMinute: string) => {
    const [newHour, newMinute] = newHourMinute.split(':');
    const hour24 = convertTo24Hour(parseInt(newHour), correctedAmPm);
    const timeString = `${hour24.toString().padStart(2, '0')}:${newMinute}`;
    onChange(timeString);
  };

  const handleAmPmChange = (newAmPm: string) => {
    const hour24 = convertTo24Hour(parseInt(correctedHour12), newAmPm);
    const timeString = `${hour24.toString().padStart(2, '0')}:${correctedMinute}`;
    onChange(timeString);
  };

  return (
    <>
      <input type="hidden" name={name} value={value} />
      <div className="flex gap-2">
        <Select value={currentHourMinute} onValueChange={handleHourMinuteChange}>
          <SelectTrigger className="h-9 flex-1">
            <SelectValue placeholder="Time" />
          </SelectTrigger>
          <SelectContent className="max-h-[200px]">
            {filteredHourMinuteOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={correctedAmPm} onValueChange={handleAmPmChange}>
          <SelectTrigger className="h-9 w-[70px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableAmPmOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}
