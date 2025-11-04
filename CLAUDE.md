# Scira Self-Hosted Development Guidelines

**Last Updated:** 2025-11-03
**Version:** 1.0
**Project:** Scira AI-Powered Search Engine (Self-Hosted Fork)

## Critical Context

**THIS IS A SELF-HOSTED FORK** - Not the upstream Scira project. All modifications are specific to self-hosting with personal API keys.

### Owner's Prime Directive
> **NUNCA FALE QUE ALGO ESTA FUNCIONANDO, ANTES TER CERTEZA E DE TESTAR USANDO DEVTOOLS.**
>
> *(Never say something is working before being sure and testing using DevTools)*

**Always verify functionality before claiming success:**
- Use browser DevTools (Console, Network, Application tabs)
- Test in the actual running application
- Verify API responses and data flow
- Check for console errors or warnings

## Project Overview

**Repository:** https://github.com/zaidmukaddam/scira (upstream)
**Current Branch:** main
**Local Path:** `/Users/guilhermevarela/Public/scira-repo/`
**Development Port:** 8931 (NOT 3000)

Scira is a minimalistic AI-powered search engine that aggregates multiple AI models and search capabilities into a single interface.

### Key Features
- Multi-model AI chat (50+ models)
- Advanced web search (Exa, Tavily, Firecrawl)
- X (Twitter) and Reddit search
- Academic research tools
- Code interpretation
- Weather, stocks, crypto data
- Memory system (optional via Supermemory)
- Connector integrations (Google Drive, Notion, etc.)

## Technology Stack

### Core Framework
- **Frontend:** Next.js 15 (App Router), React, TypeScript
- **Styling:** Tailwind CSS 4.x, Shadcn/UI components
- **Database:** Neon PostgreSQL with Drizzle ORM
- **Authentication:** Better Auth (GitHub, Google, Twitter OAuth)
- **AI Integration:** Vercel AI SDK

### AI Providers
- **xAI:** Grok 4, Grok 3, Grok 3 Mini, Grok 2 Vision
- **Google:** Gemini 2.5 Flash, Gemini 2.5 Pro
- **Anthropic:** Claude 4 Sonnet
- **OpenAI:** GPT-4o, o4-mini, o3
- **Groq:** Qwen, Llama models
- **Novita AI:** Additional inference

### External Services
- **Search:** Exa AI, Tavily, Firecrawl
- **Memory:** Supermemory (optional)
- **Connectors:** Supermemory connectors API
- **Weather:** OpenWeather API
- **Maps:** Google Maps, Mapbox
- **Media:** TMDB (movies/TV)
- **Finance:** yfinance (stocks, crypto)
- **Code Execution:** Daytona sandbox

## Development Environment Setup

### Required Environment Variables

**Critical (must be set):**
```bash
DATABASE_URL=postgresql://user:pass@host:5432/db
BETTER_AUTH_SECRET=your_secret_here
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

**AI Providers (at least one required):**
```bash
XAI_API_KEY=your_xai_key
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
GOOGLE_GENERATIVE_AI_API_KEY=your_google_key
GROQ_API_KEY=your_groq_key
```

**Optional Features:**
```bash
SUPERMEMORY_API_KEY=placeholder  # Set to real key to enable
TAVILY_API_KEY=your_tavily_key
EXA_API_KEY=your_exa_key
FIRECRAWL_API_KEY=your_firecrawl_key
# ... see .env.example for complete list
```

### Local Development Commands

```bash
# Install dependencies
npm install

# Start development server (runs on port 8931)
npm run dev

# Build for production
npm run build

# Database operations
npx drizzle-kit push          # Push schema to database
npx drizzle-kit generate      # Generate migrations
npx drizzle-kit studio        # Open Drizzle Studio

# Check database connection
node -e "require('dotenv').config({ path: '.env.local' }); const { neon } = require('@neondatabase/serverless'); const sql = neon(process.env.DATABASE_URL); sql\`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;\`.then(result => { if (result.length === 0) { console.log('❌ No tables found'); } else { console.log('✅ Tables found:', result.map(r => r.table_name)); } }).catch(err => console.log('❌ Error:', err.message));"
```

## Self-Hosting Modifications

This fork has been modified to remove payment barriers and enable full self-hosting:

### Files Modified for Self-Hosting

1. **`lib/auth.ts` (lines 116-430)**
   - Polar payments plugin: COMMENTED OUT
   - DodoPayments plugin: COMMENTED OUT
   - Reason: Self-hosted uses own API keys

2. **`lib/subscription.ts` (entire file)**
   - All functions return Pro/Active status
   - No actual subscription checks
   - Unlimited usage until 2099

3. **`env/server.ts`**
   - Most env vars made optional
   - Default to 'placeholder' when not set
   - Only critical vars required

4. **`hooks/use-cached-user-data.tsx`**
   - `isProUser`: hardcoded `true`
   - `shouldCheckLimits`: hardcoded `false`
   - `hasActiveSubscription`: hardcoded `true`

5. **`components/ui/form-component.tsx`**
   - Upgrade dialogs: DISABLED
   - Pro model checks: return false
   - Enhance feature: always available

6. **`app/api/search/route.ts`**
   - Line 152: Pro subscription check disabled
   - Line 159: `isProUser` hardcoded `true`
   - No message limits

7. **`lib/db/index.ts`**
   - Upstash cache: REMOVED
   - Direct Neon connection only
   - Read replicas: disabled

8. **`package.json`**
   - Dev server port: 8931
   - All references updated

## Development Best Practices

### Code Quality Standards

1. **Type Safety**
   - Use strict TypeScript
   - Avoid `any` types
   - Proper error handling with typed errors

2. **Performance**
   - Lazy load components where possible
   - Use React.memo for expensive components
   - Optimize database queries
   - Implement proper caching strategies

3. **Security**
   - No hardcoded API keys
   - Input validation on all user inputs
   - CSRF protection for state-changing operations
   - SQL injection prevention (use Drizzle parameterized queries)
   - XSS prevention in React components

4. **Testing Before Claiming Success**
   - ALWAYS use DevTools to verify
   - Check Network tab for API calls
   - Verify Console for errors
   - Test in actual browser, not just build success

### Git Workflow

**Branch Naming:**
- Feature: `feat/description`
- Fix: `fix/description`
- Chore: `chore/description`

**Commit Messages:**
- Use conventional commits: `type(scope): description`
- Examples:
  - `feat(search): add MCP search integration`
  - `fix(connectors): handle missing Supermemory API key`
  - `refactor(ai): change default provider to Tavily`

**Never:**
- Force push to main
- Commit without testing
- Include API keys or secrets

## Project Structure

```
scira-repo/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   └── search/        # Main search endpoint
│   ├── actions.ts         # Server actions
│   └── ...                # Pages and layouts
├── ai/                    # AI provider configurations
│   └── providers.ts       # Model providers setup
├── components/            # React components
│   ├── ui/               # UI components (Shadcn)
│   └── ...               # Feature components
├── lib/                   # Core libraries
│   ├── auth.ts           # Authentication (MODIFIED)
│   ├── subscription.ts    # Subscriptions (MODIFIED)
│   ├── db/               # Database schemas
│   ├── tools/            # AI tools implementation
│   └── connectors.tsx     # External connectors
├── hooks/                 # React hooks
│   └── use-cached-user-data.tsx  # User context (MODIFIED)
├── contexts/              # React contexts
├── env/                   # Environment config
│   └── server.ts         # Server env validation (MODIFIED)
├── ai_changelog/          # Change history
├── ai_docs/              # Technical documentation
├── ai_issues/            # Bug tracking
├── ai_research/          # Research notes
├── ai_specs/             # Specifications
└── ai_quickstart.md      # Quick reference guide
```

## Feature Implementation Guidelines

### Adding New AI Tools

Tools are located in `lib/tools/`:

1. Create new tool file (e.g., `lib/tools/my-tool.ts`)
2. Export tool definition using Vercel AI SDK `tool()` function
3. Add to `lib/tools/index.ts` exports
4. Add to `app/api/search/route.ts` tool object
5. Add to appropriate group in `app/actions.ts`
6. Update types in `lib/types.ts`

Example tool structure:
```typescript
export const myTool = tool({
  description: "What this tool does",
  parameters: z.object({
    query: z.string().describe("Parameter description"),
  }),
  execute: async ({ query }) => {
    // Implementation
    return result;
  },
});
```

### Adding New AI Models

Models are configured in `ai/providers.ts`:

1. Import provider from Vercel AI SDK
2. Add model configuration to appropriate provider
3. Update model lists in UI components
4. Test with actual API key

### Graceful Degradation Pattern

For optional features (like Supermemory):

```typescript
const API_KEY = process.env.FEATURE_API_KEY;
const FEATURE_ENABLED = !!API_KEY && API_KEY !== 'placeholder';

export function featureFunction() {
  if (!FEATURE_ENABLED) {
    return null; // or throw error, or return empty result
  }
  // Normal implementation
}
```

Apply this pattern to:
- Supermemory connectors
- Memory operations
- Optional search providers
- External integrations

## Common Issues and Solutions

### Issue: Hydration Errors

**Cause:** HTML structure mismatch between server and client
**Solution:** Ensure consistent HTML in server/client components

### Issue: Icon Hydration Errors

**Cause:** Some icon libraries not SSR-compatible
**Solution:** Use Lucide React icons, avoid HugeiconsIcon

### Issue: X/Twitter URL Detection

**Cause:** Both x.com and twitter.com domains need handling
**Solution:** Check for both domains in URL detection logic

### Issue: Database Connection Fails

**Solution:**
```bash
# Check DATABASE_URL is set
echo $DATABASE_URL

# Test connection
node -e "/* connection test script */"

# Push schema
npx drizzle-kit push
```

### Issue: Port Already in Use

**Solution:**
```bash
# Find process on port 8931
lsof -i :8931

# Kill it
kill -9 <PID>
```

## What NOT to Modify

**Do NOT change these self-hosting configurations:**

1. Subscription checks (keep bypassed)
2. Payment integrations (keep disabled)
3. Rate limits (keep unlimited for authenticated users)
4. Port settings (keep as 8931)
5. Environment validation (keep optional with defaults)

These are intentionally configured for self-hosting and should remain as-is.

## What IS Safe to Modify

You CAN safely work on:

1. UI/UX improvements
2. New features and tools
3. Bug fixes
4. Performance optimizations
5. New AI models and providers
6. Search capabilities
7. Database schema (with migrations)
8. Component refactoring

## Documentation Standards

### Where to Document

- **Setup/Installation:** `ai_docs/` or update `ai_quickstart.md`
- **Known Issues:** `ai_issues/`
- **Research/Analysis:** `ai_research/`
- **Change History:** `ai_changelog/CHANGELOG_MAIN.md`
- **Feature Specs:** `ai_specs/`
- **Project Guidelines:** This file (`CLAUDE.md`)
- **User-facing:** `README.md`

### Documentation Requirements

- Use clear Markdown formatting
- Include code examples
- Keep current with implementation
- Link related documents
- Add troubleshooting sections
- Include "Last Updated" dates

## Testing Requirements

Before marking any task complete:

1. Start dev server: `npm run dev`
2. Open browser to `http://localhost:8931`
3. Open DevTools (F12 or Cmd+Opt+I)
4. Test the feature:
   - Check Console for errors
   - Check Network tab for API calls
   - Verify Application state if applicable
5. Test edge cases and error scenarios
6. Only THEN claim success

## Key Integration Points

### Frontend-Backend Communication
- API routes in `app/api/`
- Server actions in `app/actions.ts`
- Client components make fetch requests
- Streaming responses for AI chat

### Database Access
- Schema in `lib/db/schema.ts`
- Queries using Drizzle ORM
- Migrations via `drizzle-kit`
- Direct Neon connection (no pooling in dev)

### AI Model Integration
- Provider configs in `ai/providers.ts`
- Vercel AI SDK for streaming
- Tool system for extended capabilities
- Multiple providers for redundancy

### Authentication Flow
- Better Auth library
- OAuth providers (GitHub, Google, Twitter)
- Session management
- User context via hooks

## Performance Optimization

### Critical Areas

1. **Search Performance**
   - Use appropriate search provider (Exa for semantic, Tavily for general)
   - Implement query caching where appropriate
   - Limit result counts sensibly

2. **Database Queries**
   - Use Drizzle's query builder
   - Add indexes for common queries
   - Avoid N+1 queries

3. **Component Rendering**
   - Lazy load heavy components
   - Use React.memo strategically
   - Avoid unnecessary re-renders

4. **Bundle Size**
   - Code split large dependencies
   - Lazy load tool implementations
   - Use dynamic imports for browser-only code

## AI Assistant Guidelines

When working on this codebase:

1. **Remember: This is SELF-HOSTED**
   - Don't add payment walls or limits
   - Don't check subscription status
   - Everything should be "Pro" by default

2. **User Owns All API Keys**
   - No usage restrictions needed
   - Graceful degradation for optional features

3. **Port is 8931**
   - Not 3000 like upstream
   - Update any references accordingly

4. **Test Before Claiming Success**
   - Follow the owner's prime directive
   - Use DevTools to verify
   - Test in actual browser

5. **Document Your Changes**
   - Update `ai_changelog/CHANGELOG_MAIN.md`
   - Add technical details to `ai_docs/` if needed
   - Update this file if adding best practices

## Updates Log

| Date | Update | By |
|------|--------|-----|
| 2025-11-03 | Initial CLAUDE.md creation | Claude Code Documentation Agent |
| 2025-11-03 | Added AI documentation structure | Claude Code Documentation Agent |

## Quick Reference

- **Dev Server:** `npm run dev` → http://localhost:8931
- **Database:** Neon PostgreSQL via Drizzle ORM
- **Auth:** Better Auth with OAuth
- **AI:** Vercel AI SDK with multiple providers
- **Styling:** Tailwind CSS 4 + Shadcn/UI
- **Deployment:** Self-hosted, no payment systems

---

**Remember:** Always verify functionality with DevTools before claiming anything works. The owner has emphasized this is critical to the development process.
