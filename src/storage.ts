// Progress saved in localStorage. Every access is wrapped in try/catch, because
// storage can be blocked or full. The app keeps working without it.

import type { CardState } from "./srs";
import { DEFAULT_DAILY_GOAL } from "./gamification";
import { emptyAdventure, sanitizeAdventure, type AdventureState } from "./adventure";
import { WORDS } from "./data/words";

const KEY = "hsk-quest-v1";
const SCHEMA_VERSION = 1;

export interface Progress {
  version: number;
  xp: number;
  streak: number;
  lastDay: string | null;
  dailyGoal: number;
  xpToday: { day: string | null; amount: number };
  cards: Record<string, CardState>; // keyed by word id
  badges: string[];
  adventure: AdventureState;
}

export function emptyProgress(): Progress {
  return {
    version: SCHEMA_VERSION,
    xp: 0,
    streak: 0,
    lastDay: null,
    dailyGoal: DEFAULT_DAILY_GOAL,
    xpToday: { day: null, amount: 0 },
    cards: {},
    badges: [],
    adventure: emptyAdventure(),
  };
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

const KNOWN_WORD_IDS = new Set(WORDS.map((w) => w.id));

// Keeps only card entries for real word ids whose scheduling fields are real numbers.
// Broken entries are dropped, so they can't crash the review queue.
// Values are clamped to the ranges the scheduler expects.
function sanitizeCards(raw: unknown): Record<string, CardState> {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return {};
  const cards: Record<string, CardState> = {};
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!KNOWN_WORD_IDS.has(id) || typeof value !== "object" || value === null) continue;
    const c = value as Record<string, unknown>;
    if (
      typeof c.ease !== "number" || !Number.isFinite(c.ease) ||
      typeof c.interval !== "number" || !Number.isFinite(c.interval) ||
      typeof c.reps !== "number" || !Number.isFinite(c.reps) ||
      typeof c.due !== "number" || !Number.isFinite(c.due)
    ) {
      continue;
    }
    cards[id] = {
      ease: Math.max(1.3, c.ease),
      interval: Math.max(0, c.interval),
      reps: Math.max(0, c.reps),
      due: c.due,
    };
  }
  return cards;
}

// Checks every field of a saved progress object and replaces bad values with defaults.
export function sanitizeProgress(saved: Partial<Progress>): Progress {
  const xpToday = (saved.xpToday ?? {}) as Partial<Progress["xpToday"]>;
  const goal = Math.round(finiteNumber(saved.dailyGoal, DEFAULT_DAILY_GOAL));
  return {
    version: SCHEMA_VERSION,
    xp: Math.max(0, finiteNumber(saved.xp, 0)),
    streak: Math.max(0, finiteNumber(saved.streak, 0)),
    lastDay: typeof saved.lastDay === "string" ? saved.lastDay : null,
    dailyGoal: goal >= 5 && goal <= 200 ? goal : DEFAULT_DAILY_GOAL,
    xpToday: {
      day: typeof xpToday.day === "string" ? xpToday.day : null,
      amount: Math.max(0, finiteNumber(xpToday.amount, 0)),
    },
    cards: sanitizeCards(saved.cards),
    badges: Array.isArray(saved.badges) ? saved.badges.filter((b): b is string => typeof b === "string") : [],
    adventure: sanitizeAdventure(saved.adventure),
  };
}

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyProgress();
    const parsed = JSON.parse(raw) as Partial<Progress>;
    if (parsed.version !== SCHEMA_VERSION) return emptyProgress();
    // Older saves may lack newer fields, and bad values are replaced with defaults.
    return sanitizeProgress(parsed);
  } catch {
    return emptyProgress();
  }
}

export function saveProgress(progress: Progress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress));
  } catch {
    // Storage unavailable: progress lasts only for this page visit.
  }
}

export function resetProgress(): Progress {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
  return emptyProgress();
}
