# Atlas Database Requirements & Integration Plan

## Overview
Atlas (Remi AI) needs to integrate with Famasi Africa's existing database and APIs while decoupling from the current Scira database schema. This document outlines the database requirements, integration points, and migration strategy.

## Current Database Analysis

### Existing Scira Schema (to be replaced/modified)
```typescript
// Current tables in lib/db/schema.ts:
- user                    // User authentication & profiles
- session                 // Auth sessions  
- account                 // OAuth accounts
- verification            // Email verification
- chat                    // Chat conversations
- message                 // Chat messages with AI
- stream                  // Streaming responses
- subscription            // Payment subscriptions
- payment                 // Payment records
- extremeSearchUsage      // REMOVE - not needed for Atlas
- messageUsage            // Usage tracking
- customInstructions      // User AI preferences
- lookout                 // Scheduled searches
```

### Tables to Remove/Modify
- **`extremeSearchUsage`** - Remove entirely (extreme search functionality removed)
- **`lookout`** - Keep but modify for healthcare-specific scheduled monitoring
- **`subscription/payment`** - May need modification for Famasi billing integration

## Famasi Database Integration Requirements

### Required Famasi API Endpoints
```typescript
// Medication Management
GET  /api/medications/search?query={query}&condition={condition}
GET  /api/medications/{id}/details
GET  /api/medications/{id}/interactions
POST /api/medications/{id}/availability

// Pharmacy Services  
GET  /api/pharmacies/search?location={lat,lng}&radius={km}
GET  /api/pharmacies/{id}/inventory?medication={medicationId}
POST /api/pharmacies/{id}/reserve

// User Health Records (if applicable)
GET  /api/users/{userId}/prescriptions
GET  /api/users/{userId}/medication-history
POST /api/users/{userId}/health-records

// Provider Integration
GET  /api/providers/search?location={location}&specialty={specialty}
POST /api/prescriptions/validate
```

### New Atlas-Specific Tables Needed

#### Healthcare-Specific Tables
```sql
-- User health profiles
CREATE TABLE user_health_profile (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user(id),
  date_of_birth DATE,
  allergies JSONB,
  chronic_conditions JSONB,
  emergency_contact JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Medication tracking
CREATE TABLE user_medications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user(id),
  medication_id TEXT NOT NULL, -- Famasi medication ID
  dosage TEXT,
  frequency TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'active', -- active, paused, completed
  prescriber_info JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Pharmacy preferences
CREATE TABLE user_pharmacy_preferences (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user(id),
  preferred_pharmacy_id TEXT, -- Famasi pharmacy ID
  delivery_address JSONB,
  insurance_info JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Health conversations (enhanced chat)
CREATE TABLE health_conversations (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL REFERENCES chat(id),
  health_topic TEXT, -- medications, symptoms, conditions, etc.
  risk_level TEXT DEFAULT 'low', -- low, medium, high
  requires_followup BOOLEAN DEFAULT FALSE,
  provider_referral_needed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Integration Architecture

### API Layer Structure
```
Atlas Frontend
    ↓
Atlas API Routes (/api/*)
    ↓
┌─────────────────┬─────────────────┐
│   Atlas DB      │   Famasi APIs   │
│   (User/Chat)   │   (Healthcare)  │
└─────────────────┴─────────────────┘
```

### Environment Variables Needed
```bash
# Famasi API Integration
FAMASI_API_BASE_URL=https://api.famasi.africa
FAMASI_API_KEY=your_famasi_api_key
FAMASI_CLIENT_ID=your_famasi_client_id
FAMASI_CLIENT_SECRET=your_famasi_client_secret

# Atlas Database (keep existing)
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# Healthcare Compliance
HEALTHCARE_ENCRYPTION_KEY=your_encryption_key
HIPAA_COMPLIANCE_MODE=true
```

## File Modifications Required

### 1. Database Schema Updates
**File:** `lib/db/schema.ts`
- Remove `extremeSearchUsage` table
- Add healthcare-specific tables
- Modify `lookout` table for health monitoring

### 2. API Integration Layer
**New File:** `lib/famasi-api.ts`
```typescript
// Famasi API client
export class FamasiApiClient {
  async searchMedications(query: string, filters?: MedicationFilters)
  async getPharmacies(location: Location, radius?: number)
  async checkMedicationAvailability(medicationId: string, pharmacyId: string)
  // ... other methods
}
```

### 3. Tool Updates
**Files:** `lib/tools/medication-search.ts`, `lib/tools/pharmacy-locator.ts`
- Replace mock data with Famasi API calls
- Add error handling for API failures
- Implement caching for performance

### 4. Database Queries
**New File:** `lib/db/healthcare-queries.ts`
```typescript
// Healthcare-specific database operations
export async function getUserHealthProfile(userId: string)
export async function saveUserMedication(userId: string, medication: Medication)
export async function getUserPharmacyPreferences(userId: string)
```

## Migration Strategy

### Phase 1: Database Schema
1. Create new healthcare tables
2. Remove `extremeSearchUsage` table
3. Update existing tables as needed

### Phase 2: API Integration
1. Implement Famasi API client
2. Update medication/pharmacy tools
3. Add error handling and fallbacks

### Phase 3: Data Flow
1. Connect user actions to Famasi APIs
2. Store relevant data in Atlas DB
3. Implement caching strategy

## Security & Compliance

### Data Protection
- Encrypt sensitive health data at rest
- Use HTTPS for all API communications
- Implement proper access controls
- Log all health data access

### Healthcare Compliance
- Add comprehensive medical disclaimers
- Implement data retention policies
- Ensure audit trails for health data
- Consider HIPAA compliance requirements

## Performance Considerations

### Caching Strategy
- Cache medication search results (15 minutes)
- Cache pharmacy locations (1 hour)
- Cache user preferences (until changed)

### Error Handling
- Graceful degradation when Famasi APIs are down
- Fallback to cached data when possible
- Clear error messages for users
- Retry logic for transient failures

## Next Steps

1. **Database Migration**: Create and run migration scripts
2. **API Client**: Implement Famasi API integration
3. **Tool Updates**: Replace mock data with real API calls
4. **Testing**: Comprehensive testing with Famasi APIs
5. **Monitoring**: Add logging and monitoring for health data

## Questions for Famasi Team

1. **API Documentation**: Complete API documentation and authentication flow
2. **Rate Limits**: API rate limits and usage quotas
3. **Data Sync**: How often should we sync medication/pharmacy data?
4. **Error Codes**: Standard error codes and handling procedures
5. **Webhooks**: Available webhooks for real-time updates
6. **Compliance**: Specific compliance requirements for African markets
