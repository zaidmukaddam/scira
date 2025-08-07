import { tool } from 'ai';
import { z } from 'zod';

export const datetimeTool = tool({
  description: "Get the current date and time in the user's timezone",
  inputSchema: z.object({}),
  execute: async () => {
    try {
      const now = new Date();

      return {
        timestamp: now.getTime(),
        iso: now.toISOString(),
        timezone: 'UTC',
        formatted: {
          date: new Intl.DateTimeFormat('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'UTC',
          }).format(now),
          time: new Intl.DateTimeFormat('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
            timeZone: 'UTC',
          }).format(now),
          dateShort: new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            timeZone: 'UTC',
          }).format(now),
          timeShort: new Intl.DateTimeFormat('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            timeZone: 'UTC',
          }).format(now),
          full: new Intl.DateTimeFormat('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
            timeZone: 'UTC',
          }).format(now),
          iso_local: new Intl.DateTimeFormat('sv-SE', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZone: 'UTC',
          })
            .format(now)
            .replace(' ', 'T'),
        },
      };
    } catch (error) {
      console.error('Datetime error:', error);
      throw error;
    }
  },
});
