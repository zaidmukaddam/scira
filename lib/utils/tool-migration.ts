/**
 * Tool Part Migration Utilities
 *
 * This module provides utilities for migrating legacy tool parts to the new
 * versioned format. It can be used to:
 * - Migrate existing messages in the database
 * - Validate tool parts in a chat
 * - Generate migration reports
 *
 * Usage:
 * ```ts
 * // Migrate a single chat
 * const result = await migrateChatToolParts(chatId);
 *
 * // Dry run to see what would be migrated
 * const report = await analyzeChatForMigration(chatId);
 *
 * // Batch migrate multiple chats
 * const results = await batchMigrateChats({ limit: 100, dryRun: true });
 * ```
 */

import { db } from '@/lib/db';
import { message, chat } from '@/lib/db/schema';
import { eq, desc, sql, isNotNull } from 'drizzle-orm';
import { serializeMessageParts, deserializeMessageParts, validateMessageParts } from './tool-serialization';
import { TOOL_STORAGE_VERSION, isStoredToolPart } from '@/lib/types/tool-storage';

// =============================================================================
// Types
// =============================================================================

export interface MigrationReport {
  chatId: string;
  messageCount: number;
  toolPartsFound: number;
  legacyPartsFound: number;
  alreadyMigratedCount: number;
  errors: MigrationError[];
  wouldMigrate: boolean;
}

export interface MigrationError {
  messageId: string;
  partIndex: number;
  error: string;
  partType?: string;
}

export interface MigrationResult {
  chatId: string;
  success: boolean;
  messagesUpdated: number;
  partsSerialzed: number;
  errors: MigrationError[];
  duration: number;
}

export interface BatchMigrationOptions {
  /** Maximum number of chats to process */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** If true, don't actually update the database */
  dryRun?: boolean;
  /** Only process chats updated after this date */
  updatedAfter?: Date;
  /** Callback for progress updates */
  onProgress?: (processed: number, total: number) => void;
}

export interface BatchMigrationResult {
  totalChats: number;
  processedChats: number;
  successfulMigrations: number;
  failedMigrations: number;
  totalMessagesUpdated: number;
  totalPartsSerialzed: number;
  errors: Array<{ chatId: string; error: string }>;
  duration: number;
}

// =============================================================================
// Analysis Functions
// =============================================================================

/**
 * Checks if a part is a legacy (non-versioned) tool part
 */
function isLegacyToolPart(part: unknown): boolean {
  if (typeof part !== 'object' || part === null) return false;
  const obj = part as Record<string, unknown>;

  // Must be a tool part
  if (typeof obj.type !== 'string' || !obj.type.startsWith('tool-')) return false;

  // If it has a version field matching current version, it's already migrated
  if (obj.version === TOOL_STORAGE_VERSION) return false;

  // Otherwise it's a legacy part that needs migration
  return true;
}

/**
 * Analyzes a chat to determine what migration is needed
 */
export async function analyzeChatForMigration(chatId: string): Promise<MigrationReport> {
  const messages = await db.select().from(message).where(eq(message.chatId, chatId)).orderBy(message.createdAt);

  const report: MigrationReport = {
    chatId,
    messageCount: messages.length,
    toolPartsFound: 0,
    legacyPartsFound: 0,
    alreadyMigratedCount: 0,
    errors: [],
    wouldMigrate: false,
  };

  for (const msg of messages) {
    if (!Array.isArray(msg.parts)) continue;

    for (let i = 0; i < msg.parts.length; i++) {
      const part = msg.parts[i];
      if (typeof part !== 'object' || part === null) continue;

      const partObj = part as Record<string, unknown>;
      if (typeof partObj.type !== 'string' || !partObj.type.startsWith('tool-')) continue;

      report.toolPartsFound++;

      if (isStoredToolPart(part)) {
        report.alreadyMigratedCount++;
      } else if (isLegacyToolPart(part)) {
        report.legacyPartsFound++;
        report.wouldMigrate = true;
      }
    }
  }

  return report;
}

/**
 * Validates all tool parts in a chat and returns any issues
 */
export async function validateChatToolParts(chatId: string): Promise<{
  valid: boolean;
  issues: Array<{ messageId: string; issue: string }>;
  stats: { total: number; valid: number; invalid: number; migrated: number };
}> {
  const messages = await db.select().from(message).where(eq(message.chatId, chatId)).orderBy(message.createdAt);

  const issues: Array<{ messageId: string; issue: string }> = [];
  const stats = { total: 0, valid: 0, invalid: 0, migrated: 0 };

  for (const msg of messages) {
    if (!Array.isArray(msg.parts)) continue;

    const validation = validateMessageParts(msg.parts);
    stats.total += validation.total;
    stats.valid += validation.valid;
    stats.invalid += validation.invalid;
    stats.migrated += validation.migrated;

    // Add errors to issues with message context
    for (const errorMsg of validation.errors) {
      issues.push({
        messageId: msg.id,
        issue: errorMsg,
      });
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    stats,
  };
}

// =============================================================================
// Migration Functions
// =============================================================================

/**
 * Migrates tool parts in a single chat to the new versioned format
 */
export async function migrateChatToolParts(
  chatId: string,
  options: { dryRun?: boolean } = {},
): Promise<MigrationResult> {
  const startTime = Date.now();
  const result: MigrationResult = {
    chatId,
    success: true,
    messagesUpdated: 0,
    partsSerialzed: 0,
    errors: [],
    duration: 0,
  };

  try {
    const messages = await db.select().from(message).where(eq(message.chatId, chatId)).orderBy(message.createdAt);

    for (const msg of messages) {
      if (!Array.isArray(msg.parts)) continue;

      let hasLegacyParts = false;

      // Check if any parts need migration
      for (let i = 0; i < msg.parts.length; i++) {
        const part = msg.parts[i];
        if (isLegacyToolPart(part)) {
          hasLegacyParts = true;
          result.partsSerialzed++;
        }
      }

      if (!hasLegacyParts) continue;

      // Serialize the parts (this handles legacy conversion)
      try {
        const serializedParts = serializeMessageParts(msg.parts);

        if (!options.dryRun) {
          await db.update(message).set({ parts: serializedParts }).where(eq(message.id, msg.id));
        }

        result.messagesUpdated++;
      } catch (error) {
        result.errors.push({
          messageId: msg.id,
          partIndex: -1,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        result.success = false;
      }
    }
  } catch (error) {
    result.success = false;
    result.errors.push({
      messageId: '',
      partIndex: -1,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  result.duration = Date.now() - startTime;
  return result;
}

/**
 * Batch migrate multiple chats
 */
export async function batchMigrateChats(options: BatchMigrationOptions = {}): Promise<BatchMigrationResult> {
  const { limit = 100, offset = 0, dryRun = false, updatedAfter, onProgress } = options;

  const startTime = Date.now();
  const result: BatchMigrationResult = {
    totalChats: 0,
    processedChats: 0,
    successfulMigrations: 0,
    failedMigrations: 0,
    totalMessagesUpdated: 0,
    totalPartsSerialzed: 0,
    errors: [],
    duration: 0,
  };

  try {
    // Get chats to process
    let query = db.select({ id: chat.id }).from(chat).orderBy(desc(chat.updatedAt)).limit(limit).offset(offset);

    const chats = await query;
    result.totalChats = chats.length;

    for (let i = 0; i < chats.length; i++) {
      const chatRecord = chats[i];

      try {
        const migrationResult = await migrateChatToolParts(chatRecord.id, { dryRun });

        if (migrationResult.success) {
          result.successfulMigrations++;
        } else {
          result.failedMigrations++;
          for (const error of migrationResult.errors) {
            result.errors.push({
              chatId: chatRecord.id,
              error: error.error,
            });
          }
        }

        result.totalMessagesUpdated += migrationResult.messagesUpdated;
        result.totalPartsSerialzed += migrationResult.partsSerialzed;
      } catch (error) {
        result.failedMigrations++;
        result.errors.push({
          chatId: chatRecord.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      result.processedChats++;
      onProgress?.(result.processedChats, result.totalChats);
    }
  } catch (error) {
    result.errors.push({
      chatId: '',
      error: error instanceof Error ? error.message : 'Failed to query chats',
    });
  }

  result.duration = Date.now() - startTime;
  return result;
}

// =============================================================================
// Statistics Functions
// =============================================================================

/**
 * Get statistics about tool parts across the database
 */
export async function getToolPartStatistics(): Promise<{
  totalMessages: number;
  messagesWithToolParts: number;
  estimatedLegacyParts: number;
  sampleLegacyChats: string[];
}> {
  // Get total message count
  const [{ count: totalMessages }] = await db.select({ count: sql<number>`count(*)` }).from(message);

  // Get messages with parts that look like tool parts
  // This is an estimate since we can't easily query JSON in all databases
  const [{ count: messagesWithParts }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(message)
    .where(isNotNull(message.parts));

  // Sample some chats to check for legacy parts
  const sampleChats = await db.select({ id: chat.id }).from(chat).orderBy(desc(chat.updatedAt)).limit(10);

  let legacyCount = 0;
  const legacyChatIds: string[] = [];

  for (const c of sampleChats) {
    const report = await analyzeChatForMigration(c.id);
    if (report.legacyPartsFound > 0) {
      legacyCount += report.legacyPartsFound;
      legacyChatIds.push(c.id);
    }
  }

  return {
    totalMessages: Number(totalMessages),
    messagesWithToolParts: Number(messagesWithParts),
    estimatedLegacyParts: legacyCount,
    sampleLegacyChats: legacyChatIds,
  };
}
