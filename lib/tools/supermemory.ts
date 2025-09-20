import { supermemoryTools } from '@supermemory/tools/ai-sdk';
import { Tool } from 'ai';
import { serverEnv } from '@/env/server';

export function createMemoryTools(userId: string) {
  return supermemoryTools(serverEnv.SUPERMEMORY_API_KEY, {
    containerTags: [userId],
  });
}

export type SearchMemoryTool = Tool<
  {
    informationToGet: string;
  },
  | {
      success: boolean;
      results: any[];
      count: number;
      error?: undefined;
    }
  | {
      success: boolean;
      error: string;
      results?: undefined;
      count?: undefined;
    }
>;

export type AddMemoryTool = Tool<
  {
    memory: string;
  },
  | {
      success: boolean;
      memory: any;
      error?: undefined;
    }
  | {
      success: boolean;
      error: string;
      memory?: undefined;
    }
>;
