// Spaced repetition scheduling based on SM-2.
// Pure functions only: no storage or DOM access, so they are easy to test.

export type Rating = "again" | "hard" | "good" | "easy";

export interface CardState {
  ease: number; // easiness factor, never below MIN_EASE
  interval: number; // days until the next review
  reps: number; // consecutive successful reviews
  due: number; // epoch ms when the card is next due
}

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_EASE = 1.3;
const DEFAULT_EASE = 2.5;

// Map our four buttons onto SM-2's 0-5 quality scale.
const QUALITY: Record<Rating, number> = { again: 0, hard: 3, good: 4, easy: 5 };

export function newCard(now: number): CardState {
  return { ease: DEFAULT_EASE, interval: 0, reps: 0, due: now };
}

export function review(card: CardState, rating: Rating, now: number): CardState {
  const q = QUALITY[rating];

  // Failed recall: restart the card, due again soon.
  if (q < 3) {
    return { ease: card.ease, interval: 0, reps: 0, due: now + 10 * 60 * 1000 };
  }

  const ease = Math.max(
    MIN_EASE,
    card.ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)),
  );
  const reps = card.reps + 1;

  let interval: number;
  if (reps === 1) interval = 1;
  else if (reps === 2) interval = 6;
  else interval = Math.max(1, Math.round(card.interval * ease));

  // "Easy" pushes the card a little further out.
  if (rating === "easy") interval = Math.round(interval * 1.3);

  return { ease, interval, reps, due: now + interval * DAY_MS };
}

export function isDue(card: CardState, now: number): boolean {
  return card.due <= now;
}
