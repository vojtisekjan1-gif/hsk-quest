// XP, levels, streaks and badges. Pure functions only.

import type { Rating } from "./srs";

export const XP_PER_CORRECT = 10;
export const DEFAULT_DAILY_GOAL = 20;

// XP earned for one answer. Streaks inside a session add a small bonus,
// capped so long sessions don't break the balance.
export function xpForAnswer(correct: boolean, sessionStreak: number): number {
  if (!correct) return 0;
  const bonus = Math.min(sessionStreak, 5) * 2;
  return XP_PER_CORRECT + bonus;
}

// Flashcard XP scales with recall: a hard recall earns less than a clean one.
// Ratings are self-reported, so this rewards honest rating rather than proving recall.
const RATING_XP: Record<Rating, number> = { again: 0, hard: 5, good: XP_PER_CORRECT, easy: 12 };

export function xpForRating(rating: Rating): number {
  return RATING_XP[rating];
}

// Level n starts at 50 * (n - 1)^2 XP, so each level takes a bit longer to reach.
export function levelFromXp(xp: number): number {
  return Math.floor(Math.sqrt(xp / 50)) + 1;
}

export function xpForLevelStart(level: number): number {
  return 50 * (level - 1) ** 2;
}

export function levelProgress(xp: number): { level: number; into: number; span: number } {
  const level = levelFromXp(xp);
  const start = xpForLevelStart(level);
  const end = xpForLevelStart(level + 1);
  return { level, into: xp - start, span: end - start };
}

// Streaks are counted in local calendar days, using YYYY-MM-DD keys.
export function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function nextStreak(
  current: { streak: number; lastDay: string | null },
  today: string,
): { streak: number; lastDay: string } {
  if (current.lastDay === today) return { streak: current.streak, lastDay: today };

  // Build the previous day from local calendar parts, not UTC milliseconds,
  // so the result stays correct in every time zone.
  const [y, m, d] = today.split("-").map(Number);
  const yesterday = dayKey(new Date(y, m - 1, d - 1));
  const continues = current.lastDay === yesterday;
  return { streak: continues ? current.streak + 1 : 1, lastDay: today };
}

export interface BadgeContext {
  wordsLearned: number; // words with at least one successful review
  wordsMastered: number; // words whose interval is 21+ days
  hsk5Mastered: number;
  hsk5Total: number;
  streak: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  earned: (c: BadgeContext) => boolean;
}

export const BADGES: Badge[] = [
  {
    id: "first-100",
    name: "Century",
    description: "Learn 100 words",
    earned: (c) => c.wordsLearned >= 100,
  },
  {
    id: "streak-7",
    name: "Week Warrior",
    description: "Keep a 7-day streak",
    earned: (c) => c.streak >= 7,
  },
  {
    id: "mastered-500",
    name: "Scholar",
    description: "Master 500 words",
    earned: (c) => c.wordsMastered >= 500,
  },
  // There is no HSK 4 badge: HSK 4 words are only used in battles, never studied.
  {
    id: "hsk5-complete",
    name: "HSK 5 Complete",
    description: "Master every HSK 5 word",
    earned: (c) => c.hsk5Total > 0 && c.hsk5Mastered >= c.hsk5Total,
  },
];

export function earnedBadges(c: BadgeContext): string[] {
  return BADGES.filter((b) => b.earned(c)).map((b) => b.id);
}
