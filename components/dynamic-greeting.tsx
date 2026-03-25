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
  { text: (n) => `Welcome back, ${n}`, emoji: '👋' },
  { text: (n) => `Good to see you again, ${n}`, emoji: '✨' },
  { text: (n) => `You were missed, ${n}`, emoji: '💫' },
  { text: (n) => `Back at it, ${n}`, emoji: '🔥' },
  { text: (n) => `The return of ${n}`, emoji: '⚡' },
  { text: (n) => `Pick up where you left off, ${n}`, emoji: '📖' },
  { text: 'Good to have you back', emoji: '👋' },
];

/** Notable dates — key is zero-padded `MM-DD` */
const HOLIDAYS: Record<string, Entry[]> = {
  '01-01': [
    { text: (n) => `Year one starts now, ${n}`, emoji: '🥂' },
    { text: (n) => `First chapter, ${n}`, emoji: '✨' },
    { text: (n) => `New year, new thread, ${n}`, emoji: '🎆' },
    { text: (n) => `Reset complete, ${n}`, emoji: '🔄' },
    { text: (n) => `Clean slate, ${n}`, emoji: '📄' },
    { text: 'Year one starts now', emoji: '🥂' },
    { text: 'First chapter of the year', emoji: '✨' },
  ],
  '12-31': [
    { text: (n) => `Last one of the year, ${n}`, emoji: '🥂' },
    { text: (n) => `Ending strong, ${n}`, emoji: '💫' },
    { text: (n) => `Final chapter, ${n}`, emoji: '📖' },
    { text: (n) => `Closing the year right, ${n}`, emoji: '✨' },
    { text: 'Last one of the year', emoji: '🥂' },
    { text: 'Closing the year right', emoji: '✨' },
  ],
  '12-25': [
    { text: (n) => `Merry Christmas, ${n}`, emoji: '🎄' },
    { text: (n) => `Hope it's a good one, ${n}`, emoji: '🎁' },
    { text: (n) => `Festive thinking, ${n}`, emoji: '✨' },
    { text: 'Merry Christmas', emoji: '🎄' },
    { text: 'Festive thinking', emoji: '✨' },
  ],
  '12-24': [
    { text: (n) => `Christmas Eve energy, ${n}`, emoji: '🎄' },
    { text: (n) => `The night before, ${n}`, emoji: '⭐' },
    { text: (n) => `Almost there, ${n}`, emoji: '🌟' },
    { text: 'Christmas Eve energy', emoji: '🎄' },
  ],
  '10-31': [
    { text: (n) => `Spooky hours, ${n}`, emoji: '🎃' },
    { text: (n) => `Halloween focus, ${n}`, emoji: '👻' },
    { text: (n) => `After the candy, the ideas, ${n}`, emoji: '🎃' },
    { text: 'Spooky hours', emoji: '🎃' },
  ],
  '02-14': [
    { text: (n) => `Happy Valentine's, ${n}`, emoji: '💙' },
    { text: (n) => `Love and logic, ${n}`, emoji: '✨' },
    { text: "Happy Valentine's", emoji: '💙' },
    { text: 'Love and logic', emoji: '✨' },
  ],
  '01-26': [
    // Australia Day
    { text: (n) => `Happy Australia Day, ${n}`, emoji: '🦘' },
    { text: (n) => `Aussie innovation, ${n}`, emoji: '🌏' },
    { text: 'Happy Australia Day', emoji: '🦘' },
  ],
  '04-25': [
    // Anzac Day
    { text: (n) => `Lest we forget, ${n}`, emoji: '🌺' },
    { text: 'Lest we forget', emoji: '🌺' },
  ],
};

/** All day-time pools. Falls back to generic time slot if specific key missing. */
const POOLS: Record<string, Entry[]> = {
  latenight: [
    { text: (n) => `Night owl, ${n}`, emoji: '🦉' },
    { text: (n) => `Midnight mode, ${n}`, emoji: '🌙' },
    { text: (n) => `The late shift, ${n}`, emoji: '⚡' },
    { text: (n) => `Still going, ${n}`, emoji: '🔥' },
    { text: (n) => `Deep focus, ${n}`, emoji: '🎯' },
    { text: (n) => `After-hours, ${n}`, emoji: '🌑' },
    { text: (n) => `Wide awake at midnight, ${n}`, emoji: '✨' },
    { text: (n) => `The night is yours, ${n}`, emoji: '🌙' },
    { text: (n) => `Burning the midnight oil, ${n}`, emoji: '🕯️' },
    { text: 'Night owl', emoji: '🦉' },
  ],

  // ── Monday ────────────────────────────────────────────────────────────────
  'monday-morning': [
    { text: (n) => `Fresh chapter, ${n}`, emoji: '📖' },
    { text: (n) => `New week, ${n}`, emoji: '🌅' },
    { text: (n) => `Monday reset, ${n}`, emoji: '⚡' },
    { text: (n) => `First query of the week, ${n}`, emoji: '🔍' },
    { text: (n) => `Rise and build, ${n}`, emoji: '🏗️' },
    { text: (n) => `Monday, unlocked, ${n}`, emoji: '🔓' },
    { text: (n) => `Clean slate, ${n}`, emoji: '✨' },
    { text: (n) => `Week one starts now, ${n}`, emoji: '🚀' },
    { text: 'Fresh chapter', emoji: '📖' },
  ],
  'monday-afternoon': [
    { text: (n) => `Locked in, ${n}`, emoji: '🎯' },
    { text: (n) => `Monday momentum, ${n}`, emoji: '⚡' },
    { text: (n) => `In the zone, ${n}`, emoji: '🔥' },
    { text: (n) => `Heads down, ${n}`, emoji: '💪' },
    { text: (n) => `Running hot, ${n}`, emoji: '🔥' },
    { text: (n) => `Making it count, ${n}`, emoji: '✅' },
    { text: 'Locked in', emoji: '🎯' },
  ],
  'monday-evening': [
    { text: (n) => `Burning bright, ${n}`, emoji: '🔥' },
    { text: (n) => `Still at it, ${n}`, emoji: '💪' },
    { text: (n) => `Monday earned, ${n}`, emoji: '✅' },
    { text: (n) => `Closing strong, ${n}`, emoji: '🏁' },
    { text: (n) => `Momentum carried, ${n}`, emoji: '⚡' },
    { text: (n) => `After the grind, ${n}`, emoji: '🌙' },
    { text: 'Burning bright', emoji: '🔥' },
  ],

  // ── Tuesday ───────────────────────────────────────────────────────────────
  'tuesday-morning': [
    { text: (n) => `Tuesday ambition, ${n}`, emoji: '🎯' },
    { text: (n) => `Sharp Tuesday, ${n}`, emoji: '⚡' },
    { text: (n) => `Second day, full send, ${n}`, emoji: '🚀' },
    { text: (n) => `Picking up speed, ${n}`, emoji: '💨' },
    { text: (n) => `Tuesday fire, ${n}`, emoji: '🔥' },
    { text: (n) => `Built for Tuesdays, ${n}`, emoji: '💪' },
    { text: 'Tuesday ambition', emoji: '🎯' },
  ],
  'tuesday-afternoon': [
    { text: (n) => `Sharp focus, ${n}`, emoji: '🎯' },
    { text: (n) => `Dig deeper, ${n}`, emoji: '🔍' },
    { text: (n) => `Mid-stride, ${n}`, emoji: '🏃' },
    { text: (n) => `Finding the thread, ${n}`, emoji: '🧵' },
    { text: (n) => `Tuesday peak, ${n}`, emoji: '📈' },
    { text: (n) => `In the thick of it, ${n}`, emoji: '💪' },
    { text: 'Sharp focus', emoji: '🎯' },
  ],
  'tuesday-evening': [
    { text: (n) => `Second wind, ${n}`, emoji: '💨' },
    { text: (n) => `Evening precision, ${n}`, emoji: '🎯' },
    { text: (n) => `The long game, ${n}`, emoji: '♟️' },
    { text: (n) => `Still in it, ${n}`, emoji: '🔥' },
    { text: (n) => `Tuesday after-dark, ${n}`, emoji: '🌙' },
    { text: (n) => `Late push, ${n}`, emoji: '⚡' },
    { text: 'Second wind', emoji: '💨' },
  ],

  // ── Wednesday ─────────────────────────────────────────────────────────────
  'wednesday-morning': [
    { text: (n) => `Midweek spark, ${n}`, emoji: '⚡' },
    { text: (n) => `Wednesday opens, ${n}`, emoji: '🌤️' },
    { text: (n) => `Full stride, ${n}`, emoji: '🏃' },
    { text: (n) => `Wednesday's yours, ${n}`, emoji: '✨' },
    { text: (n) => `Midweek clarity, ${n}`, emoji: '💡' },
    { text: (n) => `Cresting the hill, ${n}`, emoji: '🏔️' },
    { text: 'Midweek spark', emoji: '⚡' },
  ],
  'wednesday-afternoon': [
    { text: (n) => `Peak Wednesday, ${n}`, emoji: '📈' },
    { text: (n) => `Over the hump, ${n}`, emoji: '✅' },
    { text: (n) => `Midweek flow, ${n}`, emoji: '🌊' },
    { text: (n) => `Deep Wednesday, ${n}`, emoji: '🔍' },
    { text: (n) => `Keep the streak, ${n}`, emoji: '🔥' },
    { text: (n) => `Holding the line, ${n}`, emoji: '💪' },
    { text: 'Peak Wednesday', emoji: '📈' },
  ],
  'wednesday-evening': [
    { text: (n) => `Late-week breakthrough, ${n}`, emoji: '💡' },
    { text: (n) => `Evening edge, ${n}`, emoji: '⚡' },
    { text: (n) => `Midweek night owl, ${n}`, emoji: '🦉' },
    { text: (n) => `After midweek, ${n}`, emoji: '🌙' },
    { text: (n) => `Wednesday deep, ${n}`, emoji: '🔍' },
    { text: 'Evening edge', emoji: '⚡' },
  ],

  // ── Thursday ──────────────────────────────────────────────────────────────
  'thursday-morning': [
    { text: (n) => `Bold Thursday, ${n}`, emoji: '💪' },
    { text: (n) => `Ideas brewing, ${n}`, emoji: '☕' },
    { text: (n) => `Thursday sharpness, ${n}`, emoji: '⚡' },
    { text: (n) => `Home stretch, ${n}`, emoji: '🏁' },
    { text: (n) => `Pre-Friday push, ${n}`, emoji: '🚀' },
    { text: (n) => `Thursday fuel, ${n}`, emoji: '🔥' },
    { text: 'Bold Thursday', emoji: '💪' },
    { text: 'Ideas brewing', emoji: '☕' },
  ],
  'thursday-afternoon': [
    { text: (n) => `Connecting dots, ${n}`, emoji: '🔗' },
    { text: (n) => `Thursday depth, ${n}`, emoji: '🔍' },
    { text: (n) => `Late-week clarity, ${n}`, emoji: '💡' },
    { text: (n) => `Final stretch, ${n}`, emoji: '🏁' },
    { text: (n) => `Thursday momentum, ${n}`, emoji: '⚡' },
    { text: 'Connecting dots', emoji: '🔗' },
    { text: 'Late-week clarity', emoji: '💡' },
  ],
  'thursday-evening': [
    { text: (n) => `Deep Thursday, ${n}`, emoji: '🌙' },
    { text: (n) => `Night thoughts, ${n}`, emoji: '💭' },
    { text: (n) => `Almost Friday, ${n}`, emoji: '✨' },
    { text: (n) => `Thursday after-hours, ${n}`, emoji: '🌑' },
    { text: (n) => `Late-week mode, ${n}`, emoji: '⚡' },
    { text: 'Deep Thursday', emoji: '🌙' },
    { text: 'Night thoughts', emoji: '💭' },
  ],

  // ── Friday ────────────────────────────────────────────────────────────────
  'friday-morning': [
    { text: (n) => `Strong close, ${n}`, emoji: '🏁' },
    { text: (n) => `Final push, ${n}`, emoji: '💪' },
    { text: (n) => `Ending the week right, ${n}`, emoji: '🌟' },
    { text: (n) => `Friday fire, ${n}`, emoji: '🔥' },
    { text: (n) => `Finish line in sight, ${n}`, emoji: '🎯' },
    { text: (n) => `Friday momentum, ${n}`, emoji: '⚡' },
    { text: (n) => `Making it count, ${n}`, emoji: '✅' },
    { text: 'Strong close', emoji: '🏁' },
    { text: 'Friday fire', emoji: '🔥' },
  ],
  'friday-afternoon': [
    { text: (n) => `Final sprint, ${n}`, emoji: '🏃' },
    { text: (n) => `Last big idea of the week, ${n}`, emoji: '💡' },
    { text: (n) => `Making Friday legendary, ${n}`, emoji: '🌟' },
    { text: (n) => `Closing time, ${n}`, emoji: '🏁' },
    { text: (n) => `One more before the weekend, ${n}`, emoji: '✨' },
    { text: (n) => `Friday edge, ${n}`, emoji: '⚡' },
    { text: 'Final sprint', emoji: '🏃' },
    { text: 'Last big idea of the week', emoji: '💡' },
  ],
  'friday-evening': [
    { text: (n) => `Curious Friday, ${n}`, emoji: '🌙' },
    { text: (n) => `Friday night mind, ${n}`, emoji: '✨' },
    { text: (n) => `The best ideas arrive on Friday nights, ${n}`, emoji: '💡' },
    { text: (n) => `Still here, ${n}`, emoji: '🔥' },
    { text: (n) => `Night owl Friday, ${n}`, emoji: '🦉' },
    { text: 'Curious Friday', emoji: '🌙' },
    { text: 'Friday night mind', emoji: '✨' },
  ],

  // ── Weekend ───────────────────────────────────────────────────────────────
  'weekend-morning': [
    { text: (n) => `Rise bold, ${n}`, emoji: '🌅' },
    { text: (n) => `Your time, ${n}`, emoji: '✨' },
    { text: (n) => `Weekend unlocked, ${n}`, emoji: '🔓' },
    { text: (n) => `Morning, no meetings, ${n}`, emoji: '☀️' },
    { text: (n) => `Slow start, deep thinking, ${n}`, emoji: '💭' },
    { text: (n) => `The world's yours, ${n}`, emoji: '🌍' },
    { text: (n) => `Wide awake, ${n}`, emoji: '🌅' },
    { text: (n) => `No alarm, no agenda, ${n}`, emoji: '🌿' },
    { text: 'Rise bold', emoji: '🌅' },
  ],
  'weekend-afternoon': [
    { text: (n) => `Unstructured hours, ${n}`, emoji: '🌿' },
    { text: (n) => `Weekend deep dive, ${n}`, emoji: '🔍' },
    { text: (n) => `No rush, ${n}`, emoji: '☀️' },
    { text: (n) => `Idle curiosity, ${n}`, emoji: '🤔' },
    { text: (n) => `Wide open, ${n}`, emoji: '🌅' },
    { text: (n) => `Free range, ${n}`, emoji: '🌿' },
    { text: (n) => `Weekend research mode, ${n}`, emoji: '🔬' },
    { text: 'Unstructured hours', emoji: '🌿' },
    { text: 'No rush', emoji: '☀️' },
  ],
  'weekend-evening': [
    { text: (n) => `Still curious, ${n}`, emoji: '🌙' },
    { text: (n) => `Weekend night mode, ${n}`, emoji: '✨' },
    { text: (n) => `One more before tomorrow, ${n}`, emoji: '💫' },
    { text: (n) => `The night is young, ${n}`, emoji: '🌙' },
    { text: (n) => `Late weekend, ${n}`, emoji: '🌑' },
    { text: 'Still curious', emoji: '🌙' },
    { text: 'The night is young', emoji: '🌙' },
  ],

  // ── Generic fallbacks ─────────────────────────────────────────────────────
  morning: [
    { text: (n) => `Good morning, ${n}`, emoji: '🌅' },
    { text: (n) => `Wide awake, ${n}`, emoji: '☀️' },
    { text: (n) => `Rise and think, ${n}`, emoji: '💭' },
    { text: (n) => `Sharp morning, ${n}`, emoji: '⚡' },
    { text: 'Good morning', emoji: '🌅' },
    { text: 'Wide awake', emoji: '☀️' },
  ],
  afternoon: [
    { text: (n) => `Sharp focus, ${n}`, emoji: '🎯' },
    { text: (n) => `Second wind, ${n}`, emoji: '💨' },
    { text: (n) => `Midday mind, ${n}`, emoji: '💡' },
    { text: (n) => `In the flow, ${n}`, emoji: '🌊' },
    { text: 'Sharp focus', emoji: '🎯' },
    { text: 'Midday mind', emoji: '💡' },
  ],
  evening: [
    { text: (n) => `Good evening, ${n}`, emoji: '🌙' },
    { text: (n) => `Burning bright, ${n}`, emoji: '🔥' },
    { text: (n) => `Evening mode, ${n}`, emoji: '✨' },
    { text: (n) => `Night shift, ${n}`, emoji: '⚡' },
    { text: 'Good evening', emoji: '🌙' },
    { text: 'Evening mode', emoji: '✨' },
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
