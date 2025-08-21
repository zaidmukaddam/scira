import { tool } from 'ai';
import { z } from 'zod';

export const greetingTool = (timezone?: string) =>
  tool({
    description: 'Generate a professional greeting for the user',
    inputSchema: z.object({
      name: z.string().optional().describe('User name to personalize the greeting'),
      style: z.enum(['professional', 'casual', 'formal']).optional().describe('Greeting style'),
      includeTimeOfDay: z.boolean().optional().describe('Whether to include time-specific greeting'),
    }),
    execute: async ({ name, style = 'professional', includeTimeOfDay = true }) => {
      const now = new Date();

      // Determine hour based on provided timezone (falls back to server time if not provided or invalid)
      let hour = now.getHours();
      if (timezone) {
        try {
          hour = Number(
            new Intl.DateTimeFormat('en-US', {
              hour: 'numeric',
              hour12: false,
              timeZone: timezone,
            }).format(now),
          );
        } catch {
          // Invalid timezone; keep server hour fallback
        }
      }

      // Professional time-based greetings
      let timeGreeting = '';
      let timeEmoji = '';

      if (includeTimeOfDay) {
        if (hour < 12) {
          timeGreeting = 'Good morning';
          timeEmoji = '🌅';
        } else if (hour < 17) {
          timeGreeting = 'Good afternoon';
          timeEmoji = '☀️';
        } else {
          timeGreeting = 'Good evening';
          timeEmoji = '🌆';
        }
      }

      // Classy style-based greetings
      const styleGreetings = {
        professional: ['Hello', 'Good day', 'Welcome', 'Greetings'],
        casual: ['Hi', 'Hello', 'Hey there', 'Hi there'],
        formal: ['Good day', 'Greetings', 'Salutations', 'Welcome'],
      } as const;

      // Professional messages
      const professionalMessages = [
        'How may I assist you today?',
        'What can I help you with?',
        'Ready to help with your tasks.',
        'At your service.',
        'How can I be of assistance?',
      ];

      // Helpful tips instead of cringe facts
      const helpfulTips = [
        'Pro tip: Use specific keywords for better search results',
        'Tip: I can help with research, analysis, and creative tasks',
        'Note: Feel free to ask follow-up questions for clarity',
        'Hint: I work best with clear, detailed requests',
        'Tip: I can assist with both technical and creative projects',
      ];

      // Random selection
      const randomFrom = <T,>(array: readonly T[]) => array[Math.floor(Math.random() * array.length)];

      const selectedStyle = (style || 'professional') as keyof typeof styleGreetings;
      const mainGreeting = randomFrom(styleGreetings[selectedStyle]);
      const professionalMessage = randomFrom(professionalMessages);
      const helpfulTip = randomFrom(helpfulTips);

      // Construct professional greeting
      let greeting = '';

      if (includeTimeOfDay) {
        greeting = `${timeGreeting}${name ? `, ${name}` : ''}`;
      } else {
        greeting = `${mainGreeting}${name ? `, ${name}` : ''}`;
      }

      // Day of week and localized current time string
      let dayOfWeek = new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
      }).format(now);
      let localizedCurrentTime = now.toLocaleString('en-US');
      if (timezone) {
        try {
          dayOfWeek = new Intl.DateTimeFormat('en-US', {
            weekday: 'long',
            timeZone: timezone,
          }).format(now);
          localizedCurrentTime = now.toLocaleString('en-US', { timeZone: timezone });
        } catch {
          // Invalid timezone; keep server-localized values
        }
      }

      return {
        greeting,
        timeGreeting,
        timeEmoji,
        style,
        professionalMessage,
        helpfulTip,
        dayOfWeek,
        currentTime: localizedCurrentTime,
        name: name || null,
        timezone: timezone || null,
      };
    },
  });
