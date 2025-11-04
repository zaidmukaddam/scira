# Supermemory Graceful Degradation Implementation

**Date:** 2025-11-03
**Status:** Implemented
**Related Commits:** b544cb6

## Overview

Implemented graceful degradation for all Supermemory-dependent features to handle cases where the Supermemory API key is not configured or set to 'placeholder'.

## Problem

The application would fail or throw errors when:
- `SUPERMEMORY_API_KEY` environment variable was missing
- API key was set to 'placeholder' (default in self-hosted setups)
- Users didn't have Supermemory subscriptions

This affected:
- Memory operations (search, add, delete)
- Connector integrations (Google Drive, Notion, etc.)
- Connector search functionality

## Solution

Implemented a consistent pattern across all Supermemory-dependent modules:

```typescript
const SM_KEY = process.env.SUPERMEMORY_API_KEY;
const SM_ENABLED = !!SM_KEY && SM_KEY !== 'placeholder';
```

This checks:
1. API key exists (`!!SM_KEY`)
2. API key is not the placeholder value (`SM_KEY !== 'placeholder'`)

## Implementation Details

### Files Modified

#### 1. `lib/connectors.tsx`

**Changes:**
- Added `SM_ENABLED` check at module level
- Modified `getClient()` to throw error when disabled
- Added guards to all public functions:
  - `createConnection()`
  - `getConnection()`
  - `listUserConnections()`
  - `deleteConnection()`
  - `manualSync()`
  - `getSyncStatus()`

**Example:**
```typescript
export async function getConnection(provider: ConnectorProvider, userId: string) {
  try {
    if (!SM_ENABLED) return null;
    const client = getClient();
    // ... rest of implementation
  } catch (error) {
    // error handling
  }
}
```

**Return Values When Disabled:**
- Connection functions: `null`
- List functions: `[]` (empty array)

#### 2. `lib/memory-actions.ts`

**Changes:**
- Added `SM_ENABLED` check
- Modified client initialization to be conditional
- Added guards to all memory operations:
  - `searchMemories()` - returns `{ memories: [], total: 0 }`
  - `getAllMemories()` - returns `{ memories: [], total: 0 }`
  - `deleteMemory()` - throws error with clear message

**Example:**
```typescript
export async function searchMemories(query: string, page = 1, pageSize = 20): Promise<MemoryResponse> {
  const user = await getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  try {
    if (!SM_ENABLED) {
      return { memories: [], total: 0 };
    }
    // ... rest of implementation
  } catch (error) {
    // error handling
  }
}
```

#### 3. `lib/tools/connectors-search.ts`

**Changes:**
- Added `SM_ENABLED` check
- Conditional client initialization
- Modified `execute()` function to return error response when disabled

**Return When Disabled:**
```typescript
{
  success: false,
  error: 'Connectors disabled',
  provider: provider === 'all' ? 'all' : provider,
}
```

**Example:**
```typescript
execute: async ({ query, provider = 'all' }) => {
  try {
    if (!SM_ENABLED) {
      return {
        success: false,
        error: 'Connectors disabled',
        provider: provider === 'all' ? 'all' : provider,
      };
    }
    // ... rest of implementation
  } catch (error) {
    // error handling
  }
}
```

## Benefits

1. **No Breaking Errors**
   - Application continues to function without Supermemory
   - Users get empty results instead of crashes

2. **Clear Error Messages**
   - When operations require Supermemory, users get clear error messages
   - "Connectors disabled" / "Memory disabled"

3. **Flexible Configuration**
   - Self-hosted users can run without Supermemory subscription
   - Easy to enable/disable by changing env var

4. **Consistent Pattern**
   - Same approach across all modules
   - Easy to maintain and understand

## Testing

To test this implementation:

### With Supermemory Disabled

```bash
# Set in .env.local
SUPERMEMORY_API_KEY=placeholder
```

Expected behavior:
- Memory search returns empty results
- Connector list returns empty array
- Connector search returns error response
- No crashes or unhandled errors

### With Supermemory Enabled

```bash
# Set in .env.local
SUPERMEMORY_API_KEY=your_actual_api_key
```

Expected behavior:
- All memory operations work normally
- Connectors can be created and synced
- Search returns actual results

## Future Considerations

1. **UI Feedback**
   - Consider adding UI indicators when features are disabled
   - Show "Enable Supermemory to use this feature" messages

2. **Feature Toggles**
   - Could extend this pattern to other optional services
   - Create a central feature flags system

3. **Logging**
   - Add debug logging when features are disabled
   - Help troubleshoot configuration issues

## Related Documentation

- See `CLAUDE.md` for graceful degradation pattern
- See `ai_quickstart.md` for environment setup
- See `ai_changelog/CHANGELOG_MAIN.md` for related changes

## Impact

**Files Modified:** 3
**Lines Added:** ~52
**Lines Removed:** ~16

**Affected Features:**
- Memory search and management
- Google Drive connector
- Notion connector
- Slack connector
- GitHub connector
- OneDrive connector (when implemented)

**User Impact:**
- Self-hosted users can run without Supermemory
- No breaking changes for users with Supermemory configured
- Clearer error messages when features are unavailable
