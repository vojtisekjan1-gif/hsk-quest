import { describe, expect, it } from "vitest";
import type { BaseWord } from "../src/data/words";
import {
  assignIds,
  chooseReading,
  cleanMeanings,
  formatMeaning,
  joinPinyin,
  renderWordJson,
  type DictEntry,
} from "./import-lib";

const form = (pinyin: string, ...meanings: string[]) => ({ transcriptions: { pinyin }, meanings });

describe("joinPinyin", () => {
  it("joins syllables", () => {
    expect(joinPinyin("dào dǐ")).toBe("dàodǐ");
    expect(joinPinyin("guān xi")).toBe("guānxi");
  });

  it("adds an apostrophe before a syllable starting with a, o or e", () => {
    expect(joinPinyin("xī ān")).toBe("xī'ān");
    expect(joinPinyin("jī è")).toBe("jī'è");
    expect(joinPinyin("ài qíng")).toBe("àiqíng"); // not at the start
  });

  it("turns the dictionary's u: into ü", () => {
    expect(joinPinyin("shěng lu:è")).toBe("shěnglüè");
  });

  it("joins tone marks written as two characters into one", () => {
    const decomposed = "Ōu zhōu"; // Ō and ō as letter + combining macron
    expect(joinPinyin(decomposed)).toBe("Ōuzhōu");
  });

  it("puts the tone mark of ou on the o", () => {
    expect(joinPinyin("Oū zhōu")).toBe("Ōuzhōu");
    expect(joinPinyin("oǔ ěr")).toBe("ǒu'ěr");
  });

  it("keeps a capital letter only at the start", () => {
    expect(joinPinyin("Cháng Jiāng")).toBe("Chángjiāng");
  });
});

describe("meanings", () => {
  it("drops surnames, variants, cross-references and measure words", () => {
    expect(cleanMeanings(["surname Gan", "variant of 干", "see 汗国", "CL:個|个", "dry"])).toEqual(["dry"]);
  });

  it("splits entries that hold several meanings", () => {
    expect(cleanMeanings(["huge; great; grand", "important"])).toEqual(["huge", "great", "grand", "important"]);
  });

  it("removes pronunciation notes and the bound-form label", () => {
    expect(cleanMeanings(["hair; Taiwan pr. [fǎ]", "(bound form) to reflect"])).toEqual(["hair", "to reflect"]);
  });

  it("removes every kind of pronunciation note", () => {
    expect(cleanMeanings(["father; also pr. [fù qin]", "blood; colloquial pr. [xiě]"])).toEqual(["father", "blood"]);
  });

  it("drops slang, regional and sound-word senses", () => {
    expect(cleanMeanings(["leaf; (slang) marijuana", "potato; (Tw) peanut", "(onom.) dong; to be"])).toEqual([
      "leaf",
      "potato",
      "to be",
    ]);
  });

  it("puts classical and literary senses after everyday ones", () => {
    expect(cleanMeanings(["(classical) to say; cloud"])).toEqual(["cloud", "(classical) to say"]);
  });

  it("drops cross-references but keeps meanings that start with 'see'", () => {
    expect(cleanMeanings(["see 汗国", "see you again"])).toEqual(["see you again"]);
  });

  it("removes notes in brackets that contain Chinese characters", () => {
    expect(cleanMeanings(["Europe (abbr. for 欧罗巴洲)", "to stand (up)"])).toEqual(["Europe", "to stand (up)"]);
  });

  it("keeps the line short but always keeps the first meaning", () => {
    expect(formatMeaning(["to keep", "to maintain", "to hold", "to preserve"])).toBe("to keep; to maintain; to hold");
    const long = "a very long first meaning that is over the limit on its own";
    expect(formatMeaning([long, "short"])).toBe(long);
  });
});

describe("chooseReading", () => {
  it("skips a place name listed first (成功 is also a town in Taiwan)", () => {
    const entry: DictEntry = {
      simplified: "成功",
      forms: [form("Chéng gōng", "Chenggong town in Taitung County"), form("chéng gōng", "success", "to succeed")],
    };
    expect(chooseReading(entry)).toEqual({ pinyin: "chénggōng", meanings: ["success", "to succeed"], alternatives: [] });
  });

  it("skips readings that are only variants or surnames", () => {
    const entry: DictEntry = {
      simplified: "汤",
      forms: [form("Tāng", "surname Tang"), form("tāng", "variant of 汤"), form("tāng", "soup")],
    };
    expect(chooseReading(entry).meanings).toEqual(["soup"]);
  });

  it("reports other real readings so a person can confirm", () => {
    const entry: DictEntry = { simplified: "当", forms: [form("dāng", "to be"), form("dàng", "suitable")] };
    const reading = chooseReading(entry);
    expect(reading.pinyin).toBe("dāng");
    expect(reading.alternatives).toEqual(["dàng"]);
  });

  it("uses the preferred reading when one is given", () => {
    const entry: DictEntry = { simplified: "当", forms: [form("dāng", "to be"), form("dàng", "suitable")] };
    expect(chooseReading(entry, "dàng")).toEqual({ pinyin: "dàng", meanings: ["suitable"], alternatives: [] });
  });

  it("fails when the preferred reading does not exist", () => {
    const entry: DictEntry = { simplified: "当", forms: [form("dāng", "to be")] };
    expect(() => chooseReading(entry, "dǎng")).toThrow();
  });

  it("keeps a word that only has a capitalized reading (中文)", () => {
    const entry: DictEntry = { simplified: "中文", forms: [form("Zhōng wén", "Chinese language")] };
    expect(chooseReading(entry).pinyin).toBe("Zhōngwén");
  });
});

describe("assignIds", () => {
  const word = (id: string, hanzi: string, level: 4 | 5): BaseWord => ({ id, hanzi, pinyin: "x", meaning: "x", level });

  it("keeps existing ids and numbers new words after the highest live or retired id", () => {
    const existing = [word("h4-003", "甲", 4), word("h5-001", "乙", 5)];
    const result = assignIds({ 4: ["甲", "丙"], 5: ["乙", "丁"] }, existing, ["h4-007"]);
    expect(result.errors).toEqual([]);
    expect(Object.fromEntries(result.ids)).toEqual({ 甲: "h4-003", 丙: "h4-008", 乙: "h5-001", 丁: "h5-002" });
  });

  it("stops when a word changed level and its old id is not retired", () => {
    const result = assignIds({ 4: [], 5: ["甲"] }, [word("h4-003", "甲", 4)], []);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("h4-003");
  });

  it("gives a moved word a new id once its old id is retired", () => {
    const result = assignIds({ 4: [], 5: ["甲"] }, [word("h4-003", "甲", 4)], ["h4-003"]);
    expect(result.errors).toEqual([]);
    expect(result.ids.get("甲")).toBe("h5-001");
  });

  it("stops when a word was dropped and its id is not retired", () => {
    const result = assignIds({ 4: [], 5: [] }, [word("h4-003", "甲", 4)], []);
    expect(result.errors[0]).toContain("no longer in the lists");
  });
});

describe("renderWordJson", () => {
  it("writes valid JSON with one word per line", () => {
    const words: BaseWord[] = [
      { id: "h4-001", hanzi: "说", pinyin: "shuō", meaning: 'to say "hi"', level: 4 },
      { id: "h5-001", hanzi: "写", pinyin: "xiě", meaning: "to write", level: 5 },
    ];
    const text = renderWordJson(words);
    expect(JSON.parse(text)).toEqual(words);
    expect(text.split("\n")).toHaveLength(5); // "[", two words, "]", final newline
  });
});
