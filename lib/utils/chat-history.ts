import {
  isToday,
  isYesterday,
  isThisWeek,
  isThisMonth,
  subWeeks,
  differenceInSeconds,
  differenceInMinutes,
  differenceInHours,
  differenceInDays,
  differenceInWeeks,
  differenceInMonths,
  differenceInYears,
} from 'date-fns';

// Types
export interface Chat {
  id: string;
  title: string;
  createdAt: Date;
  userId: string;
  visibility: 'public' | 'private';
}

export type SearchMode = 'all' | 'title' | 'date' | 'visibility';

export interface CategorizedChats {
  today: Chat[];
  yesterday: Chat[];
  thisWeek: Chat[];
  lastWeek: Chat[];
  thisMonth: Chat[];
  older: Chat[];
}

// Constants
export const SCROLL_THRESHOLD = 0.8;
export const INTERSECTION_ROOT_MARGIN = '100px';
export const FOCUS_DELAY = 100;

export const DATE_CATEGORIES = [
  { key: 'today', heading: 'Today' },
  { key: 'yesterday', heading: 'Yesterday' },
  { key: 'thisWeek', heading: 'This Week' },
  { key: 'lastWeek', heading: 'Last Week' },
  { key: 'thisMonth', heading: 'This Month' },
  { key: 'older', heading: 'Older' },
] as const;

export const SEARCH_MODES: SearchMode[] = ['all', 'title', 'date', 'visibility'];

// Helper function to validate chat ID format
export function isValidChatId(id: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(id) && id.length > 0;
}

// Helper function to categorize chats by date
export function categorizeChatsByDate(chats: Chat[]): CategorizedChats {
  const today: Chat[] = [];
  const yesterday: Chat[] = [];
  const thisWeek: Chat[] = [];
  const lastWeek: Chat[] = [];
  const thisMonth: Chat[] = [];
  const older: Chat[] = [];

  const oneWeekAgo = subWeeks(new Date(), 1);

  chats.forEach((chat) => {
    const chatDate = new Date(chat.createdAt);

    if (isToday(chatDate)) {
      today.push(chat);
    } else if (isYesterday(chatDate)) {
      yesterday.push(chat);
    } else if (isThisWeek(chatDate)) {
      thisWeek.push(chat);
    } else if (chatDate >= oneWeekAgo && !isThisWeek(chatDate)) {
      lastWeek.push(chat);
    } else if (isThisMonth(chatDate)) {
      thisMonth.push(chat);
    } else {
      older.push(chat);
    }
  });

  return { today, yesterday, thisWeek, lastWeek, thisMonth, older };
}

// Format time in a compact way with memoization
const formatCache = new Map<string, { result: string; timestamp: number }>();
const CACHE_DURATION = 30000; // 30 seconds cache duration

export function formatCompactTime(date: Date): string {
  const now = new Date();
  const dateKey = date.getTime().toString();
  const cached = formatCache.get(dateKey);

  // Check if cache is valid (less than 30 seconds old)
  if (cached && now.getTime() - cached.timestamp < CACHE_DURATION) {
    return cached.result;
  }

  const seconds = differenceInSeconds(now, date);

  let result: string;
  if (seconds < 60) {
    result = `${seconds}s ago`;
  } else {
    const minutes = differenceInMinutes(now, date);
    if (minutes < 60) {
      result = `${minutes}m ago`;
    } else {
      const hours = differenceInHours(now, date);
      if (hours < 24) {
        result = `${hours}h ago`;
      } else {
        const days = differenceInDays(now, date);
        if (days < 7) {
          result = `${days}d ago`;
        } else {
          const weeks = differenceInWeeks(now, date);
          if (weeks < 4) {
            result = `${weeks}w ago`;
          } else {
            const months = differenceInMonths(now, date);
            if (months < 12) {
              result = `${months}mo ago`;
            } else {
              const years = differenceInYears(now, date);
              result = `${years}y ago`;
            }
          }
        }
      }
    }
  }

  // Keep cache size reasonable
  if (formatCache.size > 1000) {
    formatCache.clear();
  }

  formatCache.set(dateKey, { result, timestamp: now.getTime() });
  return result;
}

// Custom fuzzy search function
export function fuzzySearch(query: string, text: string): boolean {
  if (!query) return true;

  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();

  // Exact match gets highest priority
  if (textLower.includes(queryLower)) return true;

  // Fuzzy matching - check if all characters in query appear in order
  let queryIndex = 0;
  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      queryIndex++;
    }
  }

  return queryIndex === queryLower.length;
}

// Function to parse DD/MM/YY date format
export function parseDateQuery(dateStr: string): Date | null {
  // Check if the string matches DD/MM/YY format
  const dateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/;
  const match = dateStr.match(dateRegex);

  if (!match) return null;

  const [, dayStr, monthStr, yearStr] = match;
  const day = parseInt(dayStr, 10);
  const month = parseInt(monthStr, 10) - 1; // Month is 0-indexed in Date
  const year = 2000 + parseInt(yearStr, 10); // Convert YY to YYYY (assuming 20XX)

  // Validate the date components
  if (day < 1 || day > 31 || month < 0 || month > 11) {
    return null;
  }

  const date = new Date(year, month, day);

  // Check if the date is valid (handles cases like 31/02/25)
  if (date.getDate() !== day || date.getMonth() !== month || date.getFullYear() !== year) {
    return null;
  }

  return date;
}

// Function to check if two dates are on the same day
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
  );
}

// Advanced search function with multiple criteria
export function advancedSearch(chat: Chat, query: string, mode: SearchMode): boolean {
  if (!query) return true;

  // Handle special search prefixes
  if (query.startsWith('public:')) {
    return chat.visibility === 'public' && fuzzySearch(query.slice(7), chat.title);
  }

  if (query.startsWith('private:')) {
    return chat.visibility === 'private' && fuzzySearch(query.slice(8), chat.title);
  }

  if (query.startsWith('today:')) {
    return isToday(new Date(chat.createdAt)) && fuzzySearch(query.slice(6), chat.title);
  }

  if (query.startsWith('week:')) {
    return isThisWeek(new Date(chat.createdAt)) && fuzzySearch(query.slice(5), chat.title);
  }

  if (query.startsWith('month:')) {
    return isThisMonth(new Date(chat.createdAt)) && fuzzySearch(query.slice(6), chat.title);
  }

  // Handle date: prefix with DD/MM/YY format
  if (query.startsWith('date:')) {
    const dateQuery = query.slice(5).trim();
    const parsedDate = parseDateQuery(dateQuery);
    if (parsedDate) {
      return isSameDay(new Date(chat.createdAt), parsedDate);
    }
    // If not a valid DD/MM/YY format, fall back to fuzzy search on the date query
    return fuzzySearch(dateQuery, new Date(chat.createdAt).toLocaleDateString());
  }

  // Regular search based on mode
  switch (mode) {
    case 'title':
      return fuzzySearch(query, chat.title);
    case 'date': {
      // In date mode, first try to parse as DD/MM/YY format
      const parsedDate = parseDateQuery(query.trim());
      if (parsedDate) {
        return isSameDay(new Date(chat.createdAt), parsedDate);
      }
      // If not DD/MM/YY format, fall back to fuzzy search on date string
      const dateStr = new Date(chat.createdAt).toLocaleDateString();
      return fuzzySearch(query, dateStr);
    }
    case 'visibility':
      return fuzzySearch(query, chat.visibility);
    case 'all':
    default:
      return (
        fuzzySearch(query, chat.title) ||
        fuzzySearch(query, chat.visibility) ||
        fuzzySearch(query, new Date(chat.createdAt).toLocaleDateString())
      );
  }
}

// Get search mode info
export function getSearchModeInfo(mode: SearchMode) {
  switch (mode) {
    case 'title':
      return { label: 'Title' };
    case 'date':
      return { label: 'Date' };
    case 'visibility':
      return { label: 'Visibility' };
    case 'all':
    default:
      return { label: 'All' };
  }
}

// Get next search mode in cycle
export function getNextSearchMode(currentMode: SearchMode): SearchMode {
  const currentIndex = SEARCH_MODES.indexOf(currentMode);
  return SEARCH_MODES[(currentIndex + 1) % SEARCH_MODES.length];
}
