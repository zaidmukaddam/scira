import { NextRequest, NextResponse } from 'next/server';
import { generateAndCacheAllSuggestions } from '@/lib/services/suggestions-service';

/**
 * Cron endpoint for generating daily suggestions
 * 
 * This endpoint is called by Vercel Cron daily at 5:00 AM AEDT
 * to pre-generate and cache suggestions for all model types.
 * 
 * Schedule: 0 18 * * * (5 AM AEDT = 6 PM UTC previous day)
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.warn('[CRON:SUGGESTIONS] Unauthorized request attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[CRON:SUGGESTIONS] Starting daily suggestions generation...');

    const { success, results } = await generateAndCacheAllSuggestions();

    const duration = Date.now() - startTime;
    
    // Count successes and failures
    const successCount = Object.values(results).filter(r => r.success).length;
    const failureCount = Object.values(results).filter(r => !r.success).length;

    console.log(
      `[CRON:SUGGESTIONS] Completed in ${duration}ms - Success: ${successCount}, Failed: ${failureCount}`
    );

    if (success) {
      return NextResponse.json({
        status: 'success',
        message: 'All suggestions generated and cached successfully',
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
        results,
      });
    } else {
      // Partial success - some model types may have failed
      return NextResponse.json({
        status: 'partial',
        message: 'Some suggestions failed to generate',
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
        successCount,
        failureCount,
        results,
      }, { status: 207 }); // 207 Multi-Status
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    
    console.error('[CRON:SUGGESTIONS] Fatal error during generation:', error);
    
    return NextResponse.json({
      status: 'error',
      message: 'Failed to generate suggestions',
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

/**
 * POST endpoint for manual triggering or testing
 * Allows generating suggestions for specific model types
 * 
 * In development mode, authentication is bypassed for easier testing
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // In development, allow unauthenticated access for testing
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (!isDevelopment) {
      // Verify authorization in production
      const authHeader = request.headers.get('authorization');
      const cronSecret = process.env.CRON_SECRET;

      if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } else {
      console.log('[CRON:SUGGESTIONS] Development mode - skipping auth check');
    }

    const body = await request.json().catch(() => ({}));
    const { modelType } = body;

    if (modelType) {
      // Generate for specific model type
      const { generateAndCacheSuggestions } = await import('@/lib/services/suggestions-service');
      const result = await generateAndCacheSuggestions(modelType);
      
      const duration = Date.now() - startTime;
      
      return NextResponse.json({
        status: result.success ? 'success' : 'error',
        modelType,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
        ...(result.suggestions && { suggestionsCount: result.suggestions.length }),
        ...(result.error && { error: result.error }),
      }, { status: result.success ? 200 : 500 });
    }

    // Generate for all model types
    const { success, results } = await generateAndCacheAllSuggestions();
    const duration = Date.now() - startTime;

    return NextResponse.json({
      status: success ? 'success' : 'partial',
      message: success ? 'All suggestions generated' : 'Some suggestions failed',
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      results,
    }, { status: success ? 200 : 207 });
  } catch (error) {
    const duration = Date.now() - startTime;
    
    return NextResponse.json({
      status: 'error',
      message: 'Failed to generate suggestions',
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: `${duration}ms`,
    }, { status: 500 });
  }
}
