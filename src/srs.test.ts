import { describe, expect, it } from "vitest";
import { isDue, newCard, review } from "./srs";

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_700_000_000_000;

describe("review scheduling", () => {
  it("new cards are due immediately", () => {
    expect(isDue(newCard(NOW), NOW)).toBe(true);
  });

  it("first good review schedules 1 day, second 6 days", () => {
    const first = review(newCard(NOW), "good", NOW);
    expect(first.interval).toBe(1);
    const second = review(first, "good", NOW + DAY);
    expect(second.interval).toBe(6);
  });

  it("failing a card resets reps and brings it back within minutes", () => {
    let card = review(newCard(NOW), "good", NOW);
    card = review(card, "good", NOW);
    const failed = review(card, "again", NOW);
    expect(failed.reps).toBe(0);
    expect(failed.due - NOW).toBeLessThan(DAY);
  });

  it("ease never drops below 1.3", () => {
    let card = newCard(NOW);
    for (let i = 0; i < 20; i++) card = review(card, "again", NOW);
    expect(card.ease).toBeGreaterThanOrEqual(1.3);
    for (let i = 0; i < 20; i++) card = review(card, "hard", NOW);
    expect(card.ease).toBeGreaterThanOrEqual(1.3);
  });

  it("easy schedules further out than good", () => {
    const base = review(review(newCard(NOW), "good", NOW), "good", NOW);
    const good = review(base, "good", NOW);
    const easy = review(base, "easy", NOW);
    expect(easy.interval).toBeGreaterThan(good.interval);
  });
});
