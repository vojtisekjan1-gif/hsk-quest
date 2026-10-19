import { describe, expect, it } from "vitest";
import { checkExample, countChinese } from "./sentence-lib";

const ok = (example: string, exampleMeaning = "He is willing to take responsibility.") => ({ example, exampleMeaning });

describe("countChinese", () => {
  it("counts Chinese characters only, not punctuation", () => {
    expect(countChinese("他愿意承担责任。")).toBe(7);
  });
});

describe("checkExample", () => {
  it("accepts a good sentence", () => {
    expect(checkExample("承担", ok("他愿意承担责任。"))).toEqual([]);
  });

  it("needs the word itself", () => {
    expect(checkExample("承担", ok("他很安全。"))).toContain("does not contain 承担");
  });

  it("rejects sentences that are too long", () => {
    const long = "他愿意承担责任他愿意承担责任他愿意。";
    expect(checkExample("承担", ok(long))[0]).toMatch(/characters long/);
  });

  it("needs Chinese end punctuation and no Latin letters", () => {
    const errors = checkExample("承担", ok("他愿意承担OK责任"));
    expect(errors).toContain("should end with 。, ！ or ？");
    expect(errors).toContain("contains Latin letters");
  });

  it("needs a proper English translation", () => {
    expect(checkExample("承担", ok("他愿意承担责任。", ""))).toContain("has no translation");
    expect(checkExample("承担", ok("他愿意承担责任。", "he is willing"))[0]).toMatch(/capital letter/);
  });
});
