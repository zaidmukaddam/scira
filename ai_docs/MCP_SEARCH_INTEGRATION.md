# MCP Search Integration

**Date:** 2025-11-03
**Status:** Re-enabled
**Related Commits:** b544cb6

## Overview

Re-enabled the Model Context Protocol (MCP) search functionality that was previously commented out. MCP search allows users to discover and search for Model Context Protocol servers from the Smithery Registry.

## What is MCP?

Model Context Protocol (MCP) is a standardized protocol for AI model context management. The MCP search tool allows users to:
- Search for MCP servers in the Smithery Registry
- Discover available context providers
- Find tools and integrations for AI applications

## Implementation

### Files Modified

1. **`lib/tools/index.ts`**
   - Uncommented export of `mcpSearchTool`
   - Location: Line 18

```typescript
// Before
// export { mcpSearchTool } from './mcp-search';

// After
export { mcpSearchTool } from './mcp-search';
```

2. **`lib/types.ts`**
   - Uncommented type definition for `mcpSearchTool`
   - Restored to `ChatTools` type
   - Locations: Lines 139, 171

```typescript
// Type definition
type mcpSearchTool = InferUITool<typeof mcpSearchTool>;

// In ChatTools interface
export type ChatTools = {
  // ... other tools
  mcp_search: mcpSearchTool;
  // ... more tools
}
```

3. **`app/api/search/route.ts`**
   - Uncommented import of `mcpSearchTool`
   - Added to available tools object
   - Locations: Lines 67, 516

```typescript
// Import
import {
  // ... other imports
  mcpSearchTool,
  // ... more imports
} from '@/lib/tools';

// In tools object
const tools = {
  // ... other tools
  mcp_search: mcpSearchTool,
  // ... more tools
};
```

4. **`app/actions.ts`**
   - Added `mcp_search` to web group tools
   - Location: Line 267

```typescript
const groupTools = {
  web: [
    'web_search',
    // ... other tools
    'mcp_search', // Added
    // ... more tools
  ] as const,
  // ... other groups
};
```

## Tool Functionality

The MCP search tool is located in `lib/tools/mcp-search.ts` and provides:

**Tool Name:** `mcp_search`

**Description:** Search for Model Context Protocol servers in Smithery Registry

**Parameters:**
- `query` (string) - Search query for finding MCP servers

**Response:** JSON array of MCP servers with:
- Server name
- Description
- Repository URL
- Installation instructions
- Available tools/capabilities

## Usage

Users can now use MCP search in the web search group:

1. Select "Web" search group
2. Ask about MCP servers:
   - "Find MCP servers for file system access"
   - "Search for database MCP servers"
   - "What MCP servers are available for GitHub?"

3. The AI will use the `mcp_search` tool to query Smithery Registry

## Integration Points

### Search Groups

MCP search is available in the **Web** group (`app/actions.ts:267`):
- Web search
- URL content retrieval
- Maps and location
- Weather
- Datetime
- **MCP search** ← New addition

### API Route

Integrated into main search endpoint (`app/api/search/route.ts:516`):
- Available to all authenticated users
- No special permissions required
- Part of standard tool set

## Why Was It Disabled?

The tool was previously commented out (lines with `//`), likely for one of these reasons:
- Testing/debugging purposes
- API rate limiting concerns
- Feature flag for gradual rollout

## Why Re-enable Now?

Re-enabled because:
1. Self-hosted instance has no rate limit concerns
2. Useful feature for developers working with MCP
3. No known issues with the implementation
4. Complements other search capabilities

## Testing

To verify MCP search is working:

1. Start dev server: `npm run dev`
2. Navigate to `http://localhost:8931`
3. Select "Web" search group
4. Test queries:
   ```
   User: "Find MCP servers for filesystem"
   Expected: Tool call to mcp_search with query about filesystem

   User: "What MCP servers exist for GitHub?"
   Expected: Tool call to mcp_search returning GitHub-related servers
   ```

5. Check DevTools:
   - **Network tab:** Look for API calls to Smithery
   - **Console:** Check for mcp_search tool execution
   - **Response:** Verify JSON structure is correct

## Dependencies

**API Key Required:**
```bash
SMITHERY_API_KEY=your_key_here
```

Set in `.env.local` for local development.

**External Service:**
- Smithery Registry API
- Documentation: https://smithery.ai

## Error Handling

The tool should handle:
- Missing API key (graceful error message)
- Network failures (retry logic)
- Invalid queries (validation)
- Empty results (user-friendly message)

## Future Enhancements

Potential improvements:
1. **Caching** - Cache popular MCP server searches
2. **Filtering** - Add filters by category, language, popularity
3. **Favorites** - Let users save favorite MCP servers
4. **Installation Helper** - Auto-generate installation commands

## Related Documentation

- MCP Specification: https://modelcontextprotocol.io
- Smithery Registry: https://smithery.ai
- Tool implementation: `lib/tools/mcp-search.ts`
- See `CLAUDE.md` for general tool development guidelines

## Impact

**Files Modified:** 4
**Lines Changed:** ~6
**User-Facing:** Yes

**Affected Features:**
- Web search group now includes MCP search
- Users can discover MCP servers via chat interface
- Developers can find context providers for AI applications

**No Breaking Changes:**
- Existing functionality unchanged
- Purely additive feature
