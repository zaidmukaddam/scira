# 🤖 AI Quick Start - Scira Self-Hosted Instance

## ⚠️ IMPORTANT: READ THIS FIRST
This is a **SELF-HOSTED FORK** of Scira, not the upstream version. All modifications are specific to self-hosting with personal API keys.

---

## 📌 What is Scira?

Scira is an advanced AI-powered research and search platform that aggregates multiple AI models (GPT-4, Claude, Gemini, etc.) and search capabilities into a single interface. It provides:

- Multi-model AI chat with 50+ models
- Advanced web search with real-time data
- X (Twitter) search integration
- Academic research tools
- Code interpretation
- Weather, stocks, crypto data
- Memory system for context retention

## 🏠 Current Environment: SELF-HOSTED

**You are working on a SELF-HOSTED instance with the following characteristics:**

### Key Differences from Upstream:
1. **NO PAYMENT SYSTEMS** - All payment integrations (Polar, DodoPayments) are disabled
2. **NO RATE LIMITS** - Unlimited usage, no message caps
3. **NO SUBSCRIPTION TIERS** - Everything is "Pro" by default
4. **OWN API KEYS** - User provides all API keys (OpenAI, Anthropic, etc.)
5. **LOCAL DEPLOYMENT** - Runs on port 8931 (not 3000)

---

## 🔧 Recent Modifications (Self-Hosting Setup)

### 1. **Authentication & Payment Removal**
- **Location**: `lib/auth.ts`
- **Changes**: Commented out Polar and DodoPayments plugins (lines 116-252, 253-430)
- **Reason**: Self-hosted uses own APIs, no need for payment processing

### 2. **Subscription System Override**
- **Location**: `lib/subscription.ts`
- **Changes**: All functions return Pro/Active status
  - `getComprehensiveProStatus()` → Always returns `{ isProUser: true, source: 'polar' }`
  - `isUserSubscribed()` → Always returns `true`
  - `isUserProCached()` → Always returns `true`
  - `getUserSubscriptionStatus()` → Always returns `'active'`
  - `getSubscriptionDetails()` → Returns unlimited subscription until 2099

### 3. **Environment Variables**
- **Location**: `env/server.ts`
- **Changes**: Made most env vars optional with 'placeholder' defaults
- **Required**: Only DATABASE_URL, BETTER_AUTH_SECRET, GITHUB_CLIENT_ID/SECRET

### 4. **User Context Override**
- **Location**: `hooks/use-cached-user-data.tsx`
- **Changes**:
  - `isProUser` → hardcoded `true`
  - `shouldCheckLimits` → hardcoded `false`
  - `hasActiveSubscription` → hardcoded `true`

### 5. **UI Components**
- **Location**: `components/ui/form-component.tsx`
- **Changes**:
  - Disabled all upgrade dialogs (lines 536, 600-603, 824-828, 2504-2508)
  - All Pro model checks return false
  - Enhance feature always available

### 6. **API Route**
- **Location**: `app/api/search/route.ts`
- **Changes**:
  - Line 152: Disabled Pro subscription check
  - Line 159: `isProUser` hardcoded to `true`
  - No message limits applied

### 7. **Database Configuration**
- **Location**: `lib/db/index.ts`
- **Changes**: Removed Upstash cache, uses direct Neon connection
- **Note**: Read replicas disabled for development

### 8. **Port Configuration**
- **Location**: `package.json`
- **Scripts**: `"dev": "next dev -p 8931"`
- **All References**: Changed from 3000 → 8931

---

## 🚨 DO NOT MODIFY

**These areas should NOT be changed as they're configured for self-hosting:**

1. **Subscription checks** - Already bypassed, don't re-enable
2. **Payment integrations** - Stay disabled
3. **Rate limits** - Should remain unlimited
4. **Port settings** - Keep as 8931
5. **Environment validation** - Keep optional with defaults

---

## ✅ Safe to Modify

You CAN safely work on:

1. **UI/UX improvements** - Components, styling, layouts
2. **New features** - Add new tools, integrations
3. **Bug fixes** - Fix existing issues
4. **Performance** - Optimize queries, caching (except Upstash)
5. **New AI models** - Add support for more models
6. **Search tools** - Enhance search capabilities

---

## 📁 Project Structure

```
/Users/guilhermevarela/Public/scira-repo/
├── app/                 # Next.js app directory
├── components/          # React components
├── lib/                 # Core libraries
│   ├── auth.ts         # Authentication (MODIFIED)
│   ├── subscription.ts  # Subscription logic (MODIFIED)
│   ├── db/             # Database schemas
│   └── tools/          # AI tools
├── hooks/              # React hooks
├── contexts/           # React contexts
└── env/                # Environment config (MODIFIED)
```

---

## 🐛 Known Issues Fixed

1. **Hydration Errors** - Fixed HTML structure violations in DialogDescription components
2. **X/Twitter Integration** - Fixed URL detection for both x.com and twitter.com domains
3. **Authentication Flow** - Fixed GitHub OAuth with correct port configuration
4. **Environment Variables** - Fixed validation with optional defaults
5. **Icon Hydration** - Replaced HugeiconsIcon with Lucide React icons for SSR compatibility
6. **Button Structure** - Fixed Button components with improper asChild usage

---

## 💡 Context for Future AI Assistants

When working on this codebase:

1. **Remember this is SELF-HOSTED** - Don't add payment walls or limits
2. **User owns all API keys** - No need for usage restrictions
3. **Everything is "Pro"** - Don't check subscription status
4. **Port is 8931** - Not 3000 like upstream
5. **Database is Neon** - PostgreSQL with Drizzle ORM
6. **No Redis/Upstash** - Cache disabled for development

---

## 🔥 Quick Commands

```bash
# Start development server
npm run dev              # Runs on http://localhost:8931

# Database operations
npx drizzle-kit push     # Push schema to database
npx drizzle-kit generate # Generate migrations

# Check database
node -e "/* check db query */"  # See package.json for examples
```

---

## 📝 User Instructions from .claude/CLAUDE.md

```
- NUNCA FALE QUE ALGO ESTA FUNCIONANDO, ANTES TER CERTEZA E DE TESTAR USANDO DEVTOOLS.
```
*(Never say something is working before being sure and testing using devtools)*

---

## 🎯 Current State Summary

- **Status**: Fully functional self-hosted instance
- **Auth**: Working with GitHub OAuth
- **Features**: All features unlocked and available
- **APIs**: Using user's own API keys
- **Database**: Connected to Neon PostgreSQL
- **UI**: All upgrade prompts disabled
- **Performance**: No rate limits or usage caps

---

## 📞 Owner Contact

- **Repository Owner**: guilhermevarela
- **Location**: `/Users/guilhermevarela/Public/scira-repo/`
- **Git Status**: Local repository, self-hosted modifications

---

## ⚡ TLDR for AI

You're working on a **SELF-HOSTED Scira fork** where:
- Everything is FREE and UNLIMITED
- No payments, no subscriptions, no limits
- User provides their own API keys
- Runs on port 8931
- All "Pro" checks should return true
- Don't add restrictions or payment features
- This is NOT the upstream version

**Your role**: Help maintain and improve this self-hosted instance while preserving the unlimited, restriction-free nature of the deployment.