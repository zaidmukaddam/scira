'use server';

import { getUser } from '@/lib/auth-utils';
import { serverEnv } from '@/env/server';
import MemoryClient from 'mem0ai';

// Initialize the memory client with API key
const memoryClient = new MemoryClient({ apiKey: serverEnv.MEM0_API_KEY || '' });

// Define the types based on actual API responses
export interface MemoryItem {
  id: string;
  name?: string;
  memory?: string;
  metadata?: {
    [key: string]: any;
  };
  user_id?: string;
  owner?: string;
  immutable?: boolean;
  expiration_date?: string | null;
  created_at: string;
  updated_at: string;
  categories?: string[];
}

export interface MemoryResponse {
  memories: MemoryItem[];
  total: number;
}

/**
 * Add a memory for the authenticated user
 */
export async function addMemory(content: string) {
  const user = await getUser();
  
  if (!user) {
    throw new Error('Authentication required');
  }

  try {
    const response = await memoryClient.add([{
      role: "user",
    content: content
    }], { 
      user_id: user.id,
      app_id: "scira"
    });
    return response;
  } catch (error) {
    console.error('Error adding memory:', error);
    throw error;
  }
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

  const filters = {
    "AND": [
      {
        "user_id": user.id
      }
    ]
  };

  try {
    const response = await fetch('https://api.mem0.ai/v2/memories/search/', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${serverEnv.MEM0_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: query,
        filters: filters,
        top_k: 1,
        rerank: true,
        page: page
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Search API error:', errorText);
      throw new Error(`Failed to search memories: ${response.statusText}`);
    }
    
    const results = await response.json();

    console.log("[searchMemories] results", results);
    
    // Process the results to ensure we return a consistent structure
    if (Array.isArray(results)) {
      return { 
        memories: results as unknown as MemoryItem[],
        total: results.length
      };
    } else if (results && typeof results === 'object' && 'memories' in results) {
      const memories = (results as any).memories || [];
      return { 
        memories: memories,
        total: (results as any).total || memories.length 
      };
    }
    return { memories: [], total: 0 };
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
    const response = await fetch('https://api.mem0.ai/v2/memories/', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${serverEnv.MEM0_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filters: {
          "AND": [
            {
              "user_id": user.id
            }
          ]
        },
        page: page,
        page_size: pageSize
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Get memories API error:', errorText);
      throw new Error(`Failed to fetch memories: ${response.statusText}`);
    }
    
    const data = await response.json();

    console.log("[getAllMemories] data", data);
    
    // Process the result to ensure we return a consistent structure
    if (Array.isArray(data)) {
      return { 
        memories: data as MemoryItem[],
        total: data.length
      };
    } else if (data && typeof data === 'object' && 'memories' in data) {
      const memories = (data as any).memories || [];
      return { 
        memories: memories,
        total: (data as any).total || memories.length 
      };
    }
    return { memories: [], total: 0 };
  } catch (error) {
    console.error('Error getting all memories:', error);
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
    // The delete method only takes the memory ID as a parameter
    const response = await fetch(`https://api.mem0.ai/v1/memories/${memoryId}/`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Token ${serverEnv.MEM0_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Delete memory API error:', errorText);
      throw new Error(`Failed to delete memory: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error deleting memory:', error);
    throw error;
  }
} 