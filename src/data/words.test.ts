import { describe, expect, it } from "vitest";
import { EXAMPLES } from "./examples";
import { RETIRED_IDS, WORDS } from "./words";

describe("word ids", () => {
  it("never reuses a retired id", () => {
    const liveIds = new Set(WORDS.map((w) => w.id));
    for (const id of RETIRED_IDS) expect(liveIds.has(id), `${id} is retired`).toBe(false);
  });

  it("gives every word a different id", () => {
    expect(new Set(WORDS.map((w) => w.id)).size).toBe(WORDS.length);
  });

  // Saved progress from before the full import is keyed by these ids.
  it("keeps the ids of all 20 words from the first seed list", () => {
    const seedIds: Record<string, string> = {
      成功: "h4-003", 到底: "h4-005", 发展: "h4-006", 将来: "h4-009", 经验: "h4-010",
      标准: "h4-011", 感情: "h4-012", 规定: "h4-013", 安排: "h4-014", 判断: "h4-015",
      保持: "h5-001", 财产: "h5-003", 产生: "h5-004", 充分: "h5-005", 反映: "h5-006",
      分析: "h5-007", 功能: "h5-009", 必要: "h5-011", 承担: "h5-012", 观察: "h5-013",
    };
    for (const [hanzi, id] of Object.entries(seedIds)) {
      expect(WORDS.find((w) => w.hanzi === hanzi)?.id, hanzi).toBe(id);
    }
  });
});

describe("word list", () => {
  it("has the full HSK 2.0 lists: 600 HSK 4 and 1300 HSK 5 words", () => {
    expect(WORDS.filter((w) => w.level === 4)).toHaveLength(600);
    expect(WORDS.filter((w) => w.level === 5)).toHaveLength(1300);
  });

  // The generated JSON is only typed by a cast, so check the shape here.
  it("gives every word a level of 4 or 5 and all its text fields", () => {
    for (const w of WORDS) {
      expect([4, 5], w.id).toContain(w.level);
      expect(w.hanzi && w.pinyin && w.meaning, w.id).toBeTruthy();
    }
  });
});

describe("examples", () => {
  it("only belong to HSK 5 words that exist", () => {
    const studyIds = new Set(WORDS.filter((w) => w.level === 5).map((w) => w.id));
    for (const id of Object.keys(EXAMPLES)) expect(studyIds.has(id), id).toBe(true);
  });

  it("always come with a translation", () => {
    for (const w of WORDS) {
      expect(!!w.example?.trim(), w.id).toBe(!!w.exampleMeaning?.trim());
    }
  });
});
