# Changelog

All notable changes to the Scira self-hosted instance will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2025-11-11] - Share URL Fix & Allow Continuation Feature

### Added
- **Allow Continuation Feature** - Chat owners can now control if visitors can add messages to public shared pages
  - `lib/db/schema.ts:71` - Added `allowContinuation` boolean column to chat table (default: true)
  - `drizzle/migrations/0009_strong_black_queen.sql` - Migration to add the new column
  - `lib/db/queries.ts:287-316` - New `updateChatAllowContinuationById()` function
  - `app/actions.ts:1545-1592` - New `updateChatAllowContinuation()` server action with auth
  - `components/chat-state.ts` - Added `allowContinuation` to state management
  - `components/share/share-dialog.tsx:262-278` - Toggle UI in ShareDialog
  - `components/share/share-button.tsx` - Props for allowContinuation handling
  - `components/chat-interface.tsx:573-608` - Handler and conditional input rendering
  - `components/navbar.tsx` - Props cascade for allowContinuation
  - `app/search/[id]/page.tsx` - Pass initialAllowContinuation to ChatInterface
  - When disabled: Visitors see messages but NO input field (read-only mode)
  - When enabled (default): Visitors can continue the conversation

### Fixed
- **Share URL Generation Bug** - Fixed hardcoded upstream domain in shared pages
  - `components/share/share-dialog.tsx:50` - Changed from hardcoded `https://scira.ai` to `window.location.origin`
  - `app/layout.tsx` - Updated metadata configuration
  - Configured `NEXT_PUBLIC_APP_URL` in Vercel environment variables
  - Shared URLs now correctly point to user's Vercel deployment (scira-repo.vercel.app)

### Fixed (Build & TypeScript)
- **Model Constants Export** - Fixed Vercel build failure
  - `ai/providers.ts` - Exported `DEFAULT_MODEL` and `LEGACY_DEFAULT_MODEL` constants
  - `app/api/raycast/route.ts` - Updated to use exported constants
  - `components/ui/form-component.tsx` - Updated to use exported constants
  - `lib/tools/text-translate.ts` - Updated to use exported constants
  - Fixed error: "Export DEFAULT_MODEL doesn't exist in target module"

- **TypeScript Type Error** - Fixed type inference issue
  - `components/chat-interface.tsx:69` - Added explicit `<string>` type to useLocalStorage
  - Fixed error: "This comparison appears to be unintentional because the types have no overlap"

- **Next.js Configuration** - Removed invalid experimental config
  - `next.config.ts:23-26` - Removed invalid `experimental.turbo` configuration
  - Fixed warning: "Unrecognized key(s) in object: 'turbo' at experimental"

### Technical Details

#### Feature Implementation Flow
```
User (Chat Owner) → ShareDialog Toggle
  ↓
Server Action (updateChatAllowContinuation)
  ↓
Database Update (allowContinuation column)
  ↓
State Management (chatState.allowContinuation)
  ↓
Conditional Rendering (ChatInterface)
  ↓
Visitor Experience (input visible/hidden)
```

#### Database Schema Change
```sql
ALTER TABLE "chat"
ADD COLUMN "allow_continuation" boolean
DEFAULT true NOT NULL;
```

#### Conditional Input Logic
```typescript
{((user && isOwner) ||
  (!isOwner && chatState.allowContinuation) ||
  !initialChatId ||
  (!user && chatState.selectedVisibilityType === 'private')) &&
  !isLimitBlocked && (
    <FormComponent ... />
  )}
```

This ensures:
- Owners always see input
- Non-owners only see input if allowContinuation is true
- Private pages without auth show input (for sign-in prompts)

#### Files Modified (17 total)
- `ai/providers.ts` - Model constants export
- `app/actions.ts` - Server action for allowContinuation
- `app/api/raycast/route.ts` - Use exported model constants
- `app/layout.tsx` - Metadata configuration
- `app/search/[id]/page.tsx` - Pass allowContinuation prop
- `components/chat-interface.tsx` - Handler & conditional rendering + type fix
- `components/chat-state.ts` - State management
- `components/navbar.tsx` - Props cascade
- `components/share/share-button.tsx` - Props handling
- `components/share/share-dialog.tsx` - Toggle UI + dynamic URL fix
- `components/ui/form-component.tsx` - Use exported model constants
- `lib/db/queries.ts` - Database query function
- `lib/db/schema.ts` - Schema update
- `lib/tools/text-translate.ts` - Use exported model constants
- `next.config.ts` - Remove invalid config
- `drizzle/migrations/0009_strong_black_queen.sql` - Migration file

Total: ~150+ insertions across feature implementation and fixes

#### Commits
- `3d1ed8c` - Configure dynamic base URLs for different environments
- `4f00de6` - feat: add allowContinuation toggle to control visitor chat input
- `1119e5b` - fix: export DEFAULT_MODEL and LEGACY_DEFAULT_MODEL constants
- `cac2f83` - fix: resolve TypeScript build errors

#### Deployment Status
✅ Successfully deployed to Vercel production
✅ All builds passing
✅ Feature ready for testing with authentication

---

## [Previous Changes]

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
