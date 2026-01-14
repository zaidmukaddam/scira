// Search limits for free users
export const SEARCH_LIMITS = {
  DAILY_SEARCH_LIMIT: 50, // Increased from 10 to 50 for better free user experience
  EXTREME_SEARCH_LIMIT: 15, // Increased from 5 to 15 for better free user experience
} as const;

export const PRICING = {
  PRO_MONTHLY: 15, // USD
  PRO_MONTHLY_INR: 1330, // INR for Indian users
} as const;

export const CURRENCIES = {
  USD: 'USD',
  INR: 'INR',
} as const;

export const SNAPSHOT_NAME = 'hebronai-analysis:1752127473';