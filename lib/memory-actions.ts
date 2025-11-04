'use server';

import { getUser } from '@/lib/auth-utils';
import { serverEnv } from '@/env/server';
import { Supermemory } from 'supermemory';

const SM_KEY = serverEnv.SUPERMEMORY_API_KEY;
const SM_ENABLED = !!SM_KEY && SM_KEY !== 'placeholder';

// Initialize the memory client only if enabled
const supermemoryClient = SM_ENABLED
  ? new Supermemory({ apiKey: SM_KEY })
  : null as unknown as Supermemory;

// Define the types based on actual API responses
export interface MemoryItem {
  id: string;
  customId: string;
  connectionId: string | null;
  containerTags: string[];
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, any>;
  status: string;
  summary: string;
  title: string;
  type: string;
  content: string;
  // Legacy fields for backward compatibility
  name?: string;
  memory?: string;
  user_id?: string;
  owner?: string;
  immutable?: boolean;
  expiration_date?: string | null;
  created_at?: string;
  categories?: string[];
}

export interface MemoryResponse {
  memories: MemoryItem[];
  total: number;
}
/**
 * Search memories for the authenticated user
 * Returns a consistent MemoryResponse format with memories array and total count
 */
export async function searchMemories(query: string, page = 1, pageSize = 20): Promise<MemoryResponse> {
  const user = await getUser();

  if (!user) {
    throw new Error('Authentication required');
  }

  if (!query.trim()) {
    return { memories: [], total: 0 };
  }

  try {
    if (!SM_ENABLED) {
      return { memories: [], total: 0 };
    }
    const result = await supermemoryClient.search.memories({
      q: query,
      containerTag: user.id,
      limit: pageSize,
    });


    return { memories: [], total: result.total || 0 };
  } catch (error) {
    console.error('Error searching memories:', error);
    throw error;
  }
}

/**
 * Get all memories for the authenticated user
 * Returns a consistent MemoryResponse format with memories array and total count
 */
export async function getAllMemories(page = 1, pageSize = 20): Promise<MemoryResponse> {
  const user = await getUser();

  if (!user) {
    throw new Error('Authentication required');
  }

  try {
    if (!SM_ENABLED) {
      return { memories: [], total: 0 };
    }
    const result = await supermemoryClient.memories.list({
      containerTags: [user.id],
      page: page,
      limit: pageSize,
      includeContent: true,
    });

    return {
      memories: result.memories as any,
      total: result.pagination.totalItems || 0,
    };
  } catch (error) {
    console.error('Error fetching memories:', error);
    throw error;
  }
}

/**
 * Delete a memory by ID
 */
export async function deleteMemory(memoryId: string) {
  const user = await getUser();

  if (!user) {
    throw new Error('Authentication required');
  }

  try {
    if (!SM_ENABLED) {
      throw new Error('Memory disabled');
    }
    const data = await supermemoryClient.memories.delete(memoryId);
    return data;
  } catch (error) {
    console.error('Error deleting memory:', error);
    throw error;
  }
}
