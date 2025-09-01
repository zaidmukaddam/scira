import { config } from 'dotenv';
import { serverEnv } from '@/env/server';
import { Polar } from '@polar-sh/sdk';
import DodoPayments from 'dodopayments';
import { invalidateUserCaches } from './performance-cache';

config({
  path: '.env.local',
});

// Utility function to safely parse dates
function safeParseDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  return new Date(value);
}

// Mock clients for demo mode when environment variables are missing
const createMockPolarClient = () => ({
  customers: {
    list: () => Promise.resolve({ result: { items: [] } })
  }
});

const createMockDodoPayments = () => ({
  // Mock methods as needed
});

let polarClient: any;
let dodoPayments: any;

try {
  if (process.env.POLAR_ACCESS_TOKEN) {
    polarClient = new Polar({
      accessToken: process.env.POLAR_ACCESS_TOKEN,
      ...(process.env.NODE_ENV === 'production' ? {} : { server: 'sandbox' }),
    });
  } else {
    console.warn('POLAR_ACCESS_TOKEN not found, using mock client for demo');
    polarClient = createMockPolarClient();
  }
} catch (error) {
  console.warn('Failed to initialize Polar client, using mock for demo');
  polarClient = createMockPolarClient();
}

try {
  if (process.env.DODO_PAYMENTS_API_KEY) {
    dodoPayments = new DodoPayments({
      bearerToken: process.env.DODO_PAYMENTS_API_KEY,
      ...(process.env.NODE_ENV === 'production' ? { environment: 'live_mode' } : { environment: 'test_mode' }),
    });
  } else {
    console.warn('DODO_PAYMENTS_API_KEY not found, using mock client for demo');
    dodoPayments = createMockDodoPayments();
  }
} catch (error) {
  console.warn('Failed to initialize DodoPayments client, using mock for demo');
  dodoPayments = createMockDodoPayments();
}

export { dodoPayments };

// Famasi API integration for authentication
export const famasiAuth = {
  baseURL: process.env.NEXT_PUBLIC_FAMASI_API_URL || 'https://api.famasi.me',
  apiKey: process.env.NEXT_PUBLIC_FAMASI_API_KEY || '',
  
  async validateToken(token: string) {
    try {
      const response = await fetch(`${this.baseURL}/auth/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ token }),
      });
      
      if (!response.ok) {
        return null;
      }
      
      return await response.json();
    } catch (error) {
      console.error('Token validation failed:', error);
      return null;
    }
  },
  
  async getUserProfile(token: string) {
    try {
      const response = await fetch(`${this.baseURL}/user/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-API-Key': this.apiKey,
        },
      });
      
      if (!response.ok) {
        return null;
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      return null;
    }
  }
};

// Legacy export for compatibility - can be removed once all references are updated
export const auth = famasiAuth;
