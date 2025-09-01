# Remi - Famasi AI Agent Transformation Workplan

## Project Overview
Transform the existing Scira AI search engine into **Remi**, Famasi Africa's AI agent for medication management, ordering, and healthcare workflows.

**Timeline**: 4 hours (hackathon scope)  
**Primary LLM**: Google Gemini  
**Fallback LLM**: Llama via Groq  
**Voice**: OpenAI Whisper  

## Phase 1: Frontend/UI Transformation (90 minutes)

### 1.1 Branding & Visual Identity (30 mins)
- [ ] Replace Scira logo with Famasi branding
- [ ] Update color scheme to Famasi brand colors
- [ ] Change app name from "scira" to "remi" throughout codebase
- [ ] Update favicon and app icons
- [ ] Modify landing page hero section for healthcare context

**Files to modify:**
- `components/logos/scira-logo.tsx` → Create `famasi-logo.tsx`
- `app/layout.tsx` - Update metadata and titles
- `components/chat-interface.tsx` - Update branding text
- `public/` - Replace logo assets
- `tailwind.config.js` - Update brand colors

### 1.2 Healthcare-Focused UI Updates (45 mins)
- [ ] Update welcome message to healthcare context
- [ ] Modify search groups for medication workflows
- [ ] Add medication-specific quick actions
- [ ] Update placeholder text for health queries
- [ ] Add health disclaimers and safety notices

**New Search Groups:**
- **Medications**: Find, check interactions, dosage info
- **Pharmacy**: Locate nearby pharmacies, check availability
- **Refills**: Manage prescription refills
- **Health Info**: General health information and education
- **Emergency**: Quick access to emergency health resources

### 1.3 Voice Interface Setup (15 mins)
- [ ] Add voice input button to chat interface
- [ ] Prepare UI for voice recording states
- [ ] Add voice feedback indicators

## Phase 2: Backend Integration & LLM Setup (75 minutes)

### 2.1 LLM Provider Configuration (30 mins)
- [ ] Configure Google Gemini as primary provider
- [ ] Set up Llama via Groq as fallback
- [ ] Update provider selection logic
- [ ] Test model switching functionality

**Files to modify:**
- `ai/providers.ts` - Update provider configurations
- `app/api/search/route.ts` - Modify LLM routing logic
- `.env.example` - Add required API keys

### 2.2 Famasi Backend Connection (45 mins)
- [ ] Create API client for Famasi backend
- [ ] Set up authentication for backend services
- [ ] Create medication search endpoints
- [ ] Implement pharmacy location services
- [ ] Add prescription management APIs

**New files to create:**
- `lib/famasi-api.ts` - Famasi backend client
- `lib/tools/medication-search.ts` - Medication finding tool
- `lib/tools/pharmacy-locator.ts` - Pharmacy location tool
- `lib/tools/prescription-manager.ts` - Prescription management

## Phase 3: Medication-Specific Tools (60 minutes)

### 3.1 Core Medication Tools (40 mins)
- [ ] **Medication Finder**: Search for medications by name/condition
- [ ] **Drug Interaction Checker**: Check for dangerous interactions
- [ ] **Dosage Calculator**: Calculate proper dosages
- [ ] **Pharmacy Locator**: Find nearby pharmacies with stock
- [ ] **Price Comparison**: Compare medication prices across pharmacies

### 3.2 Prescription Management (20 mins)
- [ ] **Refill Reminders**: Set up automated refill notifications
- [ ] **Prescription Tracker**: Track active prescriptions
- [ ] **Order Status**: Check medication order status

**Implementation approach:**
- Extend existing tool architecture in `lib/tools/`
- Use Famasi's existing APIs where available
- Implement fallback to public health databases
- Add proper error handling for medication queries

## Phase 4: Voice Integration (45 minutes)

### 4.1 OpenAI Whisper Setup (25 mins)
- [ ] Install and configure Whisper dependencies
- [ ] Create voice recording component
- [ ] Set up audio processing pipeline
- [ ] Implement speech-to-text conversion

### 4.2 Voice UI Integration (20 mins)
- [ ] Add voice input button to chat interface
- [ ] Implement recording states and feedback
- [ ] Add voice command shortcuts for common actions
- [ ] Test voice input with medication queries

**New components:**
- `components/voice-input.tsx` - Voice recording interface
- `lib/voice-processing.ts` - Audio processing utilities

## Phase 5: Testing & Polish (30 minutes)

### 5.1 Core Functionality Testing (20 mins)
- [ ] Test medication search workflows
- [ ] Verify pharmacy location services
- [ ] Check LLM provider switching
- [ ] Test voice input functionality
- [ ] Validate backend API connections

### 5.2 UI/UX Polish (10 mins)
- [ ] Final branding consistency check
- [ ] Mobile responsiveness verification
- [ ] Error message improvements
- [ ] Loading state optimizations

## Technical Implementation Notes

### Environment Variables Required
```bash
# Existing
GOOGLE_GENERATIVE_AI_API_KEY=
GROQ_API_KEY=
OPENAI_API_KEY= # For Whisper

# New Famasi Backend
FAMASI_API_KEY=
FAMASI_BASE_URL=
FAMASI_AUTH_TOKEN=
```

### Key Dependencies to Add
```json
{
  "@openai/whisper": "^1.0.0",
  "react-speech-kit": "^3.0.1",
  "axios": "^1.10.0" // Already included
}
```

### Medication Search Tool Structure
```typescript
interface MedicationSearchTool {
  searchMedication(query: string): Promise<Medication[]>;
  checkInteractions(medications: string[]): Promise<Interaction[]>;
  findPharmacies(location: string, medication: string): Promise<Pharmacy[]>;
  getRefillInfo(prescriptionId: string): Promise<RefillStatus>;
}
```

## Success Metrics
- [ ] Successfully rebranded from Scira to Remi
- [ ] Functional medication search and pharmacy location
- [ ] Working voice input with Whisper
- [ ] Gemini + Groq LLM integration
- [ ] Basic connection to Famasi backend
- [ ] Responsive healthcare-focused UI

## Deployment Checklist
- [ ] Update environment variables
- [ ] Test all API connections
- [ ] Verify voice permissions in browser
- [ ] Check mobile responsiveness
- [ ] Validate healthcare disclaimers
- [ ] Test offline fallback behavior

---

**Note**: This workplan is optimized for a 4-hour hackathon timeline. Focus on core functionality first, then enhance with additional features if time permits.
