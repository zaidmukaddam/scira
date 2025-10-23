# Gemini API Keys - Setup & Integration Guide

## Overview

This system manages and rotates Gemini API keys automatically based on quota usage. Keys are encrypted in the database and rotated when usage exceeds 250 calls per day.

## Database Setup

### 1. Create Tables
Run the migration:
```bash
npm run db:push  # or pnpm db:push
```

This creates:
- `gemini_api_keys` - Stores encrypted API keys with metadata
- `api_key_usage` - Tracks daily usage per key

### 2. Seed Initial Keys (Optional)

If you have environment variables set:
```bash
GEMINI_API_KEY_1=your_key_here
GEMINI_API_KEY_2=your_second_key
# ... up to GEMINI_API_KEY_5
```

Run the seed script:
```bash
npm run seed:api-keys
```

## Environment Variables

### Required
- `ENCRYPTION_KEY` - 32+ character encryption key for storing API keys (defaults to dev key)
- At least one `GEMINI_API_KEY_*` environment variable

### Example .env.local
```
ENCRYPTION_KEY=your-secret-encryption-key-32-chars-long!!
GEMINI_API_KEY_1=AIzaSyD_your_first_key
GEMINI_API_KEY_2=AIzaSyD_your_second_key
GEMINI_API_KEY_3=AIzaSyD_your_third_key
GOOGLE_GENERATIVE_AI_API_KEY=AIzaSyD_fallback_key
```

## Admin Dashboard

Access the Gemini API keys management at: `/admin/api-keys`

### Features
- **Real-time Status**: View all keys with current usage
- **Progress Bars**: Visual quota usage (0-250 calls/day)
- **Analytics**: Charts, rotation history, and error logs
- **Test Keys**: Verify API key validity
- **Manual Activation**: Force rotation to a specific key
- **Edit/Delete**: Manage key properties

## API Integration

### Automatic Usage Tracking

The system is designed to track usage on API calls. Integrate with your endpoints:

```typescript
import { geminiKeyManager } from '@/lib/gemini-key-manager';

// After successful API call
await geminiKeyManager.incrementUsage(
  apiKeyId,
  messageCount,    // number of user messages
  apiCallCount,    // number of API calls
  tokensUsed       // total tokens (input + output)
);

// Handle errors
try {
  // API call
} catch (error) {
  if (error.message.includes('quota') || error.status === 429) {
    await geminiKeyManager.rotateToNextKey();
  } else if (error.status === 401 || error.status === 403) {
    await geminiKeyManager.markKeyError(apiKeyId, error.message);
  }
}
```

### Key Rotation Logic

The system automatically rotates keys when:
1. **Quota Exceeded**: >= 250 API calls per day
2. **Invalid Key**: 401/403 HTTP responses
3. **Manual Rotation**: Admin triggered via dashboard

Rotation order follows the priority field (1-5):
- Priority 1 keys are used first
- Rotation cycles through enabled keys
- Active key status updates in real-time

## File Structure

```
/lib
  ├── encryption.ts                    # AES-256 encryption/decryption
  ├── gemini-key-manager.ts            # Core manager class
  └── db/
      └── schema.ts                    # Database schema + new tables

/app/api/admin/api-keys
  ├── route.ts                         # POST (create), GET (list + stats)
  ├── [id]/route.ts                    # PUT (update), DELETE (remove)
  ├── [id]/test/route.ts               # POST (test key validity)
  ├── [id]/activate/route.ts           # POST (manual activation)
  └── stats/route.ts                   # GET (analytics data)

/app/admin/api-keys
  └── page.tsx                         # Dashboard page

/components/admin
  ├── api-key-form.tsx                 # Add/Edit form
  └── api-key-analytics.tsx            # Charts & history

/scripts
  └── seed-api-keys.ts                 # Seed initial keys

/drizzle/migrations
  └── 0010_gemini_api_keys.sql         # Schema migration
```

## Security Considerations

1. **Encryption**: All keys encrypted with AES-256-CBC before storage
2. **Key Rotation**: Never expose decrypted keys outside memory
3. **Access Control**: Only admins can view/manage keys
4. **Audit Trail**: All rotations logged in event table
5. **Rate Limiting**: 250 calls/day per key prevents quota breaches

## Monitoring & Troubleshooting

### Check Key Status
```typescript
import { geminiKeyManager } from '@/lib/gemini-key-manager';

const stats = await geminiKeyManager.getFullStats();
console.log(stats.keys); // Array of all keys with usage
```

### Manual Key Reset
```typescript
// Reset daily counters (runs automatically at UTC midnight)
await geminiKeyManager.resetDailyCounters();
```

### Test a Key
```typescript
const result = await geminiKeyManager.testApiKey('AIzaSyD_...');
console.log(result); // { valid: true/false, error?: string }
```

## Common Issues

### "No Active Key"
- Ensure at least one key is enabled and marked as active
- Use admin dashboard to manually activate a key

### "Invalid API Key"
- Verify key format (should start with `AIzaSyD_`)
- Check key hasn't been revoked in Google Cloud Console
- Use "Test" button in admin dashboard to verify

### "Quota Exceeded"
- System automatically rotates to next key
- Check error logs in analytics tab
- Verify you have multiple keys configured

### Encryption/Decryption Errors
- Verify `ENCRYPTION_KEY` is set and consistent
- Check database permissions
- Ensure key length is at least 32 characters

## Next Steps

1. **Set up environment variables** with your API keys
2. **Run migrations** to create database tables
3. **Seed initial keys** (optional, can be done via admin dashboard)
4. **Access admin dashboard** at `/admin/api-keys`
5. **Monitor usage** via analytics tabs
6. **Set up Pusher** for real-time updates (optional but recommended)

## API Endpoints Reference

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/admin/api-keys` | List all keys + current stats |
| POST | `/api/admin/api-keys` | Create new key |
| PUT | `/api/admin/api-keys/[id]` | Update key properties |
| DELETE | `/api/admin/api-keys/[id]` | Delete key (non-primary only) |
| POST | `/api/admin/api-keys/[id]/test` | Test key validity |
| POST | `/api/admin/api-keys/[id]/activate` | Manually activate key |
| GET | `/api/admin/api-keys/stats` | Get analytics data |

## Support

For issues or questions, check:
- Console logs for detailed error messages
- Event table for rotation/error history
- Admin dashboard analytics for usage patterns
