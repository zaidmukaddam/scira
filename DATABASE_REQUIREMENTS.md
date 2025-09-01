# Atlas Integration Plan

## Overview
Atlas (Remi AI) integrates with Famasi Africa's existing APIs for healthcare data, authentication, and pharmacy network. This document outlines the integration points and frontend requirements.

## Frontend-Only Architecture

Atlas operates as a frontend-only application that integrates with Famasi's backend services. No local database or authentication system is needed.

## Famasi API Integration

### Required Famasi API Endpoints
```typescript
// Authentication
POST /api/auth/login              // Password-based login
POST /api/auth/otp/request        // Request OTP
POST /api/auth/otp/verify         // Verify OTP
POST /api/auth/logout             // User logout

// Medication Management
GET  /api/medications/search?query={query}&condition={condition}
GET  /api/medications/{id}/details
GET  /api/medications/{id}/interactions
POST /api/medications/{id}/availability

// Pharmacy Services  
GET  /api/pharmacies/search?location={lat,lng}&radius={km}
GET  /api/pharmacies/{id}/inventory?medication={medicationId}
POST /api/pharmacies/{id}/reserve

// User Health Records
GET  /api/users/{userId}/prescriptions
GET  /api/users/{userId}/medication-history
POST /api/users/{userId}/health-records

// Provider Integration
GET  /api/providers/search?location={location}&specialty={specialty}
POST /api/prescriptions/validate
```

## Integration Architecture

### Frontend-Only Structure
```
Atlas Frontend (Next.js)
    ↓
Famasi API Calls
    ↓
Famasi Backend Services
```

## File Modifications Required

### 1. API Integration Layer
**New File:** `lib/famasi-api.ts`
```typescript
// Famasi API client
export class FamasiApiClient {
  async login(email: string, password: string)
  async requestOTP(phoneNumber: string)
  async verifyOTP(phoneNumber: string, code: string)
  async searchMedications(query: string, filters?: MedicationFilters)
  async getPharmacies(location: Location, radius?: number)
  async checkMedicationAvailability(medicationId: string, pharmacyId: string)
  // ... other methods
}
```

### 2. Tool Updates
**Files:** `lib/tools/medication-search.ts`, `lib/tools/pharmacy-locator.ts`
- Replace mock data with Famasi API calls
- Add error handling for API failures
- Implement client-side caching for performance

### 3. Authentication Components
**Files:** `components/auth/login.tsx`, `components/auth/otp-verify.tsx`
- Password-based login form
- OTP request and verification
- Session management via localStorage/cookies

## Performance Considerations

### Caching Strategy
- Cache medication search results (15 minutes) in localStorage
- Cache pharmacy locations (1 hour) in localStorage
- Cache user session data until logout

### Error Handling
- Graceful degradation when Famasi APIs are down
- Clear error messages for users
- Retry logic for transient failures
- Offline mode indicators

## Next Steps

1. **API Client**: Implement Famasi API integration
2. **Authentication**: Build login/OTP components
3. **Tool Updates**: Replace mock data with real API calls
4. **Testing**: Comprehensive testing with Famasi APIs
5. **Error Handling**: Implement robust error handling
