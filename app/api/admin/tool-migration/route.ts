import { NextRequest, NextResponse } from 'next/server';
import { getSession, isAdminEmail } from '@/lib/auth-utils';
import {
  analyzeChatForMigration,
  validateChatToolParts,
  migrateChatToolParts,
  batchMigrateChats,
  getToolPartStatistics,
} from '@/lib/utils/tool-migration';

/**
 * GET /api/admin/tool-migration
 *
 * Get statistics about tool parts in the database.
 *
 * Query params:
 * - action: 'stats' | 'analyze' | 'validate'
 * - chatId: (required for analyze/validate) The chat ID to analyze
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user || !isAdminEmail(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'stats';
    const chatId = searchParams.get('chatId');

    switch (action) {
      case 'stats': {
        const stats = await getToolPartStatistics();
        return NextResponse.json({
          success: true,
          data: stats,
        });
      }

      case 'analyze': {
        if (!chatId) {
          return NextResponse.json({ error: 'chatId is required for analyze action' }, { status: 400 });
        }
        const report = await analyzeChatForMigration(chatId);
        return NextResponse.json({
          success: true,
          data: report,
        });
      }

      case 'validate': {
        if (!chatId) {
          return NextResponse.json({ error: 'chatId is required for validate action' }, { status: 400 });
        }
        const validation = await validateChatToolParts(chatId);
        return NextResponse.json({
          success: true,
          data: validation,
        });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in tool-migration GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/tool-migration
 *
 * Migrate tool parts to the new versioned format.
 *
 * Body params:
 * - action: 'migrate-chat' | 'batch-migrate'
 * - chatId: (required for migrate-chat) The chat ID to migrate
 * - dryRun: (optional) If true, don't actually update the database
 * - limit: (optional, for batch-migrate) Max chats to process
 * - offset: (optional, for batch-migrate) Pagination offset
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user || !isAdminEmail(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, chatId, dryRun = false, limit = 100, offset = 0 } = body;

    switch (action) {
      case 'migrate-chat': {
        if (!chatId) {
          return NextResponse.json({ error: 'chatId is required for migrate-chat action' }, { status: 400 });
        }

        const result = await migrateChatToolParts(chatId, { dryRun });
        return NextResponse.json({
          success: result.success,
          data: result,
        });
      }

      case 'batch-migrate': {
        const result = await batchMigrateChats({
          limit,
          offset,
          dryRun,
        });
        return NextResponse.json({
          success: result.failedMigrations === 0,
          data: result,
        });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in tool-migration POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
