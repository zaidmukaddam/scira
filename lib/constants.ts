// Search limits for free users
export const SEARCH_LIMITS = {
  DAILY_SEARCH_LIMIT: 10,
  EXTREME_SEARCH_LIMIT: 5,
} as const;

export const PRICING = {
  PRO_MONTHLY: 15, // USD
  PRO_MONTHLY_INR: 1330, // INR for Indian users
} as const;

export const CURRENCIES = {
  USD: 'USD',
  INR: 'INR',
} as const;

// Daytona snapshot for Python code execution
// Using daytona-medium: 2 vCPU, 4 GiB RAM, 8 GiB disk — suitable for pandas/numpy/matplotlib workloads
export const SNAPSHOT_NAME = 'daytona-medium';
