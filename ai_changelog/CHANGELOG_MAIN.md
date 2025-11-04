# Changelog

All notable changes to the Scira self-hosted instance will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- MCP (Model Context Protocol) search functionality re-enabled
  - `lib/tools/mcp-search.ts` - Added back to exports
  - `app/api/search/route.ts:516` - MCP search tool added to available tools
  - `app/actions.ts:267` - Added to web group tools
  - `lib/types.ts` - Type definitions restored
- Connector search functionality with graceful degradation
  - `lib/connectors.tsx` - Added checks for Supermemory API availability
  - `lib/memory-actions.ts` - Added graceful handling when Supermemory is disabled
  - `lib/tools/connectors-search.ts` - Added validation for API key presence

### Changed
- **AI Provider Configuration**
  - `ai/providers.ts:39` - Changed `scira-name` provider from Anannas Llama to xAI Grok 4 Fast
  - Reason: Improved performance and consistency with other Scira models
- **Default Search Provider**
  - `lib/tools/web-search.ts:631` - Changed default from 'parallel' to 'tavily'
  - Improves search reliability and quality for web searches
- **Supermemory Integration**
  - All Supermemory-dependent features now check for valid API key
  - Gracefully disable when `SUPERMEMORY_API_KEY` is 'placeholder' or missing
  - Affected files:
    - `lib/connectors.tsx` - Connection management
    - `lib/memory-actions.ts` - Memory operations
    - `lib/tools/connectors-search.ts` - Connector search

### Technical Details

#### Supermemory Graceful Degradation Pattern
```typescript
const SM_KEY = process.env.SUPERMEMORY_API_KEY;
const SM_ENABLED = !!SM_KEY && SM_KEY !== 'placeholder';

// Check before operations
if (!SM_ENABLED) {
  return { memories: [], total: 0 }; // or throw error
}
```

This pattern is now consistently applied across:
- Connection creation and management
- Memory search and retrieval
- Connector integration

#### Files Modified (9 total)
- `ai/providers.ts` - 1 line changed
- `app/actions.ts` - 1 line added
- `app/api/search/route.ts` - 2 lines changed
- `lib/connectors.tsx` - 17 lines added
- `lib/memory-actions.ts` - 20 lines changed
- `lib/tools/connectors-search.ts` - 15 lines changed
- `lib/tools/index.ts` - 2 lines changed
- `lib/tools/web-search.ts` - 2 lines changed
- `lib/types.ts` - 6 lines changed

Total: +52 insertions, -16 deletions

## [Previous] - 2025-11-03

### Added
- Novita AI documentation to README (commit: 664198c)

### Changed
- Tweet wrapper and loading state UI refinements (commit: a229929)
- Text verbosity logic for Scira models (commit: 234ea37)

### Fixed
- Package dependencies and component logic (commit: 2b52951)
- Scira provider model references and message rendering (commit: cbad27c)

### Refactored
- Dynamic loading of browser-dependent components for performance (commit: a782708)
- Eager loading of tool components for UX improvements (commit: 746155a)

### Security
- Added rate limiting for unauthenticated users (commit: 8c9d486)
- Improved search query security (commit: 8c9d486)

---

## Documentation Structure Created - 2025-11-03

### Added
- AI documentation directory structure:
  - `ai_changelog/` - Change history and versioning
  - `ai_docs/` - Technical documentation and guides
  - `ai_issues/` - Bug reports and issue tracking
  - `ai_research/` - Research notes and experiments
  - `ai_specs/` - Technical specifications
- README.md files in each AI directory explaining purpose and organization

### Context
This changelog was created as part of systematic documentation organization for the self-hosted Scira instance.

---

## Comparison with Upstream

This fork maintains several key differences from the upstream Scira project:

### Self-Hosting Modifications
- No payment systems (Polar, DodoPayments removed)
- No rate limits for authenticated users
- No subscription tiers (everything is "Pro")
- User provides own API keys
- Runs on port 8931 (not 3000)
- Supermemory integration optional (graceful degradation)

See `ai_quickstart.md` for detailed self-hosting setup information.
