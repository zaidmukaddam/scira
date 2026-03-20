// Search limits for free users
export const SEARCH_LIMITS = {
  DAILY_SEARCH_LIMIT: 3,
  EXTREME_SEARCH_LIMIT: 1,
} as const;

// Agent mode (build server) monthly cap for Max users.
export const AGENT_MODE_MONTHLY_LIMIT = 50;

export const PRICING = {
  PRO_MONTHLY: 15, // USD
  PRO_MONTHLY_INR: 1390, // INR for Indian users
} as const;

export const CURRENCIES = {
  USD: 'USD',
  INR: 'INR',
} as const;

export const SNAPSHOT_NAME = 'scira-analysis:1771010549';
