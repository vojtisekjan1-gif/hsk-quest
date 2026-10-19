// Picks the words for a study session. Pure functions only, so they are easy to test.

import type { HskLevel, Word } from "./data/words";
import { isDue, type CardState } from "./srs";
import { shuffle } from "./util";

// Only HSK 5 is studied. HSK 4 words are already known and appear in Adventure battles only.
export const STUDY_LEVEL: HskLevel = 5;
export const SESSION_SIZE = 10;

export function studyWords(words: Word[]): Word[] {
  return words.filter((w) => w.level === STUDY_LEVEL);
}

// A word is due if it has never been reviewed or its review time has passed.
export function dueStudyWords(words: Word[], cards: Record<string, CardState>, now: number): Word[] {
  return studyWords(words).filter((w) => {
    const card = cards[w.id];
    return card ? isDue(card, now) : true;
  });
}

// Picks the words for one session in random order. Due reviews go in first, so
// they are not crowded out by the many new words; new words fill the rest.
// While SESSION_SIZE or more reviews are due, a session has no new words:
// clearing the backlog comes first. `random` is like Math.random; tests pass
// their own so the order is predictable.
export function buildStudyQueue(
  words: Word[],
  cards: Record<string, CardState>,
  now: number,
  size: number = SESSION_SIZE,
  random: () => number = Math.random,
): Word[] {
  const due = dueStudyWords(words, cards, now);
  const reviews = shuffle(due.filter((w) => cards[w.id]), random);
  const fresh = shuffle(due.filter((w) => !cards[w.id]), random);
  // Shuffle again so reviews and new words are mixed within the session.
  return shuffle([...reviews, ...fresh].slice(0, size), random);
}
