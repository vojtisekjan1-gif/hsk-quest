import { describe, expect, it } from "vitest";
import type { Word } from "./data/words";
import { newCard, review } from "./srs";
import { SESSION_SIZE, buildStudyQueue, dueStudyWords, studyWords } from "./study";

const NOW = 1_000_000;

function word(id: string, level: 4 | 5): Word {
  return { id, hanzi: id, pinyin: "x", meaning: id, level };
}

const mixed = [word("a4", 4), word("a5", 5), word("b4", 4), word("b5", 5)];

describe("study words", () => {
  it("uses HSK 5 words only", () => {
    expect(studyWords(mixed).map((w) => w.id)).toEqual(["a5", "b5"]);
  });

  it("never puts an HSK 4 word in a session, even when it is due", () => {
    const queue = buildStudyQueue(mixed, { a4: newCard(0) }, NOW);
    expect(queue.map((w) => w.id).sort()).toEqual(["a5", "b5"]);
  });

  it("counts new words as due and skips words reviewed for later", () => {
    const later = review(newCard(NOW), "good", NOW); // due again in 1 day
    expect(dueStudyWords(mixed, { a5: later }, NOW).map((w) => w.id)).toEqual(["b5"]);
  });

  it("keeps a session to the session size", () => {
    const many = Array.from({ length: SESSION_SIZE + 5 }, (_, i) => word(`w${i}`, 5));
    expect(buildStudyQueue(many, {}, NOW)).toHaveLength(SESSION_SIZE);
  });
});

describe("random order", () => {
  const many = Array.from({ length: 30 }, (_, i) => word(`w${String(i).padStart(2, "0")}`, 5));
  // Always picking 0 moves each word to the front in turn, so the order is no longer alphabetical.
  const alwaysZero = () => 0;

  it("does not take the first words alphabetically", () => {
    const queue = buildStudyQueue(many, {}, NOW, SESSION_SIZE, alwaysZero);
    const firstTen = many.slice(0, SESSION_SIZE).map((w) => w.id);
    expect(queue.map((w) => w.id).sort()).not.toEqual(firstTen);
  });

  it("puts due reviews in the session before new words", () => {
    // w29 is last alphabetically and would never be reached without this rule.
    const cards = { w29: newCard(0) };
    const queue = buildStudyQueue(many, cards, NOW, SESSION_SIZE, alwaysZero);
    expect(queue.map((w) => w.id)).toContain("w29");
  });

  it("fills a whole session with reviews when that many are due", () => {
    const cards = Object.fromEntries(many.slice(0, SESSION_SIZE + 2).map((w) => [w.id, newCard(0)]));
    const queue = buildStudyQueue(many, cards, NOW, SESSION_SIZE, alwaysZero);
    expect(queue.every((w) => cards[w.id])).toBe(true);
  });
});
