// The word list the app uses. It joins two parts:
// - WORD_LIST (words.generated.json): every HSK 4 and HSK 5 word with pinyin and meaning,
//   built by `npm run import-words` from the official HSK 2.0 (2012) lists.
//   That file is GENERATED: never edit it by hand. Change scripts/import-overrides.ts
//   and run the import again. The import reads its ids, so existing words keep them.
// - EXAMPLES (examples.ts): hand-written example sentences for HSK 5 study words.
// Each word has a stable id, because saved progress is keyed by it.
// Run `npm run check-data` after any change.

import { EXAMPLES } from "./examples";
import generated from "./words.generated.json";

export type HskLevel = 4 | 5;

// A word as the import produces it, before examples are added.
export interface BaseWord {
  id: string;
  hanzi: string;
  pinyin: string;
  meaning: string;
  level: HskLevel;
}

export interface Word extends BaseWord {
  // Example sentence and its English translation. HSK 5 (study) words need one before
  // release; HSK 4 (battle-only) words don't. check-data enforces this.
  example?: string;
  exampleMeaning?: string;
}

// Ids that were used once and then removed. They must never be used again,
// or old saved progress would attach to a different word. check-data,
// words.test.ts and the import enforce this.
// Progress saved under these ids is dropped on load, even for the four words that
// moved to a new id. That was intended while the list was a development seed.
export const RETIRED_IDS: string[] = [
  "h4-001", // 比较: HSK 3, not HSK 4
  "h4-002", // 必要: HSK 5, now h5-011
  "h4-004", // 城市: HSK 3
  "h4-007", // 关系: HSK 3
  "h4-008", // 环境: HSK 3
  "h5-002", // 标准: HSK 4, now h4-011
  "h5-008", // 感情: HSK 4, now h4-012
  "h5-010", // 规定: HSK 4, now h4-013
];

// JSON only knows "number" for the level. check-data and the tests make sure it is 4 or 5.
export const WORD_LIST = generated as BaseWord[];

export const WORDS: Word[] = WORD_LIST.map((w) => ({ ...w, ...EXAMPLES[w.id] }));
