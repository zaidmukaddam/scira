import { NextRequest, NextResponse } from 'next/server';
import { getUser, isAdminEmail } from '@/lib/auth-utils';
import { createApiKey, getUserApiKeys, revokeApiKey } from '@/lib/api/api-key-manager';
import { z } from 'zod';
import { db } from '@/lib/db';
import { apiKeys as apiKeysTable, apiUsage } from '@/lib/db/schema';
import { eq, sql, and, asc, desc } from 'drizzle-orm';

// Schema for creating API key
const CreateApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  expiresIn: z.enum(['30d', '90d', '1y', 'never']).optional().default('never'),
  rateLimitRpm: z.number().int().min(1).max(10000).optional().default(60),
  rateLimitTpd: z.number().int().min(1000).max(100_000_000).optional().default(1_000_000),
  allowedModels: z.array(z.string()).optional(),
  allowedTools: z.array(z.string()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const showAll = searchParams.get('all') === 'true';
    const sortBy = (searchParams.get('sortBy') as 'createdAt' | 'lastUsedAt' | 'name' | 'totalRequests' | 'totalTokens') || 'createdAt';
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc';
    const filterStatus = searchParams.get('status'); // 'active', 'inactive', or null for all

    let apiKeys;
    if (showAll) {
      // Admin-only access
      if (!isAdminEmail(user.email)) {
        return NextResponse.json(
          { error: 'Admin access required' },
          { status: 403 }
        );
      }
      // Get ALL API keys in the system (for admin/debugging)
      // Build where conditions
      const whereConditions = [];
      if (filterStatus === 'active') {
        whereConditions.push(eq(apiKeysTable.isActive, true));
      } else if (filterStatus === 'inactive') {
        whereConditions.push(eq(apiKeysTable.isActive, false));
      }
      
      // For usage-based sorting, we need to join with apiUsage and sort in JS
      const needsUsageJoin = sortBy === 'totalRequests' || sortBy === 'totalTokens';
      
      if (needsUsageJoin) {
        // Build query with usage aggregation - fetch all, sort in JS to avoid Drizzle SQL issues
        let baseQuery = db
          .select({
            id: apiKeysTable.id,
            name: apiKeysTable.name,
            userId: apiKeysTable.userId,
            createdAt: apiKeysTable.createdAt,
            lastUsedAt: apiKeysTable.lastUsedAt,
            expiresAt: apiKeysTable.expiresAt,
            isActive: apiKeysTable.isActive,
            rateLimitRpm: apiKeysTable.rateLimitRpm,
            rateLimitTpd: apiKeysTable.rateLimitTpd,
            allowedModels: apiKeysTable.allowedModels,
            allowedTools: apiKeysTable.allowedTools,
            keyPreview: apiKeysTable.keyPrefix,
            totalRequests: sql<number>`COALESCE(COUNT(${apiUsage.id}), 0)::bigint`.as('totalRequests'),
            totalTokens: sql<number>`COALESCE(SUM(COALESCE(${apiUsage.inputTokens}, 0) + COALESCE(${apiUsage.outputTokens}, 0)), 0)::bigint`.as('totalTokens'),
          })
          .from(apiKeysTable)
          .leftJoin(apiUsage, eq(apiKeysTable.id, apiUsage.apiKeyId))
          .groupBy(apiKeysTable.id);
        
        // Apply where conditions
        if (whereConditions.length > 0) {
          baseQuery = baseQuery.where(and(...whereConditions)) as typeof baseQuery;
        }
        
        // Fetch all results
        const results = await baseQuery;
        
        // Sort in JavaScript to avoid Drizzle aggregate ordering issues
        apiKeys = results.sort((a, b) => {
          const aVal = sortBy === 'totalRequests' ? (a.totalRequests || 0) : (a.totalTokens || 0);
          const bVal = sortBy === 'totalRequests' ? (b.totalRequests || 0) : (b.totalTokens || 0);
          return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
        });
      } else {
        // Build query without usage join
        let query = db
          .select({
            id: apiKeysTable.id,
            name: apiKeysTable.name,
            userId: apiKeysTable.userId,
            createdAt: apiKeysTable.createdAt,
            lastUsedAt: apiKeysTable.lastUsedAt,
            expiresAt: apiKeysTable.expiresAt,
            isActive: apiKeysTable.isActive,
            rateLimitRpm: apiKeysTable.rateLimitRpm,
            rateLimitTpd: apiKeysTable.rateLimitTpd,
            allowedModels: apiKeysTable.allowedModels,
            allowedTools: apiKeysTable.allowedTools,
            keyPreview: apiKeysTable.keyPrefix,
          })
          .from(apiKeysTable);
        
        // Apply where conditions
        if (whereConditions.length > 0) {
          query = query.where(and(...whereConditions)) as typeof query;
        }
        
        // Apply sorting using Drizzle's asc/desc functions
        let orderByColumn;
        switch (sortBy) {
          case 'lastUsedAt':
            orderByColumn = apiKeysTable.lastUsedAt;
            break;
          case 'name':
            orderByColumn = apiKeysTable.name;
            break;
          case 'createdAt':
          default:
            orderByColumn = apiKeysTable.createdAt;
            break;
        }
        
        if (sortOrder === 'asc') {
          apiKeys = await query.orderBy(asc(orderByColumn));
        } else {
          apiKeys = await query.orderBy(desc(orderByColumn));
        }
      }
    } else {
      // Get only user's API keys
      // Note: getUserApiKeys doesn't support options yet, so we'll fetch and sort client-side
      const allUserKeys = await getUserApiKeys(user.id);
      
      // Apply status filter
      let filteredKeys = allUserKeys;
      if (filterStatus === 'active') {
        filteredKeys = allUserKeys.filter(key => key.isActive);
      } else if (filterStatus === 'inactive') {
        filteredKeys = allUserKeys.filter(key => !key.isActive);
      }
      
      // Apply sorting (client-side for user keys)
      apiKeys = [...filteredKeys].sort((a, b) => {
        let aVal: any, bVal: any;
        
        switch (sortBy) {
          case 'lastUsedAt':
            aVal = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0;
            bVal = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0;
            break;
          case 'name':
            aVal = a.name.toLowerCase();
            bVal = b.name.toLowerCase();
            break;
          case 'createdAt':
          default:
            aVal = new Date(a.createdAt).getTime();
            bVal = new Date(b.createdAt).getTime();
            break;
        }
        
        if (sortOrder === 'asc') {
          return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        } else {
          return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
        }
      });
    }

    return NextResponse.json({ 
      object: 'list',
      data: apiKeys,
      count: apiKeys.length 
    });
  } catch (error) {
    console.error('Error fetching API keys:', error);
    return NextResponse.json(
      { error: 'Failed to fetch API keys' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const validatedData = CreateApiKeySchema.parse(body);

    // Calculate expiration date
    let expiresAt: Date | undefined;
    if (validatedData.expiresIn !== 'never') {
      expiresAt = new Date();
      switch (validatedData.expiresIn) {
        case '30d':
          expiresAt.setDate(expiresAt.getDate() + 30);
          break;
        case '90d':
          expiresAt.setDate(expiresAt.getDate() + 90);
          break;
        case '1y':
          expiresAt.setFullYear(expiresAt.getFullYear() + 1);
          break;
      }
    }

    // Create the API key
    const result = await createApiKey(user.id, validatedData.name, {
      expiresAt,
      rateLimitRpm: validatedData.rateLimitRpm,
      rateLimitTpd: validatedData.rateLimitTpd,
      allowedModels: validatedData.allowedModels || [
        'magpie',
        'deepseek-v3',
        'deepseek-v3.1',
        'deepseek-r1',
        'gpt-oss-120b',
        'llama-4',
        'llama-3.3',
      ],
      allowedTools: validatedData.allowedTools || [
        // Search & Research
        'web_search',
        'academic_search',
        'youtube_search',
        'reddit_search',
        'x_search',
        'extreme_search',
        'trove_search',
        'mcp_search',
        // Code & Data
        'code_interpreter',
        'rag_search',
        // Finance
        'stock_price',
        'stock_chart',
        'currency_converter',
        'coin_data',
        'coin_ohlc',
        'coin_data_by_contract',
        // Location & Travel
        'get_weather_data',
        'find_place_on_map',
        'nearby_places_search',
        'flight_tracker',
        'flight_live_tracker',
        'travel_advisor',
        // Entertainment
        'movie_or_tv_search',
        'trending_movies',
        'trending_tv',
        // Utilities
        'datetime',
        'text_translate',
        'mermaid_diagram',
        'memory_manager',
        'retrieve',
        'greeting',
      ],
    });

    return NextResponse.json({
      id: result.id,
      key: result.key,
      name: result.name,
      createdAt: result.createdAt,
      message: 'API key created successfully. Please save this key as it will not be shown again.',
    });
  } catch (error) {
    console.error('Error creating API key:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create API key' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get key ID from query params
    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get('id');
    
    if (!keyId) {
      return NextResponse.json(
        { error: 'API key ID required' },
        { status: 400 }
      );
    }

    // Revoke the API key
    const result = await revokeApiKey(user.id, keyId);
    
    if (!result) {
      return NextResponse.json(
        { error: 'API key not found or unauthorized' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'API key revoked successfully',
      id: keyId,
    });
  } catch (error) {
    console.error('Error revoking API key:', error);
    return NextResponse.json(
      { error: 'Failed to revoke API key' },
      { status: 500 }
    );
  }
}
