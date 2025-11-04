# AI Provider Configuration Changes

**Date:** 2025-11-03
**Status:** Implemented
**Related Commits:** b544cb6

## Overview

Changed the AI provider for the `scira-name` model from Anannas (Llama) to xAI (Grok 4 Fast) for improved performance and consistency.

## Changes Made

### File: `ai/providers.ts`

**Line 39:**
```typescript
// Before
'scira-name': anannas.chat('meta-llama/llama-3.3-70b-instruct'),

// After
'scira-name': xai('grok-4-fast-non-reasoning'),
```

## Rationale

### Why Change from Anannas to xAI?

1. **Performance Consistency**
   - Other Scira models use xAI (Grok) as primary provider
   - Reduces provider fragmentation
   - More predictable performance characteristics

2. **Model Capabilities**
   - Grok 4 Fast is optimized for low-latency responses
   - Better suited for name generation and quick tasks
   - Non-reasoning variant reduces unnecessary computation

3. **Reliability**
   - xAI infrastructure generally more stable
   - Better uptime for self-hosted deployments
   - Consistent with other model choices in the app

4. **API Simplification**
   - One less provider to manage API keys for
   - Simplified provider configuration
   - Easier troubleshooting

## Impact Analysis

### Models Using xAI (After Change)

The Scira provider now uses xAI for these models:
- `scira-default`: `grok-4-fast-non-reasoning`
- `scira-name`: `grok-4-fast-non-reasoning` ← **Changed**
- `scira-grok-3-mini`: `grok-3-mini`
- `scira-grok-3`: `grok-3`
- `scira-grok-4`: `grok-4`
- `scira-grok-4-fast`: `grok-4-fast-non-reasoning`

### Models Still Using Other Providers

- `scira-nano`: `groq('llama-3.3-70b-versatile')` - Groq remains for this model

### Provider Distribution

| Provider | Models | Percentage |
|----------|--------|------------|
| xAI      | 6      | 86%        |
| Groq     | 1      | 14%        |
| Anannas  | 0      | 0% (removed) |

## Configuration Requirements

### Environment Variables Needed

**Required:**
```bash
XAI_API_KEY=your_xai_api_key
```

**Optional (for other models):**
```bash
GROQ_API_KEY=your_groq_api_key
```

**No Longer Needed:**
```bash
# ANANNAS_API_KEY - Can be removed if not used elsewhere
```

## Testing

### Verify the Change

1. **Start Development Server:**
```bash
npm run dev
```

2. **Test scira-name Model:**
   - Open chat interface at `http://localhost:8931`
   - Select "scira-name" model (or trigger name generation)
   - Verify responses come from xAI/Grok

3. **Check DevTools:**
   - Network tab: Look for requests to xAI API endpoints
   - Console: Verify no errors about missing Anannas config
   - Check response times (should be fast)

4. **Compare with Other Grok Models:**
   - Test `scira-default` (also uses Grok 4 Fast)
   - Responses should have similar latency and quality
   - Verify consistent behavior

### Expected Behavior

**Before:**
- `scira-name` would use Llama 3.3 70B via Anannas
- Different response characteristics
- Potentially different latency

**After:**
- `scira-name` uses Grok 4 Fast via xAI
- Consistent with default model
- Faster response times
- More predictable behavior

## Performance Implications

### Latency

**Grok 4 Fast Characteristics:**
- Optimized for low-latency responses
- "Fast" variant trades some capability for speed
- "Non-reasoning" variant is even faster (no chain-of-thought)

**Expected Improvement:**
- Reduced time-to-first-token
- Faster overall completion
- Better user experience for quick tasks

### Cost Considerations

Self-hosted instance uses owner's API key:
- xAI pricing may differ from Anannas
- Grok 4 Fast designed to be cost-effective
- Monitor usage in xAI dashboard

## Migration Notes

### For Self-Hosted Users

1. **Ensure xAI API Key is Set:**
   - Check `.env.local` has `XAI_API_KEY`
   - Key should be valid and have sufficient credits

2. **Remove Anannas Key (Optional):**
   - If no other models use Anannas, can remove:
   ```bash
   # Can delete this line from .env.local
   # ANANNAS_API_KEY=...
   ```

3. **No Code Changes Required:**
   - Change is transparent to users
   - Existing chats continue working
   - No database migrations needed

### For Upstream Integration

If merging back to upstream:
- Consider making provider configurable
- Add environment variable for provider selection
- Document the change in upstream changelog

## Rollback Procedure

If needed to revert:

1. **Edit `ai/providers.ts` line 39:**
```typescript
'scira-name': anannas.chat('meta-llama/llama-3.3-70b-instruct'),
```

2. **Restore Anannas API Key:**
```bash
ANANNAS_API_KEY=your_anannas_key
```

3. **Restart Server:**
```bash
npm run dev
```

## Related Models

### Scira Provider Models

All models in the `scira` custom provider (`ai/providers.ts:35-46`):

| Model Name | Provider | Actual Model |
|------------|----------|--------------|
| scira-default | xAI | grok-4-fast-non-reasoning |
| scira-nano | Groq | llama-3.3-70b-versatile |
| scira-name | xAI | grok-4-fast-non-reasoning ⭐ |
| scira-grok-3-mini | xAI | grok-3-mini |
| scira-grok-3 | xAI | grok-3 |
| scira-grok-4 | xAI | grok-4 |
| scira-grok-4-fast | xAI | grok-4-fast-non-reasoning |

⭐ = Changed in this update

## Future Considerations

1. **Provider Selection:**
   - Could make provider configurable per model
   - Add UI for selecting preferred providers
   - Environment variable override option

2. **Load Balancing:**
   - Rotate between providers for redundancy
   - Fallback to alternative if primary fails
   - Cost optimization based on provider pricing

3. **Provider Monitoring:**
   - Track response times per provider
   - Monitor error rates
   - Automatic failover on provider issues

## Documentation Updates

- ✅ Updated `CLAUDE.md` with provider information
- ✅ Updated `ai_changelog/CHANGELOG_MAIN.md`
- ✅ Created this technical documentation
- ✅ Updated `ai_docs/README.md` index

## Related Documentation

- See `ai/providers.ts` for full provider configuration
- See `CLAUDE.md` section "AI Providers" for overview
- See `README.md` for supported models list

## Impact Summary

**Files Modified:** 1 (`ai/providers.ts`)
**Lines Changed:** 1
**User-Facing:** No (transparent change)
**Breaking Changes:** None
**API Keys Required:** xAI (already required)
**API Keys Deprecated:** Anannas (for this model)

**Benefits:**
- Improved consistency across Scira models
- Faster response times
- Simplified provider management
- Better reliability

**Risks:**
- None identified (xAI already used for other models)
