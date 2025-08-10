import { tool } from 'ai';
import { z } from 'zod';

export const greetingTool = tool({
  description: 'Generate a professional greeting for the user',
  inputSchema: z.object({
    name: z.string().optional().describe('User name to personalize the greeting'),
    style: z.enum(['professional', 'casual', 'formal']).optional().describe('Greeting style'),
    includeTimeOfDay: z.boolean().optional().describe('Whether to include time-specific greeting'),
  }),
  execute: async ({ name, style = 'professional', includeTimeOfDay = true }) => {
    const currentTime = new Date();
    const hour = currentTime.getHours();

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
    };

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
    const randomFrom = (array: string[]) => array[Math.floor(Math.random() * array.length)];

    const mainGreeting = randomFrom(styleGreetings[style || 'professional']);
    const professionalMessage = randomFrom(professionalMessages);
    const helpfulTip = randomFrom(helpfulTips);

    // Construct professional greeting
    let greeting = '';

    if (includeTimeOfDay) {
      greeting = `${timeGreeting}${name ? `, ${name}` : ''}`;
    } else {
      greeting = `${mainGreeting}${name ? `, ${name}` : ''}`;
    }

    // Day of week
    const dayOfWeek = currentTime.toLocaleDateString('en-US', { weekday: 'long' });

    return {
      greeting,
      timeGreeting,
      timeEmoji,
      style,
      professionalMessage,
      helpfulTip,
      dayOfWeek,
      currentTime: currentTime.toLocaleString(),
      name: name || null,
    };
  },
});
