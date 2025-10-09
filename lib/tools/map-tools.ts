import { tool } from 'ai';
import { z } from 'zod';

export const findPlaceOnMapTool = tool({
  description: 'Disabled find place on map tool',
  inputSchema: z.object({ query: z.string() }),
  execute: async () => ({ disabled: true }),
});

export const nearbyPlacesSearchTool = tool({
  description: 'Disabled nearby places search tool',
  inputSchema: z.object({ query: z.string().optional(), location: z.string().optional() }),
  execute: async () => ({ disabled: true }),
});