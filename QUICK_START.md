# 🚀 Gemini API Keys Management - Quick Start

## What's New

A complete system for managing and automatically rotating Gemini API keys with:
- ✅ Encrypted storage (AES-256)
- ✅ Admin dashboard with real-time stats
- ✅ Automatic rotation at 250 calls/day
- ✅ Error handling & logging
- ✅ Manual activation controls

## 5-Minute Setup

### 1️⃣ Run Migration
```bash
npm run db:push
```

### 2️⃣ Set Environment
```bash
# Add to .env.local
ENCRYPTION_KEY=my-secret-32-character-encryption-key!
GEMINI_API_KEY_1=AIzaSyD_your_first_key_here
GEMINI_API_KEY_2=AIzaSyD_your_second_key_here
```

### 3️⃣ Seed Keys (Optional)
```bash
npm run seed:api-keys
```

### 4️⃣ Access Dashboard
Navigate to: `/admin/api-keys`

## What You Can Do Now

### 📊 View Dashboard
- See all keys with real-time usage
- Progress bars showing quota (0-250)
- Last used timestamps
- Error status indicators

### ➕ Add Keys
- Copy-paste Gemini API key
- Set display name & priority
- Enable/disable as needed

### 🧪 Test Keys
- Click "Test" button to verify key
- Get validation errors immediately
- No need to leave dashboard

### 🔄 Manual Rotation
- Force switch to any key
- Automatic logging of rotation
- Broadcast to admin channel via Pusher

### 📈 Analytics
- Daily usage charts by key
- Rotation history with reasons
- Error logs with timestamps
- Error rate percentage

## File Structure

**New Files (12)**
```
/lib
  └── encryption.ts                      # AES-256 encryption
  └── gemini-key-manager.ts             # Core manager class

/app/api/admin/api-keys
  ├── route.ts                          # CRUD + Stats
  ├── [id]/route.ts                     # Update/Delete
  ├── [id]/test/route.ts                # Test key
  ├── [id]/activate/route.ts            # Activate
  └── stats/route.ts                    # Analytics

/app/admin/api-keys
  └── page.tsx                          # Dashboard UI

/components/admin
  ├── api-key-form.tsx                  # Add/Edit form
  └── api-key-analytics.tsx             # Charts & history

/scripts
  └── seed-api-keys.ts                  # Initialize keys

/drizzle/migrations
  └── 0010_gemini_api_keys.sql          # DB schema
```

**Modified Files (3)**
```
/lib/db/schema.ts                    # New tables
/ai/providers.ts                     # Updated Google provider
/components/admin/orcish/app-sidebar.tsx  # Added menu item
/package.json                        # Added seed script
```

**Documentation (4)**
```
API_KEYS_SETUP.md              # Complete setup guide
GEMINI_API_KEYS_IMPLEMENTATION.md  # What was built
INTEGRATION_EXAMPLES.md         # Code examples
QUICK_START.md                 # This file
```

## Key Features Explained

### 🔐 Encryption
- Keys stored encrypted with AES-256-CBC
- Each encryption uses unique IV (initialization vector)
- Decrypted only in memory for API calls
- Never exposed in responses (only last 4 chars shown)

### 🔄 Automatic Rotation
- **Trigger**: Key reaches 250 API calls/day
- **Order**: By priority (1=highest, 5=lowest)
- **Logging**: All rotations recorded in event table
- **Broadcast**: Pusher notification to admins

### 📊 Real-time Tracking
- Usage updated after each API call
- Dashboard refreshes every 5 seconds
- Color-coded usage bars:
  - 🟢 Green: 0-60%
  - 🟠 Orange: 60-80%
  - 🔴 Red: 80-100%

### 🛡️ Error Handling
- **401/403**: Invalid key → marked, rotated
- **429**: Quota exceeded → automatic rotation + retry
- **Other**: Logged without auto-rotation
- All errors visible in analytics

### 👥 Admin Only
- All endpoints require admin role
- Cannot delete primary key
- Cannot access keys as non-admin

## Integration Examples

### Track Usage in Your Endpoint
```typescript
import { geminiKeyManager } from '@/lib/gemini-key-manager';

await geminiKeyManager.incrementUsage(
  keyId,
  1,      // messages
  1,      // api calls
  1024    // tokens
);
```

### Handle Errors
```typescript
try {
  // API call
} catch (error) {
  if (error.status === 429) {
    await geminiKeyManager.rotateToNextKey();
  } else if (error.status === 401) {
    await geminiKeyManager.markKeyError(keyId, error.message);
  }
}
```

See `INTEGRATION_EXAMPLES.md` for more patterns.

## Database Tables

### gemini_api_keys
```
id              UUID (Primary Key)
key             TEXT (Encrypted, Unique)
displayName     TEXT
isActive        BOOLEAN
isPrimary       BOOLEAN
enabled         BOOLEAN
priority        INTEGER (1-5)
createdAt       TIMESTAMP
updatedAt       TIMESTAMP
lastUsedAt      TIMESTAMP (nullable)
lastErrorAt     TIMESTAMP (nullable)
```

### api_key_usage
```
id              UUID (Primary Key)
apiKeyId        TEXT (Foreign Key)
date            TEXT (YYYY-MM-DD)
messageCount    INTEGER
apiCallCount    INTEGER
tokensUsed      INTEGER
createdAt       TIMESTAMP
updatedAt       TIMESTAMP
```

## API Reference

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/admin/api-keys` | Create key |
| GET | `/api/admin/api-keys` | List + stats |
| PUT | `/api/admin/api-keys/[id]` | Update key |
| DELETE | `/api/admin/api-keys/[id]` | Delete key |
| POST | `/api/admin/api-keys/[id]/test` | Test key |
| POST | `/api/admin/api-keys/[id]/activate` | Activate key |
| GET | `/api/admin/api-keys/stats` | Get analytics |

## Frequently Asked Questions

**Q: Where do I add my API keys?**
A: Either set `GEMINI_API_KEY_*` env vars and run seed, or add manually in dashboard.

**Q: Can I delete a key?**
A: Yes, except the primary key (marked with 🔴 Primary badge).

**Q: What happens at 250 calls?**
A: Automatic rotation to next enabled key with logging.

**Q: Can I see rotation history?**
A: Yes, in dashboard "Analytics" tab under "Rotation History".

**Q: Is my API key safe?**
A: Yes, encrypted with AES-256 and never exposed (only last 4 chars shown).

**Q: How do I test if a key works?**
A: Click "Test" button in dashboard.

**Q: What if all keys have errors?**
A: Dashboard shows red error badges. Fix/delete errored keys or add new ones.

## Troubleshooting

### Keys Not Showing
- Run `npm run db:push` again
- Check user has admin role
- Check browser console for errors

### Can't Add Key
- Verify format: AIzaSyD_... 
- Check key isn't already in system
- Try testing first with "Test" button

### Rotation Not Happening
- Check key is enabled (toggle switch)
- Verify usage tracking is working
- Look at event table for errors

### "No Active Key" Error
- Add at least one key
- Enable it with toggle
- Use dashboard "Activate" button

## Next Steps

1. ✅ Set up environment & run migrations
2. ✅ Add your API keys via dashboard
3. ✅ Test keys with "Test" button
4. ✅ Integrate tracking in your endpoints (see INTEGRATION_EXAMPLES.md)
5. ✅ Monitor usage in analytics dashboard
6. ✅ Deploy with confidence

## Documentation Files

| File | Purpose |
|------|---------|
| `QUICK_START.md` | This file - overview |
| `API_KEYS_SETUP.md` | Detailed setup & security |
| `GEMINI_API_KEYS_IMPLEMENTATION.md` | What was built & how |
| `INTEGRATION_EXAMPLES.md` | Code examples & patterns |

## Support & Issues

- 📊 Check dashboard analytics for errors
- 🔍 Query event table for logs
- 💻 Check browser console
- 📝 Look at migration files if DB issues
- ✅ Test individual keys in dashboard

## Architecture Diagram

```
┌─────────────────────────────────────┐
│  Admin Dashboard (/admin/api-keys)  │
│  - View all keys & usage            │
│  - Add/Edit/Delete/Test keys        │
│  - View analytics & history         │
└──────────────┬──────────────────────┘
               │
    ┌──────────▼───────────┐
    │  API Endpoints       │
    │  /api/admin/api-keys │
    └──────────┬───────────┘
               │
    ┌──────────▼──────────────────────────┐
    │  GeminiKeyManager (Core)            │
    │  - getActiveKey()                   │
    │  - rotateToNextKey()                │
    │  - incrementUsage()                 │
    │  - handleErrors()                   │
    │  - getStats()                       │
    └──────────┬──────────────────────────┘
               │
    ┌──────────▼───────────────────┐
    │  PostgreSQL Database         │
    │  - gemini_api_keys          │
    │  - api_key_usage            │
    │  - event (logs)             │
    └──────────────────────────────┘
```

## Credits

Built with:
- 🔐 Node.js crypto (AES-256-CBC)
- 🗄️ Drizzle ORM
- 📦 PostgreSQL
- 🎨 Recharts (analytics)
- ⚡ Next.js App Router
- 🎪 shadcn/ui components

---

**Ready?** Run `npm run db:push` then navigate to `/admin/api-keys` 🚀
