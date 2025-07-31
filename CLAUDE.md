# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Atlas is an AI-powered search engine built with Next.js 15, TypeScript, and the Vercel AI SDK. It provides multiple specialized search modes and integrates with various AI models (xAI, Anthropic, Google, OpenAI) and data sources.

## Key Architecture

### Tech Stack
- **Framework**: Next.js 15.4 with App Router and React 19
- **Language**: TypeScript with strict mode
- **Styling**: Tailwind CSS v4 with PostCSS
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Better Auth with social providers (GitHub, Google, Twitter)
- **AI Integration**: Vercel AI SDK with multiple model providers
- **State Management**: React Query (TanStack Query)
- **Package Manager**: Bun (not npm or yarn)

### Project Structure
```
/app            # Next.js app router pages and API routes
/components     # React components (UI, features, shared)
/lib            # Core utilities, database, tools, and business logic
  /db           # Database schema and queries
  /tools        # AI tool implementations for search features
/hooks          # Custom React hooks
/ai             # AI model provider configurations
/public         # Static assets
```

## Development Commands

```bash
# Install dependencies
bun install

# Run development server with Turbopack
bun dev

# Build for production
bun build

# Run production server
bun start

# Lint code
bun lint

# Database operations
bun db:generate    # Generate migrations
bun db:migrate     # Run migrations
bun db:push        # Push schema changes
bun db:studio      # Open Drizzle Studio
```

## Environment Setup

Copy `.env.example` to `.env.local` and configure required API keys. Critical keys include:
- AI providers: XAI_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY, etc.
- Database: DATABASE_URL
- Auth: BETTER_AUTH_SECRET, social provider credentials
- Search APIs: EXA_API_KEY, TAVILY_API_KEY

## Key Features & Tools

The application implements various search tools in `/lib/tools/`:
- Web search (Tavily)
- Academic search (Exa)
- Social media search (X/Twitter, Reddit)
- Media search (YouTube, Movies/TV)
- Financial tools (stock charts, currency conversion)
- Location services (maps, weather, flights)
- Code interpreter (Daytona sandbox)
- Memory management (Mem0)

## Database Schema

Key tables (defined in `/lib/db/schema.ts`):
- `user`: User accounts and profiles
- `chat`: Conversation sessions
- `message`: Chat messages with parts/attachments
- `subscription`: User subscriptions (Polar)
- `payment`: Payment records (DodoPayments)
- `stream`: Streaming session management

## Authentication Flow

Authentication uses Better Auth with:
- Social providers: GitHub, Google, Twitter
- Session management with cookies
- Integration with payment providers (Polar, DodoPayments)
- User data caching for performance

## AI Model Integration

Models are configured in `/ai/providers.ts` with support for:
- Streaming responses
- Tool/function calling
- Vision capabilities (for applicable models)
- Custom system prompts per search mode

## Search Modes

Different search modes are available:
- Web: General internet search
- Academic: Research papers and academic content
- X/Reddit: Social media search
- YouTube: Video search with transcripts
- Analysis: Code execution and data analysis
- Memory: Personal knowledge management
- Extreme: Multi-step deep research

## Code Style Guidelines

- Use functional components with TypeScript
- Prefer server components where possible
- Use `'use client'` directive only when necessary
- Follow existing patterns for error handling
- Use Tailwind CSS for styling
- Implement proper loading and error states

## Testing Approach

Currently, the project doesn't have a test suite configured. When implementing tests:
- Check for existing test configurations first
- Follow Next.js testing best practices
- Use appropriate testing libraries for the stack

## Performance Considerations

- Implements caching with Redis for user data
- Uses React Query for client-side data caching
- Database queries are optimized with proper indexes
- Image optimization configured in `next.config.ts`
- Streaming AI responses for better UX

## Deployment

- Configured for Vercel deployment
- Uses standalone output mode
- Docker support available
- Environment-specific configurations for dev/prod