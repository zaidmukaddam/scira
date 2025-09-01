# Atlas - Healthcare Platform with Remi AI

![Atlas Healthcare Platform](/app/opengraph-image.png)

Atlas is a comprehensive healthcare platform powered by Remi AI, designed to help users find medications, manage prescriptions, and connect with pharmacies across Africa. Built by Famasi Africa to revolutionize healthcare accessibility.

🔗 **[Try Atlas at remi.famasi.africa](https://remi.famasi.africa)**

## Powered By

<div align="center">

|          [Vercel AI SDK](https://sdk.vercel.ai/docs)          |                [Exa AI](https://exa.ai)                |
| :-----------------------------------------------------------: | :----------------------------------------------------: |
| <img src="/public/one.svg" alt="Vercel AI SDK" height="40" /> | <img src="/public/exa.png" alt="Exa AI" height="40" /> |
|            For AI model integration and streaming             |          For web search and content retrieval          |

</div>

## Special Thanks

<div align="center" markdown="1">

[![Warp](https://github.com/user-attachments/assets/2bda420d-4211-4900-a37e-e3c7056d799c)](https://www.warp.dev/?utm_source=github&utm_medium=referral&utm_campaign=scira)<br>

### **[Warp, the intelligent terminal](https://www.warp.dev/?utm_source=github&utm_medium=referral&utm_campaign=scira)**<br>

[Available for MacOS, Linux, & Windows](https://www.warp.dev/?utm_source=github&utm_medium=referral&utm_campaign=scira)<br>
[Visit warp.dev to learn more](https://www.warp.dev/?utm_source=github&utm_medium=referral&utm_campaign=scira)

</div>

## Features

### Healthcare & Medication Management

- **Medication Search**: Find medications, dosages, and pricing information across Africa
- **Pharmacy Locator**: Discover nearby pharmacies with real-time inventory and availability
- **Drug Interaction Checker**: Check for potential interactions between medications
- **Alternative Medications**: Find cheaper or equivalent medication alternatives
- **Prescription Management**: Track and manage your prescriptions and refills
- **Health Condition Information**: Get reliable information about medical conditions and symptoms

### AI-Powered Health Assistant

- **Remi AI**: Conversational AI assistant specialized in healthcare queries and medication guidance
- **Medical Disclaimers**: Built-in safety features with proper medical disclaimers
- **Healthcare-Focused Responses**: AI trained to provide responsible healthcare information
- **Symptom Assessment**: Basic symptom checking with provider referral recommendations

### Pharmacy & Provider Network

- **Pharmacy Network**: Connect with Famasi Africa's verified pharmacy network
- **Provider Directory**: Find healthcare providers and specialists in your area
- **Medication Delivery**: Integration with Famasi's doorstep delivery service
- **Insurance Integration**: Support for insurance and payment processing

### User Health Profiles

- **Personal Health Records**: Secure storage of medication history and health information
- **Allergy Tracking**: Track and manage medication allergies and adverse reactions
- **Medication Reminders**: Automated reminders for medication refills and dosing
- **Health Monitoring**: Track health metrics and medication adherence

## LLM Models Supported

- **xAI**: Grok 3, Grok 3 Mini, Grok 2 Vision
- **Google**: Gemini 2.5 Flash (Preview), Gemini 2.5 Pro (Preview)
- **Anthropic**: Claude 4 Sonnet
- **OpenAI**: GPT-4o, o4-mini, o3 (with reasoning capabilities)
- **Groq**: Qwen QwQ 32B, Qwen 3 32B, Meta's Llama 4 Maverick

## Built with

- [Next.js](https://nextjs.org/) - React framework for the web application
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Vercel AI SDK](https://sdk.vercel.ai/docs) - AI model integration and streaming
- [Shadcn/UI](https://ui.shadcn.com/) - Modern UI component library
- [Iconsax](https://iconsax.io/) - Comprehensive icon library
- [Famasi API](https://famasi.me) - Healthcare data, authentication, and pharmacy network integration

## Environment Variables

Atlas requires several environment variables for full functionality:

```bash
# AI Model APIs
XAI_API_KEY=your_xai_api_key
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
GROQ_API_KEY=your_groq_api_key
GOOGLE_GENERATIVE_AI_API_KEY=your_google_api_key

# Famasi Integration
FAMASI_API_BASE_URL=https://api.famasi.africa
FAMASI_API_KEY=your_famasi_api_key
```

## Local Development

### Prerequisites

1. Sign up for accounts with the required AI providers:
   - OpenAI (required)
   - Anthropic (required)
   - xAI (required)
   - Google AI (required)
   - Groq (required)

2. Get Famasi API credentials from the backend team

### Setup

1. Clone the repository
2. Copy `.env.example` to `.env.local` and fill in your API keys
3. Install dependencies:
   ```bash
   pnpm install
   ```
4. Start the development server:
   ```bash
   pnpm dev
   ```
5. Open `http://localhost:3000` in your browser

### Authentication

Atlas uses Famasi's authentication system with:
- **Password-based login** - Traditional email/password authentication
- **OTP verification** - One-time password via SMS or email
- All authentication is handled through Famasi API endpoints

# License

This project is licensed under the AGPLv3 License - see the [LICENSE](LICENSE) file for details.
