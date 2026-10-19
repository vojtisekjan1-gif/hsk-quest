import { describe, expect, it } from "vitest";
import {
  dayKey,
  earnedBadges,
  xpForRating,
  levelFromXp,
  nextStreak,
  xpForAnswer,
  xpForLevelStart,
  type BadgeContext,
} from "./gamification";

describe("XP", () => {
  it("wrong answers earn nothing", () => {
    expect(xpForAnswer(false, 10)).toBe(0);
  });

  it("session streak bonus is capped", () => {
    expect(xpForAnswer(true, 0)).toBe(10);
    expect(xpForAnswer(true, 3)).toBe(16);
    expect(xpForAnswer(true, 50)).toBe(20);
  });
});

describe("flashcard XP", () => {
  it("scales with the rating", () => {
    expect(xpForRating("again")).toBe(0);
    expect(xpForRating("hard")).toBe(5);
    expect(xpForRating("good")).toBe(10);
    expect(xpForRating("easy")).toBe(12);
  });
});

describe("levels", () => {
  it("starts at level 1 and rises with XP", () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(xpForLevelStart(2))).toBe(2);
    expect(levelFromXp(xpForLevelStart(5) - 1)).toBe(4);
  });
});

describe("streaks", () => {
  it("dayKey formats the local calendar date", () => {
    expect(dayKey(new Date(2026, 9, 5, 23, 30))).toBe("2026-10-05");
  });

  it("same day keeps the streak", () => {
    expect(nextStreak({ streak: 4, lastDay: "2026-10-18" }, "2026-10-18")).toEqual({
      streak: 4,
      lastDay: "2026-10-18",
    });
  });

  it("consecutive day increments", () => {
    expect(nextStreak({ streak: 4, lastDay: "2026-10-17" }, "2026-10-18")).toEqual({
      streak: 5,
      lastDay: "2026-10-18",
    });
  });

  it("missed day resets to 1", () => {
    expect(nextStreak({ streak: 4, lastDay: "2026-10-15" }, "2026-10-18")).toEqual({
      streak: 1,
      lastDay: "2026-10-18",
    });
  });

  it("crosses the month boundary", () => {
    expect(nextStreak({ streak: 2, lastDay: "2026-10-31" }, "2026-11-01").streak).toBe(3);
  });
});

describe("badges", () => {
  const base: BadgeContext = {
    wordsLearned: 0,
    wordsMastered: 0,
    hsk5Mastered: 0,
    hsk5Total: 10,
    streak: 0,
  };

  it("awards nothing at zero progress", () => {
    expect(earnedBadges(base)).toEqual([]);
  });

  it("awards the streak badge at 7 days", () => {
    expect(earnedBadges({ ...base, streak: 7 })).toContain("streak-7");
  });

  it("does not award the HSK 5 badge when the list is empty", () => {
    expect(earnedBadges({ ...base, hsk5Total: 0, hsk5Mastered: 0 })).not.toContain("hsk5-complete");
  });

  it("awards the HSK 5 badge when every HSK 5 word is mastered", () => {
    expect(earnedBadges({ ...base, hsk5Mastered: 10 })).toContain("hsk5-complete");
  });
});
