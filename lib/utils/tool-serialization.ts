/**
 * Tool Serialization Utilities
 *
 * This module provides functions for serializing, deserializing, and validating
 * tool call results for database storage. It handles schema versioning and
 * migration of legacy data formats.
 */

import { z } from 'zod';
import { generateId } from 'ai';
import {
  TOOL_STORAGE_VERSION,
  type StoredToolPart,
  type ToolState,
  type ToolError,
  type ToolDisplayConfig,
  isValidToolType,
} from '@/lib/types/tool-storage';

// =============================================================================
// Zod Validation Schemas
// =============================================================================

/** Schema for tool error */
const ToolErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  retryable: z.boolean(),
});

/** Schema for display configuration */
const ToolDisplayConfigSchema = z.object({
  collapsed: z.boolean().optional(),
  priority: z.enum(['high', 'normal', 'low']).optional(),
  renderMode: z.enum(['full', 'compact', 'inline']).optional(),
});

/** Schema for tool state */
const ToolStateSchema = z.enum(['input-streaming', 'input-available', 'output-available', 'error']);

/**
 * Base schema for stored tool parts.
 * Validates the common structure without validating tool-specific input/output.
 */
const StoredToolPartBaseSchema = z.object({
  version: z.number().int().min(1),
  type: z.string().refine((val) => val.startsWith('tool-'), {
    message: 'Tool type must start with "tool-"',
  }),
  toolId: z.string().min(1),
  timestamp: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  state: ToolStateSchema,
  input: z.unknown(),
  output: z.unknown().optional(),
  error: ToolErrorSchema.optional(),
  displayConfig: ToolDisplayConfigSchema.optional(),
});

/**
 * Strict schema that requires current version
 */
const CurrentVersionSchema = StoredToolPartBaseSchema.extend({
  version: z.literal(TOOL_STORAGE_VERSION),
});

// =============================================================================
// Sanitization Helpers
// =============================================================================

/**
 * Sanitizes data for safe JSON storage by removing:
 * - Circular references
 * - Functions
 * - Undefined values
 * - Symbol keys
 * - BigInt values (converted to strings)
 */
export function sanitizeForStorage<T>(data: T): T {
  try {
    return JSON.parse(
      JSON.stringify(data, (key, value) => {
        // Convert BigInt to string
        if (typeof value === 'bigint') {
          return value.toString();
        }
        // Skip functions
        if (typeof value === 'function') {
          return undefined;
        }
        return value;
      }),
    );
  } catch (error) {
    // If JSON serialization fails (circular reference), return a safe fallback
    console.error('[tool-serialization] Failed to sanitize data:', error);
    return {} as T;
  }
}

/**
 * Truncates large string fields to prevent database bloat.
 * Useful for limiting content fields like captions, transcripts, etc.
 */
export function truncateField(value: string | undefined, maxLength: number): string | undefined {
  if (!value) return value;
  if (value.length <= maxLength) return value;
  return value.slice(0, maxLength) + '... [truncated]';
}

/**
 * Removes potentially sensitive or unnecessary fields from tool output
 * before storage (e.g., API keys, tokens, large base64 data).
 */
function sanitizeToolOutput(output: unknown): unknown {
  if (!output || typeof output !== 'object') return output;

  const sanitized = { ...output } as Record<string, unknown>;

  // Remove base64 image data (can be very large)
  if ('png' in sanitized && typeof sanitized.png === 'string' && sanitized.png.length > 1000) {
    sanitized.png = '[base64 image removed]';
  }

  // Remove large chart elements if they exist
  if ('elements' in sanitized && Array.isArray(sanitized.elements) && sanitized.elements.length > 1000) {
    sanitized.elements = sanitized.elements.slice(0, 1000);
    sanitized._elementsTruncated = true;
  }

  return sanitized;
}

// =============================================================================
// Serialization Functions
// =============================================================================

/**
 * UI Tool Part structure from Vercel AI SDK
 */
interface UIToolPart {
  type: string;
  toolId?: string;
  state?: string;
  input?: unknown;
  args?: unknown; // Legacy field name
  output?: unknown;
  result?: unknown; // Legacy field name
  error?: ToolError;
}

/**
 * Serializes a UI tool part into the standardized storage format.
 *
 * @param part - The tool part from the AI SDK
 * @returns A StoredToolPart ready for database storage
 */
export function serializeToolPart(part: UIToolPart): StoredToolPart {
  const toolType = part.type as `tool-${string}`;
  const state = normalizeState(part.state);

  // Use existing toolId or generate a new one
  const toolId = part.toolId || generateId();

  // Get input from either 'input' or legacy 'args' field
  const input = sanitizeForStorage(part.input ?? part.args ?? {});

  // Get output from either 'output' or legacy 'result' field
  const rawOutput = part.output ?? part.result;
  const output =
    state === 'output-available' && rawOutput !== undefined
      ? sanitizeForStorage(sanitizeToolOutput(rawOutput))
      : undefined;

  const serialized: StoredToolPart = {
    version: TOOL_STORAGE_VERSION,
    type: toolType,
    toolId,
    timestamp: new Date().toISOString(),
    state,
    input,
    ...(output !== undefined && { output }),
    ...(part.error && { error: part.error }),
  } as StoredToolPart;

  return serialized;
}

/**
 * Normalizes various state representations to the standard ToolState type.
 */
function normalizeState(state: string | undefined): ToolState {
  if (!state) return 'input-available';

  switch (state) {
    case 'input-streaming':
    case 'streaming':
      return 'input-streaming';
    case 'input-available':
    case 'pending':
    case 'ready':
      return 'input-available';
    case 'output-available':
    case 'complete':
    case 'completed':
    case 'success':
      return 'output-available';
    case 'error':
    case 'failed':
      return 'error';
    default:
      // If there's an output, assume it's complete
      return 'input-available';
  }
}

// =============================================================================
// Deserialization Functions
// =============================================================================

/**
 * Result of deserialization attempt
 */
export interface DeserializeResult {
  success: boolean;
  part: StoredToolPart | null;
  error?: string;
  migrated?: boolean;
}

/**
 * Deserializes and validates a stored tool part from the database.
 *
 * Handles:
 * - Current version validation
 * - Legacy format migration
 * - Invalid data fallback
 *
 * @param stored - Raw data from database
 * @returns Deserialization result with validated tool part or error
 */
export function deserializeToolPart(stored: unknown): DeserializeResult {
  // Handle null/undefined
  if (stored === null || stored === undefined) {
    return {
      success: false,
      part: null,
      error: 'Stored data is null or undefined',
    };
  }

  // Must be an object
  if (typeof stored !== 'object') {
    return {
      success: false,
      part: null,
      error: `Expected object, got ${typeof stored}`,
    };
  }

  const data = stored as Record<string, unknown>;

  // Check if it's a tool part at all
  if (!data.type || typeof data.type !== 'string' || !data.type.startsWith('tool-')) {
    return {
      success: false,
      part: null,
      error: 'Not a tool part (missing or invalid type)',
    };
  }

  // Try to validate as current version first
  const currentResult = CurrentVersionSchema.safeParse(stored);
  if (currentResult.success) {
    return {
      success: true,
      part: currentResult.data as StoredToolPart,
      migrated: false,
    };
  }

  // Check if it's a legacy format (no version field or older version)
  if (!('version' in data) || (typeof data.version === 'number' && data.version < TOOL_STORAGE_VERSION)) {
    const migrated = migrateLegacyToolPart(data);
    if (migrated) {
      return {
        success: true,
        part: migrated,
        migrated: true,
      };
    }
  }

  // Try base schema validation as last resort
  const baseResult = StoredToolPartBaseSchema.safeParse(stored);
  if (baseResult.success) {
    // Upgrade version if needed
    const upgraded = {
      ...baseResult.data,
      version: TOOL_STORAGE_VERSION,
    } as StoredToolPart;
    return {
      success: true,
      part: upgraded,
      migrated: true,
    };
  }

  // Return error with details
  return {
    success: false,
    part: null,
    error: `Validation failed: ${currentResult.error.issues.map((i) => i.message).join(', ')}`,
  };
}

/**
 * Convenience function that returns the tool part or null.
 * Use when you just need the result without error details.
 */
export function deserializeToolPartOrNull(stored: unknown): StoredToolPart | null {
  const result = deserializeToolPart(stored);
  return result.part;
}

// =============================================================================
// Migration Functions
// =============================================================================

/**
 * Migrates a legacy tool part (pre-versioning) to the current format.
 *
 * Legacy formats may have:
 * - No version field
 * - 'args' instead of 'input'
 * - 'result' instead of 'output'
 * - Different state names
 * - Missing required fields
 */
function migrateLegacyToolPart(data: Record<string, unknown>): StoredToolPart | null {
  try {
    const type = data.type as string;
    if (!type.startsWith('tool-')) return null;

    // Determine state from available data
    let state: ToolState = 'input-available';
    if (data.state) {
      state = normalizeState(data.state as string);
    } else if (data.output !== undefined || data.result !== undefined) {
      state = 'output-available';
    } else if (data.error) {
      state = 'error';
    }

    // Get input from 'input' or legacy 'args'
    const input = data.input ?? data.args ?? {};

    // Get output from 'output' or legacy 'result'
    const output = data.output ?? data.result;

    // Build migrated part
    const migrated = {
      version: TOOL_STORAGE_VERSION,
      type: type as `tool-${string}`,
      toolId: (data.toolId as string) || (data.id as string) || generateId(),
      timestamp: (data.timestamp as string) || (data.createdAt as string) || new Date().toISOString(),
      state,
      input: sanitizeForStorage(input),
    } as Record<string, unknown>;

    // Add optional fields
    if (state === 'output-available' && output !== undefined) {
      migrated.output = sanitizeForStorage(sanitizeToolOutput(output));
    }
    if (data.error) {
      migrated.error = data.error as ToolError;
    }
    if (data.displayConfig) {
      migrated.displayConfig = data.displayConfig as ToolDisplayConfig;
    }

    // Validate the migrated part
    const validation = StoredToolPartBaseSchema.safeParse(migrated);
    if (!validation.success) {
      console.warn('[tool-serialization] Migration validation failed:', validation.error);
      return null;
    }

    return migrated as unknown as StoredToolPart;
  } catch (error) {
    console.error('[tool-serialization] Migration error:', error);
    return null;
  }
}

/**
 * Migrates tool parts from one version to another.
 * Add migration functions here when schema changes.
 */
const MIGRATIONS: Record<number, (part: Record<string, unknown>) => Record<string, unknown>> = {
  // Version 1 is the initial version, no migration needed
  // Future migrations would be added here:
  // 2: (part) => { /* migrate from v1 to v2 */ return part; },
};

/**
 * Applies all necessary migrations to bring a tool part to the current version.
 */
export function migrateToolPart(part: Record<string, unknown>): StoredToolPart | null {
  const startVersion = typeof part.version === 'number' ? part.version : 0;

  if (startVersion >= TOOL_STORAGE_VERSION) {
    // Already at current version - validate and return
    const validation = StoredToolPartBaseSchema.safeParse(part);
    if (validation.success) {
      return part as unknown as StoredToolPart;
    }
    return null;
  }

  let current: Record<string, unknown> = { ...part };

  // Apply each migration in sequence
  for (let v = startVersion + 1; v <= TOOL_STORAGE_VERSION; v++) {
    const migration = MIGRATIONS[v];
    if (migration) {
      try {
        current = migration(current);
        current.version = v;
      } catch (error) {
        console.error(`[tool-serialization] Migration to v${v} failed:`, error);
        return null;
      }
    }
  }

  // Ensure version is set
  current.version = TOOL_STORAGE_VERSION;

  // Validate final result
  const validation = StoredToolPartBaseSchema.safeParse(current);
  if (!validation.success) {
    console.warn('[tool-serialization] Post-migration validation failed:', validation.error);
    return null;
  }

  return current as unknown as StoredToolPart;
}

// =============================================================================
// Fallback Part Creation
// =============================================================================

/**
 * Creates a fallback tool part for when deserialization fails.
 * This ensures the UI can still render something meaningful.
 */
export function createFallbackToolPart(originalData: unknown, errorMessage: string): StoredToolPart {
  const data =
    typeof originalData === 'object' && originalData !== null ? (originalData as Record<string, unknown>) : {};

  const type =
    typeof data.type === 'string' && data.type.startsWith('tool-')
      ? (data.type as `tool-${string}`)
      : ('tool-unknown' as `tool-${string}`);

  return {
    version: TOOL_STORAGE_VERSION,
    type,
    toolId: (data.toolId as string) || generateId(),
    timestamp: new Date().toISOString(),
    state: 'error',
    input: {},
    error: {
      code: 'DESERIALIZE_FAILED',
      message: errorMessage,
      retryable: false,
    },
  } as StoredToolPart;
}

// =============================================================================
// Batch Processing
// =============================================================================

/**
 * Serializes an array of message parts, converting tool parts to storage format.
 * Non-tool parts are passed through unchanged.
 */
export function serializeMessageParts(parts: unknown[]): unknown[] {
  return parts.map((part) => {
    if (isUIToolPart(part)) {
      return serializeToolPart(part);
    }
    return part;
  });
}

/**
 * Deserializes an array of message parts from storage.
 * Tool parts are validated and migrated; invalid parts get fallback treatment.
 */
export function deserializeMessageParts(parts: unknown[]): unknown[] {
  return parts.map((part) => {
    if (isStoredToolPartLike(part)) {
      const result = deserializeToolPart(part);
      if (result.success && result.part) {
        return result.part;
      }
      // Return fallback for failed deserialization
      return createFallbackToolPart(part, result.error || 'Unknown error');
    }
    return part;
  });
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Checks if a value looks like a UI tool part (from AI SDK streaming).
 */
function isUIToolPart(value: unknown): value is UIToolPart {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.type === 'string' &&
    obj.type.startsWith('tool-') &&
    ('state' in obj || 'input' in obj || 'args' in obj || 'output' in obj || 'result' in obj)
  );
}

/**
 * Checks if a value looks like a stored tool part (from database).
 */
function isStoredToolPartLike(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return typeof obj.type === 'string' && obj.type.startsWith('tool-');
}

/**
 * Validates that a tool part has required fields for rendering.
 */
export function isRenderableToolPart(part: StoredToolPart): boolean {
  // Must have a valid type
  if (!isValidToolType(part.type)) return false;

  // Must be in a renderable state
  if (!['input-available', 'output-available', 'error'].includes(part.state)) {
    return false;
  }

  // If output-available, must have output
  if (part.state === 'output-available' && part.output === undefined) {
    return false;
  }

  // If error, must have error details
  if (part.state === 'error' && !part.error) {
    return false;
  }

  return true;
}

// =============================================================================
// Debug Utilities
// =============================================================================

/**
 * Returns a summary of a tool part for logging/debugging.
 */
export function summarizeToolPart(part: StoredToolPart): string {
  const outputSize = part.output ? JSON.stringify(part.output).length : 0;

  return `[${part.type}] state=${part.state} version=${part.version} outputSize=${outputSize}`;
}

/**
 * Validates all tool parts in a message and returns a report.
 */
export function validateMessageParts(parts: unknown[]): {
  total: number;
  valid: number;
  invalid: number;
  migrated: number;
  errors: string[];
} {
  const report = {
    total: 0,
    valid: 0,
    invalid: 0,
    migrated: 0,
    errors: [] as string[],
  };

  for (const part of parts) {
    if (!isStoredToolPartLike(part)) continue;

    report.total++;
    const result = deserializeToolPart(part);

    if (result.success) {
      report.valid++;
      if (result.migrated) {
        report.migrated++;
      }
    } else {
      report.invalid++;
      if (result.error) {
        report.errors.push(result.error);
      }
    }
  }

  return report;
}
