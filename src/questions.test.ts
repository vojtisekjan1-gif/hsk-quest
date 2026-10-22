import { describe, expect, it } from "vitest";
import type { Word } from "./data/words";
import {
  BLANK,
  HINT_REMOVES,
  canAsk,
  choicesAfterHint,
  isCorrect,
  makeQuestion,
  pickQuestionType,
  type Question,
  type QuestionType,
} from "./questions";

const word = (n: number, overrides: Partial<Word> = {}): Word => ({
  id: `test-${n}`,
  hanzi: `字${n}`,
  pinyin: `pin${n}`,
  meaning: `meaning ${n}`,
  example: `我们${n}字${n}很好。`,
  level: 5,
  ...overrides,
});

const pool = [1, 2, 3, 4, 5, 6].map((n) => word(n));
const labels = (q: Question) => q.choices.map((c) => c.label);
const ALL_TYPES: QuestionType[] = ["meaning", "hanzi", "pinyin", "blank"];

describe("every question type", () => {
  for (const type of ALL_TYPES) {
    it(`${type}: 4 different options, exactly one of them correct`, () => {
      const q = makeQuestion(type, pool[0], pool);
      expect(q.type).toBe(type);
      expect(q.choices).toHaveLength(4);
      expect(new Set(labels(q)).size).toBe(4);
      expect(q.choices.filter((c) => isCorrect(q, c.wordId))).toHaveLength(1);
    });
  }
});

describe("what each type shows", () => {
  it("meaning: shows the hanzi, options are meanings with pinyin", () => {
    const q = makeQuestion("meaning", pool[0], pool);
    expect(q.prompt).toBe("字1");
    const right = q.choices.find((c) => c.wordId === "test-1")!;
    expect(right).toEqual({ wordId: "test-1", label: "meaning 1", sub: "pin1" });
  });

  it("hanzi: shows the meaning, options are hanzi with pinyin", () => {
    const q = makeQuestion("hanzi", pool[0], pool);
    expect(q.prompt).toBe("meaning 1");
    expect(q.choices.find((c) => c.wordId === "test-1")).toEqual({ wordId: "test-1", label: "字1", sub: "pin1" });
  });

  it("pinyin: shows the pinyin, options are hanzi without pinyin", () => {
    const q = makeQuestion("pinyin", pool[0], pool);
    expect(q.prompt).toBe("pin1");
    for (const c of q.choices) expect(c.sub).toBeUndefined();
  });

  it("blank: shows the example with the word replaced by a gap", () => {
    const q = makeQuestion("blank", pool[0], pool);
    expect(q.prompt).toBe(`我们1${BLANK}很好。`);
    expect(q.prompt).not.toContain("字1");
  });

  it("gives each option the pinyin of its own word", () => {
    for (const c of makeQuestion("meaning", pool[0], pool).choices) {
      expect(c.sub).toBe(pool.find((w) => w.id === c.wordId)!.pinyin);
    }
  });
});

describe("no second right answer", () => {
  it("meaning: never shows the same meaning twice", () => {
    const repeats = [word(1), word(2, { meaning: "meaning 1" }), word(3, { meaning: "same" }), word(4, { meaning: "same" }), word(5)];
    const q = makeQuestion("meaning", repeats[0], repeats);
    expect(new Set(labels(q)).size).toBe(q.choices.length);
    expect(q.choices.map((c) => c.wordId)).not.toContain("test-2");
  });

  it("pinyin: leaves out words that sound the same", () => {
    const homophones = [word(1), word(2, { pinyin: "pin1" }), word(3), word(4), word(5)];
    const q = makeQuestion("pinyin", homophones[0], homophones);
    expect(q.choices.map((c) => c.wordId)).not.toContain("test-2");
  });

  it("hanzi and blank: leave out other words with the same meaning", () => {
    const synonyms = [word(1), word(2, { meaning: "meaning 1" }), word(3), word(4), word(5)];
    for (const type of ["hanzi", "blank"] as const) {
      const q = makeQuestion(type, synonyms[0], synonyms);
      expect(q.choices.map((c) => c.wordId)).not.toContain("test-2");
    }
  });

  it("a small pool gives fewer options rather than a wrong one", () => {
    const only = word(1);
    expect(makeQuestion("meaning", only, [only]).choices).toEqual([{ wordId: "test-1", label: "meaning 1", sub: "pin1" }]);
  });
});

describe("blank questions need an example", () => {
  const noExample = word(1, { example: undefined });

  it("can't be asked without an example that contains the word", () => {
    expect(canAsk("blank", noExample)).toBe(false);
    expect(canAsk("blank", word(1, { example: "没有这个词。" }))).toBe(false);
    expect(canAsk("blank", word(1))).toBe(true);
  });

  it("can't be asked when the word appears more than once, or the gap would show the answer", () => {
    const repeated = word(1, { hanzi: "拍", example: "他拍了拍我的头。" });
    expect(canAsk("blank", repeated)).toBe(false);
    expect(makeQuestion("blank", repeated, pool).type).toBe("meaning");
    expect(pickQuestionType(["blank", "hanzi"], repeated, () => 0)).toBe("hanzi");
  });

  it("still allows other question types without an example", () => {
    expect(canAsk("pinyin", noExample)).toBe(true);
  });

  it("falls back to a meaning question", () => {
    expect(makeQuestion("blank", noExample, pool).type).toBe("meaning");
    expect(pickQuestionType(["blank"], noExample)).toBe("meaning");
  });

  it("picks only from the types this word can be asked as", () => {
    for (const r of [0, 0.4, 0.99]) {
      expect(pickQuestionType(["blank", "pinyin"], noExample, () => r)).toBe("pinyin");
    }
    expect(pickQuestionType(ALL_TYPES, word(1), () => 0.99)).toBe("blank");
    expect(pickQuestionType(ALL_TYPES, word(1), () => 0)).toBe("meaning");
  });
});

describe("hints", () => {
  it("removes two wrong answers and keeps the correct one", () => {
    const q = makeQuestion("hanzi", pool[0], pool);
    const left = choicesAfterHint(q);
    expect(left).toHaveLength(q.choices.length - HINT_REMOVES);
    expect(left.some((c) => isCorrect(q, c.wordId))).toBe(true);
  });

  it("never removes the correct answer, even with few options", () => {
    const small = [word(1), word(2)];
    const q = makeQuestion("meaning", small[0], small);
    expect(choicesAfterHint(q).map((c) => c.wordId)).toEqual(["test-1"]);
  });
});
