// Pure helpers for the word import (scripts/import-words.ts). No file access here,
// so every rule can be tested on its own.

import type { BaseWord, HskLevel } from "../src/data/words";

// One entry of data-sources/complete-hsk-vocabulary.json (only the fields we use).
export interface DictForm {
  transcriptions: { pinyin: string };
  meanings: string[];
}
export interface DictEntry {
  simplified: string;
  forms: DictForm[];
}

// --- Pinyin -----------------------------------------------------------------

const VOWEL_START = /^[aāáǎàoōóǒòeēéěè]/i;

// The dictionary spaces syllables ("dào dǐ"). Words are written joined ("dàodǐ"),
// with an apostrophe before a syllable that starts with a, o or e ("xī'ān").
// In "ou" the tone mark belongs on the o (ōu), but the dictionary sometimes puts it on the u.
const TONED_U_TO_O: Record<string, string> = { ū: "ō", ú: "ó", ǔ: "ǒ", ù: "ò" };
const TONED_U_TO_CAPITAL_O: Record<string, string> = { ū: "Ō", ú: "Ó", ǔ: "Ǒ", ù: "Ò" };

// The dictionary also writes ü as "u:" (lu:è), and some tone marks as two Unicode
// characters, so the text is normalized first. Only the first syllable keeps a
// capital letter (Cháng Jiāng becomes Chángjiāng).
export function joinPinyin(spaced: string): string {
  const fixed = spaced
    .replace(/u:/g, "ü")
    .replace(/U:/g, "Ü")
    .normalize("NFC")
    .replace(/([oO])([ūúǔù])/g, (_, o: string, u: string) =>
      `${o === "O" ? TONED_U_TO_CAPITAL_O[u] : TONED_U_TO_O[u]}u`,
    );
  const syllables = fixed.trim().split(/\s+/);
  return syllables
    .map((s, i) => (i === 0 ? s : s.toLowerCase()))
    .map((s, i) => (i > 0 && VOWEL_START.test(s) ? `'${s}` : s))
    .join("");
}

// --- Meanings ---------------------------------------------------------------

// Entries that are not a meaning a learner needs: names, cross-references
// ("see" followed by Chinese), measure words, and slang, regional, dialect or
// sound-word senses that would confuse or mislead in a learner app.
const NOT_A_MEANING =
  /^(surname |variant of|old variant|see \p{Script=Han}|used in |also written|CL:|erhua variant|\((slang|Tw|onom\.|dialect|vulgar)\))/iu;

// Old-fashioned senses are kept, but after the everyday ones.
const LITERARY = /^\((classical|literary)\)/;

// Drops non-meanings and tidies the rest. Some entries hold several meanings
// separated by "; ", so those are split first.
export function cleanMeanings(meanings: string[]): string[] {
  const cleaned = meanings
    .flatMap((m) => m.split(/;\s+/))
    .map((m) =>
      m
        // pronunciation notes: "Taiwan pr. [fǎ]", "also pr. [fù qin]", "colloquial pr. [xiě]"
        .replace(/[;,]?\s*(Taiwan |also |colloquial )?pr\. \[[^\]]*\]/g, "")
        .replace(/^\(bound form\)\s*/, "")
        .replace(/\s*\([^)]*\p{Script=Han}[^)]*\)/gu, "") // notes in Chinese, like (abbr. for 欧罗巴洲)
        .trim(),
    )
    .filter((m) => m && !NOT_A_MEANING.test(m));
  return [...cleaned.filter((m) => !LITERARY.test(m)), ...cleaned.filter((m) => LITERARY.test(m))];
}

// Joins the first meanings into one short line. Always keeps at least one meaning.
export function formatMeaning(meanings: string[], maxLength = 40): string {
  const kept: string[] = [];
  for (const m of meanings) {
    const next = [...kept, m].join("; ");
    if (kept.length > 0 && next.length > maxLength) break;
    kept.push(m);
    if (kept.length === 3) break;
  }
  return kept.join("; ");
}

// --- Choosing a reading -----------------------------------------------------

export interface Reading {
  pinyin: string; // joined, as the app shows it
  meanings: string[]; // cleaned
  // Other readings that remain after skipping names and variants. When this is not
  // empty, a person should confirm the choice in import-overrides.ts.
  alternatives: string[];
}

const isName = (f: DictForm) => /^[A-ZĀÁǍÀĒÉĚÈĪÍǏÌŌÓǑÒŪÚǓÙ]/.test(f.transcriptions.pinyin);
// Case matters: "Chénggōng" (a place) and "chénggōng" (success) are different readings.
const key = (f: DictForm) => joinPinyin(f.transcriptions.pinyin);

// Picks the reading the HSK list most likely means:
// skip forms with no real meaning (variants, surnames), then skip names (capitalized
// pinyin), then take the first reading left. `preferred` (joined pinyin) overrides this.
// Forms with the same reading are merged, so their meanings are combined.
export function chooseReading(entry: DictEntry, preferred?: string): Reading {
  const withMeaning = entry.forms.filter((f) => cleanMeanings(f.meanings).length > 0);
  const useful = withMeaning.length > 0 ? withMeaning : entry.forms;
  const common = useful.filter((f) => !isName(f));
  const candidates = common.length > 0 ? common : useful;

  const chosenKey = preferred ?? key(candidates[0]);
  // Prefer the common (non-name) forms, but a preferred reading may also be a name.
  const pool = candidates.some((f) => key(f) === chosenKey) ? candidates : useful;
  const chosen = pool.filter((f) => key(f) === chosenKey);
  if (chosen.length === 0) {
    throw new Error(`${entry.simplified}: no reading "${preferred}" in the dictionary`);
  }
  const meanings = [...new Set(chosen.flatMap((f) => cleanMeanings(f.meanings)))];
  const alternatives = [...new Set(candidates.map(key))].filter((k) => k !== chosenKey);
  return {
    pinyin: joinPinyin(chosen[0].transcriptions.pinyin),
    meanings: meanings.length > 0 ? meanings : chosen[0].meanings,
    alternatives: preferred ? [] : alternatives,
  };
}

// --- Ids --------------------------------------------------------------------

const ID_PATTERN = /^h([45])-(\d+)$/;

export function makeId(level: HskLevel, n: number): string {
  return `h${level}-${String(n).padStart(3, "0")}`;
}

export interface IdResult {
  ids: Map<string, string>; // hanzi -> id
  errors: string[]; // problems a person must fix before the import can finish
}

// Gives every listed word an id. A word that was already in the list at the same
// level keeps its id. New words get the next free number for their level, counting
// retired ids too, so no id is ever used twice.
// A word that changed level, or was dropped, must have its old id retired first,
// because its saved progress would otherwise point at the wrong place.
export function assignIds(
  lists: Record<HskLevel, string[]>,
  existing: BaseWord[],
  retired: string[],
): IdResult {
  const retiredSet = new Set(retired);
  const byHanzi = new Map(existing.map((w) => [w.hanzi, w]));
  const highest: Record<HskLevel, number> = { 4: 0, 5: 0 };
  for (const id of [...existing.map((w) => w.id), ...retired]) {
    const match = ID_PATTERN.exec(id);
    if (!match) continue;
    const level = Number(match[1]) as HskLevel;
    highest[level] = Math.max(highest[level], Number(match[2]));
  }

  const ids = new Map<string, string>();
  const errors: string[] = [];
  for (const level of [4, 5] as const) {
    for (const hanzi of lists[level]) {
      const old = byHanzi.get(hanzi);
      if (old && old.level === level && !retiredSet.has(old.id)) {
        ids.set(hanzi, old.id);
        continue;
      }
      if (old && !retiredSet.has(old.id)) {
        errors.push(`${hanzi} moved from HSK ${old.level} to HSK ${level}: add "${old.id}" to RETIRED_IDS first`);
      }
      highest[level] += 1;
      ids.set(hanzi, makeId(level, highest[level]));
    }
  }

  const listed = new Set([...lists[4], ...lists[5]]);
  for (const w of existing) {
    if (!listed.has(w.hanzi) && !retiredSet.has(w.id)) {
      errors.push(`${w.hanzi} is no longer in the lists: add "${w.id}" to RETIRED_IDS first`);
    }
  }
  return { ids, errors };
}

// --- Output -----------------------------------------------------------------

// Writes the words as the JSON of src/data/words.generated.json, one word per line
// so changes are easy to compare. (JSON, because TypeScript cannot type-check an
// array literal this large.)
export function renderWordJson(words: BaseWord[]): string {
  const lines = words.map((w) =>
    JSON.stringify({ id: w.id, hanzi: w.hanzi, pinyin: w.pinyin, meaning: w.meaning, level: w.level }),
  );
  return `[\n  ${lines.join(",\n  ")}\n]\n`;
}
