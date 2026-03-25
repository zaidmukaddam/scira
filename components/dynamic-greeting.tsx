'use client';

import { useState, useEffect, useMemo } from 'react';

// ── Public types ──────────────────────────────────────────────────────────────

export interface GreetingUser {
  name?: string;
  /** When the user last opened the app — drives "welcome back" flavour */
  lastSeenAt?: Date;
}

export interface GreetingResult {
  text: string;
  emoji: string;
}

export interface GetGreetingOptions {
  /** Inject a specific date — useful for unit tests */
  now?: Date;
  /** Override the pool rotation index instead of reading localStorage */
  indexOverride?: number;
}

export interface DynamicGreetingProps {
  user?: GreetingUser;
  /** Show the emoji prefix — default true */
  showEmoji?: boolean;
  /** Type the text in character by character on mount — default true */
  animated?: boolean;
  className?: string;
}

// ── Internal types ────────────────────────────────────────────────────────────

type Templ = string | ((name: string) => string);

interface Entry {
  text: Templ;
  emoji: string;
}

type TimeSlot = 'latenight' | 'morning' | 'afternoon' | 'evening';
type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'weekend';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getFirstName(user?: GreetingUser): string | undefined {
  return user?.name?.trim().split(/\s+/)[0] || undefined;
}

function resolve(entry: Entry, name?: string): GreetingResult {
  return {
    text: typeof entry.text === 'function' ? entry.text(name ?? 'there') : entry.text,
    emoji: entry.emoji,
  };
}

/**
 * Advance the rotation index for a given pool key using localStorage,
 * so each visit shows the next variant in the pool.
 */
function pickEntry(
  pool: Entry[],
  storageKey: string,
  indexOverride?: number,
): Entry {
  let index: number;
  if (typeof indexOverride === 'number') {
    index = indexOverride % pool.length;
  } else {
    try {
      const raw = localStorage.getItem(`scx-greeting:${storageKey}`);
      const last = raw !== null ? parseInt(raw, 10) : -1;
      index = (last + 1) % pool.length;
      localStorage.setItem(`scx-greeting:${storageKey}`, String(index));
    } catch {
      index = 0;
    }
  }
  return pool[index];
}

// ── Greeting pools ────────────────────────────────────────────────────────────

const WELCOME_BACK: Entry[] = [
  { text: (n) => `Welcome back, ${n}`, emoji: '' },
  { text: (n) => `Good to see you again, ${n}`, emoji: '' },
  { text: (n) => `Hey, you're back, ${n}`, emoji: '' },
  { text: (n) => `Great to have you back, ${n}`, emoji: '' },
  { text: (n) => `Look who's back — ${n}`, emoji: '' },
  { text: (n) => `We kept your seat warm, ${n}`, emoji: '' },
  { text: 'Good to have you back', emoji: '' },
];

/** Notable dates — key is zero-padded `MM-DD` */
const HOLIDAYS: Record<string, Entry[]> = {
  '01-01': [
    { text: (n) => `Happy New Year, ${n}`, emoji: '' },
    { text: (n) => `First day of the year, ${n}`, emoji: '' },
    { text: (n) => `Welcome to the new year, ${n}`, emoji: '' },
    { text: (n) => `Year one starts today, ${n}`, emoji: '' },
    { text: (n) => `Fresh year, ${n}`, emoji: '' },
    { text: 'Happy New Year', emoji: '' },
    { text: 'First day of the year', emoji: '' },
  ],
  '12-31': [
    { text: (n) => `Last day of the year, ${n}`, emoji: '' },
    { text: (n) => `New Year's Eve, ${n}`, emoji: '' },
    { text: (n) => `Final day, well spent, ${n}`, emoji: '' },
    { text: (n) => `Almost a new year, ${n}`, emoji: '' },
    { text: 'Last day of the year', emoji: '' },
    { text: "New Year's Eve", emoji: '' },
  ],
  '12-25': [
    { text: (n) => `Merry Christmas, ${n}`, emoji: '' },
    { text: (n) => `Happy Christmas, ${n}`, emoji: '' },
    { text: (n) => `Hope it's a wonderful one, ${n}`, emoji: '' },
    { text: 'Merry Christmas', emoji: '' },
    { text: 'Happy Christmas', emoji: '' },
  ],
  '12-24': [
    { text: (n) => `Happy Christmas Eve, ${n}`, emoji: '' },
    { text: (n) => `Almost Christmas, ${n}`, emoji: '' },
    { text: (n) => `Christmas Eve is here, ${n}`, emoji: '' },
    { text: 'Happy Christmas Eve', emoji: '' },
  ],
  '10-31': [
    { text: (n) => `Happy Halloween, ${n}`, emoji: '' },
    { text: (n) => `Spooky Halloween, ${n}`, emoji: '' },
    { text: (n) => `Halloween greetings, ${n}`, emoji: '' },
    { text: 'Happy Halloween', emoji: '' },
  ],
  '02-14': [
    { text: (n) => `Happy Valentine's Day, ${n}`, emoji: '' },
    { text: (n) => `Happy Valentine's, ${n}`, emoji: '' },
    { text: "Happy Valentine's Day", emoji: '' },
    { text: "Happy Valentine's", emoji: '' },
  ],
  '01-26': [
    // Australia Day
    { text: (n) => `Happy Australia Day, ${n}`, emoji: '' },
    { text: (n) => `Happy Australia Day`, emoji: '' },
    { text: 'Happy Australia Day', emoji: '' },
  ],
  '04-25': [
    // Anzac Day
    { text: (n) => `Lest we forget, ${n}`, emoji: '' },
    { text: 'Lest we forget', emoji: '' },
  ],
};

/** All day-time pools. Falls back to generic time slot if specific key missing. */
const POOLS: Record<string, Entry[]> = {
  // ── Late night (midnight–5 am) ─────────────────────────────────────────
  latenight: [
    { text: (n) => `Up with the stars, ${n}`, emoji: '' },
    { text: (n) => `The quiet hours, ${n}`, emoji: '' },
    { text: (n) => `Night belongs to you, ${n}`, emoji: '' },
    { text: (n) => `While the world sleeps, ${n}`, emoji: '' },
    { text: (n) => `Late and curious, ${n}`, emoji: '' },
    { text: (n) => `Hello, night thinker, ${n}`, emoji: '' },
    { text: (n) => `Deep in the night, ${n}`, emoji: '' },
    { text: (n) => `The stillness is yours, ${n}`, emoji: '' },
    { text: (n) => `After midnight, ${n}`, emoji: '' },
    { text: 'The quiet hours', emoji: '' },
  ],

  // ── Monday ────────────────────────────────────────────────────────────────
  'monday-morning': [
    { text: (n) => `Fresh week, ${n}`, emoji: '' },
    { text: (n) => `A new week begins, ${n}`, emoji: '' },
    { text: (n) => `Monday's looking bright, ${n}`, emoji: '' },
    { text: (n) => `First day energy, ${n}`, emoji: '' },
    { text: (n) => `Welcome to the week, ${n}`, emoji: '' },
    { text: (n) => `Clean slate today, ${n}`, emoji: '' },
    { text: (n) => `Monday morning, ${n}`, emoji: '' },
    { text: (n) => `Rise and shine, ${n}`, emoji: '' },
    { text: 'Fresh week ahead', emoji: '' },
  ],
  'monday-afternoon': [
    { text: (n) => `Settling into the week, ${n}`, emoji: '' },
    { text: (n) => `Monday's in full swing, ${n}`, emoji: '' },
    { text: (n) => `The week is warming up, ${n}`, emoji: '' },
    { text: (n) => `Good to see you, ${n}`, emoji: '' },
    { text: (n) => `Into the week, ${n}`, emoji: '' },
    { text: (n) => `Monday afternoon, ${n}`, emoji: '' },
    { text: 'Week is warming up', emoji: '' },
  ],
  'monday-evening': [
    { text: (n) => `Day one, done, ${n}`, emoji: '' },
    { text: (n) => `You made it through Monday, ${n}`, emoji: '' },
    { text: (n) => `First day behind you, ${n}`, emoji: '' },
    { text: (n) => `Monday, well handled, ${n}`, emoji: '' },
    { text: (n) => `Monday evening, ${n}`, emoji: '' },
    { text: (n) => `Evening already, ${n}`, emoji: '' },
    { text: 'Day one, done', emoji: '' },
  ],

  // ── Tuesday ───────────────────────────────────────────────────────────────
  'tuesday-morning': [
    { text: (n) => `Tuesday's arrived, ${n}`, emoji: '' },
    { text: (n) => `The week finds its rhythm, ${n}`, emoji: '' },
    { text: (n) => `Second day shining, ${n}`, emoji: '' },
    { text: (n) => `Tuesday looks good, ${n}`, emoji: '' },
    { text: (n) => `The week is rolling, ${n}`, emoji: '' },
    { text: (n) => `Two days of possibility, ${n}`, emoji: '' },
    { text: "Tuesday's arrived", emoji: '' },
  ],
  'tuesday-afternoon': [
    { text: (n) => `Tuesday's treating you well, ${n}`, emoji: '' },
    { text: (n) => `Afternoon already, ${n}`, emoji: '' },
    { text: (n) => `Midweek's close, ${n}`, emoji: '' },
    { text: (n) => `Tuesday's finest hours, ${n}`, emoji: '' },
    { text: (n) => `Good Tuesday, ${n}`, emoji: '' },
    { text: (n) => `The week rolls on, ${n}`, emoji: '' },
    { text: "Tuesday's finest", emoji: '' },
  ],
  'tuesday-evening': [
    { text: (n) => `Two days well spent, ${n}`, emoji: '' },
    { text: (n) => `Tuesday winds down, ${n}`, emoji: '' },
    { text: (n) => `Evening on a Tuesday, ${n}`, emoji: '' },
    { text: (n) => `Night comes to Tuesday, ${n}`, emoji: '' },
    { text: (n) => `Two great days in, ${n}`, emoji: '' },
    { text: (n) => `Good Tuesday evening, ${n}`, emoji: '' },
    { text: 'Two days well spent', emoji: '' },
  ],

  // ── Wednesday ─────────────────────────────────────────────────────────────
  'wednesday-morning': [
    { text: (n) => `Halfway through the week, ${n}`, emoji: '' },
    { text: (n) => `Happy hump day, ${n}`, emoji: '' },
    { text: (n) => `The peak of the week, ${n}`, emoji: '' },
    { text: (n) => `Wednesday's a gift, ${n}`, emoji: '' },
    { text: (n) => `The week turns here, ${n}`, emoji: '' },
    { text: (n) => `Midweek morning, ${n}`, emoji: '' },
    { text: 'Halfway through the week', emoji: '' },
  ],
  'wednesday-afternoon': [
    { text: (n) => `Over the midweek hill, ${n}`, emoji: '' },
    { text: (n) => `Wednesday at its best, ${n}`, emoji: '' },
    { text: (n) => `Midweek and thriving, ${n}`, emoji: '' },
    { text: (n) => `Wednesday's finest, ${n}`, emoji: '' },
    { text: (n) => `The best half of the week, ${n}`, emoji: '' },
    { text: (n) => `Halfway and going strong, ${n}`, emoji: '' },
    { text: 'Over the midweek hill', emoji: '' },
  ],
  'wednesday-evening': [
    { text: (n) => `Past the midpoint, ${n}`, emoji: '' },
    { text: (n) => `Wednesday's been good, ${n}`, emoji: '' },
    { text: (n) => `Halfway through and going strong, ${n}`, emoji: '' },
    { text: (n) => `The week turns toward the weekend, ${n}`, emoji: '' },
    { text: (n) => `Wednesday evening, ${n}`, emoji: '' },
    { text: (n) => `Three strong days in, ${n}`, emoji: '' },
    { text: 'Past the midpoint', emoji: '' },
  ],

  // ── Thursday ──────────────────────────────────────────────────────────────
  'thursday-morning': [
    { text: (n) => `Almost there, ${n}`, emoji: '' },
    { text: (n) => `Thursday's looking fine, ${n}`, emoji: '' },
    { text: (n) => `The anticipation builds, ${n}`, emoji: '' },
    { text: (n) => `One day closer, ${n}`, emoji: '' },
    { text: (n) => `Thursday's a good day, ${n}`, emoji: '' },
    { text: (n) => `Nearly at the finish, ${n}`, emoji: '' },
    { text: "Thursday's looking fine", emoji: '' },
    { text: 'Almost there', emoji: '' },
  ],
  'thursday-afternoon': [
    { text: (n) => `Friday's knocking, ${n}`, emoji: '' },
    { text: (n) => `Thursday's prime time, ${n}`, emoji: '' },
    { text: (n) => `The weekend nears, ${n}`, emoji: '' },
    { text: (n) => `Almost at the end, ${n}`, emoji: '' },
    { text: (n) => `Thursday afternoon, ${n}`, emoji: '' },
    { text: (n) => `Nearly there, ${n}`, emoji: '' },
    { text: "Friday's knocking", emoji: '' },
  ],
  'thursday-evening': [
    { text: (n) => `Tomorrow is Friday, ${n}`, emoji: '' },
    { text: (n) => `One sleep from Friday, ${n}`, emoji: '' },
    { text: (n) => `Thursday night, ${n}`, emoji: '' },
    { text: (n) => `The weekend's close, ${n}`, emoji: '' },
    { text: (n) => `Almost Friday, ${n}`, emoji: '' },
    { text: (n) => `Great Thursday, ${n}`, emoji: '' },
    { text: 'Tomorrow is Friday', emoji: '' },
  ],

  // ── Friday ────────────────────────────────────────────────────────────────
  'friday-morning': [
    { text: (n) => `Happy Friday, ${n}`, emoji: '' },
    { text: (n) => `It's finally Friday, ${n}`, emoji: '' },
    { text: (n) => `The best morning of the week, ${n}`, emoji: '' },
    { text: (n) => `Friday is here, ${n}`, emoji: '' },
    { text: (n) => `Friday arrived, ${n}`, emoji: '' },
    { text: (n) => `Great Friday morning, ${n}`, emoji: '' },
    { text: (n) => `Rise and shine, it's Friday, ${n}`, emoji: '' },
    { text: 'Happy Friday', emoji: '' },
    { text: "It's finally Friday", emoji: '' },
  ],
  'friday-afternoon': [
    { text: (n) => `Friday afternoon, ${n}`, emoji: '' },
    { text: (n) => `The weekend's in sight, ${n}`, emoji: '' },
    { text: (n) => `Friday at its finest, ${n}`, emoji: '' },
    { text: (n) => `The home stretch, ${n}`, emoji: '' },
    { text: (n) => `Weekend's knocking, ${n}`, emoji: '' },
    { text: (n) => `Happy Friday, ${n}`, emoji: '' },
    { text: "The weekend's in sight", emoji: '' },
  ],
  'friday-evening': [
    { text: (n) => `The weekend is yours, ${n}`, emoji: '' },
    { text: (n) => `Friday night, finally, ${n}`, emoji: '' },
    { text: (n) => `Happy Friday night, ${n}`, emoji: '' },
    { text: (n) => `The week is done, ${n}`, emoji: '' },
    { text: (n) => `Well-earned Friday, ${n}`, emoji: '' },
    { text: (n) => `Rest, it's Friday, ${n}`, emoji: '' },
    { text: 'The weekend is yours', emoji: '' },
  ],

  // ── Weekend ───────────────────────────────────────────────────────────────
  'weekend-morning': [
    { text: (n) => `No rush this morning, ${n}`, emoji: '' },
    { text: (n) => `Slow morning, ${n}`, emoji: '' },
    { text: (n) => `Weekend mornings are the best, ${n}`, emoji: '' },
    { text: (n) => `The morning is yours, ${n}`, emoji: '' },
    { text: (n) => `Rise and take it easy, ${n}`, emoji: '' },
    { text: (n) => `Lovely weekend morning, ${n}`, emoji: '' },
    { text: (n) => `Unhurried and awake, ${n}`, emoji: '' },
    { text: (n) => `Weekend's all yours, ${n}`, emoji: '' },
    { text: 'No rush this morning', emoji: '' },
  ],
  'weekend-afternoon': [
    { text: (n) => `Nowhere to be, ${n}`, emoji: '' },
    { text: (n) => `The afternoon is yours, ${n}`, emoji: '' },
    { text: (n) => `Easy does it, ${n}`, emoji: '' },
    { text: (n) => `Unscheduled and free, ${n}`, emoji: '' },
    { text: (n) => `Afternoon of your own, ${n}`, emoji: '' },
    { text: (n) => `Take it slow, ${n}`, emoji: '' },
    { text: (n) => `Weekend afternoon, ${n}`, emoji: '' },
    { text: 'Nowhere to be', emoji: '' },
  ],
  'weekend-evening': [
    { text: (n) => `The night is young, ${n}`, emoji: '' },
    { text: (n) => `Wind down well, ${n}`, emoji: '' },
    { text: (n) => `Evening's yours, ${n}`, emoji: '' },
    { text: (n) => `Rest well tonight, ${n}`, emoji: '' },
    { text: (n) => `The quiet weekend night, ${n}`, emoji: '' },
    { text: (n) => `Weekend evening, ${n}`, emoji: '' },
    { text: 'The night is young', emoji: '' },
  ],

  // ── Generic fallbacks ─────────────────────────────────────────────────────
  morning: [
    { text: (n) => `Good morning, ${n}`, emoji: '' },
    { text: (n) => `Morning's here, ${n}`, emoji: '' },
    { text: (n) => `Rise and shine, ${n}`, emoji: '' },
    { text: (n) => `A fine morning, ${n}`, emoji: '' },
    { text: 'Good morning', emoji: '' },
    { text: 'The day begins', emoji: '' },
  ],
  afternoon: [
    { text: (n) => `Good afternoon, ${n}`, emoji: '' },
    { text: (n) => `Afternoon's here, ${n}`, emoji: '' },
    { text: (n) => `The day rolls on, ${n}`, emoji: '' },
    { text: (n) => `Afternoon is here, ${n}`, emoji: '' },
    { text: 'Good afternoon', emoji: '' },
    { text: 'Afternoon', emoji: '' },
  ],
  evening: [
    { text: (n) => `Good evening, ${n}`, emoji: '' },
    { text: (n) => `Evening's come, ${n}`, emoji: '' },
    { text: (n) => `The day winds down, ${n}`, emoji: '' },
    { text: (n) => `Night is near, ${n}`, emoji: '' },
    { text: 'Good evening', emoji: '' },
    { text: 'The day winds down', emoji: '' },
  ],
};

// ── Core greeting logic ───────────────────────────────────────────────────────

/**
 * Pure greeting selector — deterministic given the same `now` and `indexOverride`.
 * Safe to call server-side (no localStorage access when `indexOverride` is set).
 */
export function getGreeting(
  user?: GreetingUser,
  options?: GetGreetingOptions,
): GreetingResult {
  const now = options?.now ?? new Date();
  const name = getFirstName(user);

  const month = now.getMonth() + 1; // 1-indexed
  const day = now.getDate();
  const dow = now.getDay(); // 0 = Sun
  const hour = now.getHours();

  // 1. Notable / holiday dates
  const dateKey = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const holidayPool = HOLIDAYS[dateKey];
  if (holidayPool) {
    const entry = pickEntry(holidayPool, `holiday:${dateKey}`, options?.indexOverride);
    return resolve(entry, name);
  }

  // 2. Welcome back (≥ 3 days away)
  if (user?.lastSeenAt) {
    const daysDiff = (now.getTime() - user.lastSeenAt.getTime()) / 86_400_000;
    if (daysDiff >= 3) {
      const entry = pickEntry(WELCOME_BACK, 'welcomeback', options?.indexOverride);
      return resolve(entry, name);
    }
  }

  // 3. Late night overrides everything else
  const timeSlot: TimeSlot =
    hour < 5 ? 'latenight' : hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';

  if (timeSlot === 'latenight') {
    const entry = pickEntry(POOLS['latenight'], 'latenight', options?.indexOverride);
    return resolve(entry, name);
  }

  // 4. Day + time
  const dayKey: DayKey =
    dow === 1 ? 'monday'
    : dow === 2 ? 'tuesday'
    : dow === 3 ? 'wednesday'
    : dow === 4 ? 'thursday'
    : dow === 5 ? 'friday'
    : 'weekend';

  const poolKey = `${dayKey}-${timeSlot}`;
  const pool = POOLS[poolKey] ?? POOLS[timeSlot];
  const entry = pickEntry(pool, poolKey, options?.indexOverride);
  return resolve(entry, name);
}

// ── Component ─────────────────────────────────────────────────────────────────

const TYPING_SPEED_MS = 22; // ms per character — snappy but readable

export function DynamicGreeting({
  user,
  showEmoji = true,
  animated = true,
  className,
}: DynamicGreetingProps) {
  // Track last-seen in localStorage so the "welcome back" logic works
  // automatically when the caller doesn't supply lastSeenAt.
  const [resolvedUser, setResolvedUser] = useState<GreetingUser | undefined>(user);

  useEffect(() => {
    const LS_KEY = 'scx-last-seen';
    try {
      if (!user?.lastSeenAt) {
        const raw = localStorage.getItem(LS_KEY);
        if (raw) {
          setResolvedUser((prev) => ({ ...prev, lastSeenAt: new Date(raw) }));
        }
      }
      // Always update last-seen to now
      localStorage.setItem(LS_KEY, new Date().toISOString());
    } catch {
      // localStorage unavailable — silently continue
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync name from prop changes (e.g. auth loads after mount)
  useEffect(() => {
    setResolvedUser((prev) => ({ ...prev, ...user }));
  }, [user?.name]); // eslint-disable-line react-hooks/exhaustive-deps

  const greeting = useMemo(() => getGreeting(resolvedUser), [resolvedUser]);

  // ── Typing animation ──────────────────────────────────────────────────────
  const [displayText, setDisplayText] = useState(() =>
    animated ? '' : greeting.text,
  );
  const [showCursor, setShowCursor] = useState(animated);
  const [emojiVisible, setEmojiVisible] = useState(!animated);

  useEffect(() => {
    if (!animated) {
      setDisplayText(greeting.text);
      setShowCursor(false);
      setEmojiVisible(true);
      return;
    }

    // Reset
    setDisplayText('');
    setShowCursor(true);
    setEmojiVisible(false);

    // Emoji fades in slightly ahead of text
    const emojiTimer = setTimeout(() => setEmojiVisible(true), 80);

    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayText(greeting.text.slice(0, i));
      if (i >= greeting.text.length) {
        clearInterval(interval);
        // Blink for a beat, then hide cursor
        setTimeout(() => setShowCursor(false), 700);
      }
    }, TYPING_SPEED_MS);

    return () => {
      clearTimeout(emojiTimer);
      clearInterval(interval);
    };
  }, [greeting.text, animated]);

  return (
    <span className={className}>
      {showEmoji && greeting.emoji && (
        <span
          className="mr-2 inline-block transition-opacity duration-300"
          style={{ opacity: emojiVisible ? 1 : 0 }}
          aria-hidden
        >
          {greeting.emoji}
        </span>
      )}
      {displayText}
      {showCursor && (
        <span
          className="inline-block w-[2px] bg-current ml-[1px] align-middle animate-[blink_0.9s_step-end_infinite]"
          style={{ height: '0.85em', verticalAlign: '-0.05em' }}
          aria-hidden
        />
      )}
    </span>
  );
}
