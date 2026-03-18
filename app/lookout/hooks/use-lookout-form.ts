'use client';

import React from 'react';
import { sileo } from 'sileo';
import { DEFAULT_FORM_VALUES } from '../constants';
import { isTimeInPast } from '../utils/time-utils';

export interface LookoutFormData {
  title: string;
  prompt: string;
  frequency: 'once' | 'daily' | 'weekly' | 'monthly';
  time: string;
  timezone: string;
  date?: string;
  dayOfWeek?: string;
  searchMode?: string;
}

export interface LookoutFormHookReturn {
  // Form state
  selectedFrequency: string;
  selectedTime: string;
  selectedTimezone: string;
  selectedDate: Date | undefined;
  selectedDayOfWeek: string;
  selectedSearchMode: string;
  selectedExample: any | null;
  isCreateDialogOpen: boolean;
  editingLookout: any | null;

  // Form actions
  setSelectedFrequency: (frequency: string) => void;
  setSelectedTime: (time: string) => void;
  setSelectedTimezone: (timezone: string) => void;
  setSelectedDate: (date: Date | undefined) => void;
  setSelectedDayOfWeek: (day: string) => void;
  setSelectedSearchMode: (mode: string) => void;
  setSelectedExample: (example: any | null) => void;
  setIsCreateDialogOpen: (open: boolean) => void;
  setEditingLookout: (lookout: any | null) => void;

  // Form handlers
  handleDialogOpenChange: (open: boolean) => void;
  handleUseExample: (example: any) => void;
  populateFormForEdit: (lookout: any) => void;
  resetForm: () => void;

  // Form submission
  createLookoutFromForm: (formData: FormData, createLookout: any) => void;
  updateLookoutFromForm: (formData: FormData, updateLookout: any) => void;

  // Validation
  validateForm: (formData: FormData) => boolean;
}

export function useLookoutForm(detectedTimezone: string = DEFAULT_FORM_VALUES.TIMEZONE): LookoutFormHookReturn {
  console.log('🎯 Form hook received detectedTimezone:', detectedTimezone);

  // Form state
  const [selectedFrequency, setSelectedFrequency] = React.useState<string>(DEFAULT_FORM_VALUES.FREQUENCY);
  const [selectedTime, setSelectedTime] = React.useState<string>(DEFAULT_FORM_VALUES.TIME);
  const [selectedTimezone, setSelectedTimezone] = React.useState<string>(detectedTimezone);
  console.log('🔧 Initial selectedTimezone state:', detectedTimezone);
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>();
  const [selectedDayOfWeek, setSelectedDayOfWeek] = React.useState<string>(DEFAULT_FORM_VALUES.DAY_OF_WEEK);
  const [selectedSearchMode, setSelectedSearchMode] = React.useState<string>(DEFAULT_FORM_VALUES.SEARCH_MODE);
  const [selectedExample, setSelectedExample] = React.useState<any | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
  const [editingLookout, setEditingLookout] = React.useState<any | null>(null);

  // Update timezone when detected timezone changes
  React.useEffect(() => {
    console.log('⚡ useEffect triggered - detectedTimezone:', detectedTimezone, 'editingLookout:', !!editingLookout);
    if (!editingLookout) {
      console.log('📝 Setting selectedTimezone to:', detectedTimezone);
      setSelectedTimezone(detectedTimezone);
    }
  }, [detectedTimezone, editingLookout]);

  // Reset form to default values
  const resetForm = React.useCallback(() => {
    setSelectedFrequency(DEFAULT_FORM_VALUES.FREQUENCY as string);
    setSelectedTime(DEFAULT_FORM_VALUES.TIME as string);
    setSelectedTimezone(detectedTimezone);
    setSelectedDate(undefined);
    setSelectedDayOfWeek(DEFAULT_FORM_VALUES.DAY_OF_WEEK as string);
    setSelectedSearchMode(DEFAULT_FORM_VALUES.SEARCH_MODE as string);
    setSelectedExample(null);
    setEditingLookout(null);
  }, [detectedTimezone]);

  // Handle dialog open/close with form reset
  const handleDialogOpenChange = React.useCallback(
    (open: boolean) => {
      setIsCreateDialogOpen(open);
      if (open && !editingLookout) {
        // Use detected timezone when opening dialog for new lookout
        setSelectedTimezone(detectedTimezone);
      } else if (!open) {
        resetForm();
      }
    },
    [resetForm, editingLookout, detectedTimezone],
  );

  // Handle using an example lookout
  const handleUseExample = React.useCallback((example: any) => {
    setSelectedExample(example);
    setSelectedFrequency(example.frequency);
    setSelectedTime(example.time);
    setSelectedTimezone(example.timezone || (DEFAULT_FORM_VALUES.TIMEZONE as string));
    setSelectedDayOfWeek(example.dayOfWeek || (DEFAULT_FORM_VALUES.DAY_OF_WEEK as string));
    setSelectedSearchMode(example.searchMode || (DEFAULT_FORM_VALUES.SEARCH_MODE as string));
    setIsCreateDialogOpen(true);
  }, []);

  // Populate form for editing an existing lookout
  const populateFormForEdit = React.useCallback((lookout: any) => {
    setEditingLookout(lookout);
    setSelectedFrequency(lookout.frequency);
    setSelectedTimezone(lookout.timezone);
    setSelectedSearchMode(lookout.searchMode || DEFAULT_FORM_VALUES.SEARCH_MODE);

    // Parse time from existing data or use default
    if (lookout.cronSchedule) {
      // Parse time from cron schedule if available
      const parts = lookout.cronSchedule.split(' ');
      const cronParts = parts[0]?.startsWith('CRON_TZ=') ? parts.slice(1) : parts;

      if (cronParts.length >= 2) {
        const minutes = cronParts[0];
        const hours = cronParts[1];
        setSelectedTime(`${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}` as string);
      }

      // Parse day of week for weekly frequency
      if (lookout.frequency === 'weekly' && cronParts.length >= 5) {
        const dayOfWeek = cronParts[4]; // Day of week is the 5th field in cron
        setSelectedDayOfWeek(dayOfWeek);
      }
    }

    setIsCreateDialogOpen(true);
  }, []);

  // Form validation
  const validateForm = React.useCallback((formData: FormData): boolean => {
    const title = formData.get('title') as string;
    const prompt = formData.get('prompt') as string;
    const frequency = formData.get('frequency') as string;
    const time = formData.get('time') as string;
    const date = formData.get('date') as string;

    if (!title?.trim() || !prompt?.trim()) {
      sileo.error({ title: 'Please fill in all required fields' });
      return false;
    }

    // For once frequency, validate date and time
    if (frequency === 'once') {
      if (!date) {
        sileo.error({ title: 'Please select a date for one-time lookouts' });
        return false;
      }

      if (!time) {
        sileo.error({ title: 'Please select a time' });
        return false;
      }

      // Check if the selected date and time is in the past
      const selectedDateTime = new Date(date);
      if (isTimeInPast(time, selectedDateTime)) {
        sileo.error({ title: 'Cannot schedule lookout in the past' });
        return false;
      }
    }

    return true;
  }, []);

  // Create lookout from form data
  const createLookoutFromForm = React.useCallback(
    (formData: FormData, createLookout: any) => {
      if (!validateForm(formData)) return;

      const title = formData.get('title') as string;
      const prompt = formData.get('prompt') as string;
      const frequency = formData.get('frequency') as string;
      const time = formData.get('time') as string;
      const timezone = (formData.get('timezone') as string) || DEFAULT_FORM_VALUES.TIMEZONE;
      const date = formData.get('date') as string;
      const dayOfWeek = formData.get('dayOfWeek') as string;
      const searchMode = (formData.get('searchMode') as string) || DEFAULT_FORM_VALUES.SEARCH_MODE;

      // Handle weekly day selection
      let adjustedTime = time;
      if (frequency === 'weekly' && dayOfWeek) {
        adjustedTime = `${time}:${dayOfWeek}`;
      }

      createLookout({
        title: title.trim(),
        prompt: prompt.trim(),
        frequency: frequency as 'once' | 'daily' | 'weekly' | 'monthly',
        time: adjustedTime,
        timezone,
        date: frequency === 'once' ? date : undefined,
        searchMode,
        onSuccess: () => handleDialogOpenChange(false),
      });
    },
    [validateForm, handleDialogOpenChange],
  );

  // Update lookout from form data
  const updateLookoutFromForm = React.useCallback(
    (formData: FormData, updateLookout: any) => {
      if (!editingLookout || !validateForm(formData)) return;

      const title = formData.get('title') as string;
      const prompt = formData.get('prompt') as string;
      const frequency = formData.get('frequency') as string;
      const time = formData.get('time') as string;
      const timezone = formData.get('timezone') as string;
      const dayOfWeek = formData.get('dayOfWeek') as string;
      const searchMode = (formData.get('searchMode') as string) || DEFAULT_FORM_VALUES.SEARCH_MODE;

      updateLookout({
        id: editingLookout.id,
        title: title.trim(),
        prompt: prompt.trim(),
        frequency: frequency as 'once' | 'daily' | 'weekly' | 'monthly',
        time: frequency === 'weekly' && dayOfWeek ? `${time}:${dayOfWeek}` : time,
        timezone,
        searchMode,
        onSuccess: () => handleDialogOpenChange(false),
      });
    },
    [editingLookout, validateForm, handleDialogOpenChange],
  );

  return {
    // State
    selectedFrequency,
    selectedTime,
    selectedTimezone,
    selectedDate,
    selectedDayOfWeek,
    selectedSearchMode,
    selectedExample,
    isCreateDialogOpen,
    editingLookout,

    // Setters
    setSelectedFrequency,
    setSelectedTime,
    setSelectedTimezone,
    setSelectedDate,
    setSelectedDayOfWeek,
    setSelectedSearchMode,
    setSelectedExample,
    setIsCreateDialogOpen,
    setEditingLookout,

    // Handlers
    handleDialogOpenChange,
    handleUseExample,
    populateFormForEdit,
    resetForm,

    // Form submission
    createLookoutFromForm,
    updateLookoutFromForm,

    // Validation
    validateForm,
  };
}
