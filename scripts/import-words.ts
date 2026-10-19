// Builds src/data/words.generated.json from the files in data-sources/.
// Run with: npm run import-words
//
// - Words and levels: the official HSK 2.0 (2012) lists, hsk2012-level4/5.txt.
// - Pinyin and meanings: complete-hsk-vocabulary.json (meanings from CC-CEDICT).
// - Hand decisions: scripts/import-overrides.ts.
// - Ids: words already in words.generated.json keep their ids (see assignIds).
// The rules themselves are in import-lib.ts, which has tests.

import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { RETIRED_IDS, WORD_LIST, type BaseWord, type HskLevel } from "../src/data/words";
import { assignIds, chooseReading, formatMeaning, renderWordJson, type DictEntry } from "./import-lib";
import { MEANINGS, MISSING, PINYIN, READINGS } from "./import-overrides";

const sourceFile = (name: string) => new URL(`../data-sources/${name}`, import.meta.url);
const OUTPUT = new URL("../src/data/words.generated.json", import.meta.url);
const BACKUP = new URL("../src/data/words.generated.json.bak", import.meta.url);
const EXPECTED_COUNT: Record<HskLevel, number> = { 4: 600, 5: 1300 };
const LONG_MEANING = 60; // meanings longer than this are listed for a person to shorten

// One word per line. The files may start with a byte-order mark.
function readList(level: HskLevel): string[] {
  const text = readFileSync(sourceFile(`hsk2012-level${level}.txt`), "utf8").replace(/^﻿/, "");
  return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

// The dictionary as a lookup by simplified characters. Entries that share
// characters are merged, so no reading is lost.
function readDictionary(): Map<string, DictEntry> {
  const entries = JSON.parse(readFileSync(sourceFile("complete-hsk-vocabulary.json"), "utf8")) as DictEntry[];
  const byHanzi = new Map<string, DictEntry>();
  for (const entry of entries) {
    const known = byHanzi.get(entry.simplified);
    if (known) known.forms.push(...entry.forms);
    else byHanzi.set(entry.simplified, { simplified: entry.simplified, forms: [...entry.forms] });
  }
  return byHanzi;
}

function fail(problems: string[]): never {
  console.error(`Import stopped. Fix these first:\n- ${problems.join("\n- ")}`);
  process.exit(1);
}

function main(): void {
  const lists: Record<HskLevel, string[]> = { 4: readList(4), 5: readList(5) };
  const problems: string[] = [];
  for (const level of [4, 5] as const) {
    if (lists[level].length !== EXPECTED_COUNT[level]) {
      problems.push(`HSK ${level} list has ${lists[level].length} words, expected ${EXPECTED_COUNT[level]}`);
    }
  }
  const listed = new Set([...lists[4], ...lists[5]]);
  if (listed.size !== lists[4].length + lists[5].length) problems.push("a word appears twice in the lists");
  for (const [name, overrides] of Object.entries({ READINGS, PINYIN, MEANINGS, MISSING })) {
    for (const hanzi of Object.keys(overrides)) {
      if (!listed.has(hanzi)) problems.push(`${name} has ${hanzi}, which is not in the lists`);
    }
  }

  // The existing ids come from the current generated file. If it were lost or emptied,
  // every word would be renumbered and saved progress would point at the wrong words.
  if (WORD_LIST.length === 0) {
    problems.push(
      "src/data/words.generated.json has no words, so existing ids can't be kept. " +
        "Restore it (for example from words.generated.json.bak) before importing.",
    );
  }
  const { ids, errors } = assignIds(lists, WORD_LIST, RETIRED_IDS);
  problems.push(...errors);
  if (problems.length) fail(problems);

  const dictionary = readDictionary();
  const words: BaseWord[] = [];
  const undecided: string[] = [];
  const longMeanings: string[] = [];
  for (const level of [4, 5] as const) {
    for (const hanzi of lists[level]) {
      const id = ids.get(hanzi)!;
      const manual = MISSING[hanzi];
      const entry = dictionary.get(hanzi);
      if (!manual && !entry) {
        problems.push(`${hanzi} is not in the dictionary: add it to MISSING`);
        continue;
      }
      let pinyin: string;
      let meaning: string;
      if (manual) {
        ({ pinyin, meaning } = manual);
      } else {
        let reading: ReturnType<typeof chooseReading>;
        try {
          reading = chooseReading(entry!, READINGS[hanzi]);
        } catch (error) {
          problems.push(`${(error as Error).message}: fix READINGS`);
          continue;
        }
        pinyin = reading.pinyin;
        meaning = formatMeaning(reading.meanings);
        if (reading.alternatives.length) {
          undecided.push(`${hanzi} ${pinyin} (${meaning}) | also: ${reading.alternatives.join(", ")}`);
        }
      }
      pinyin = PINYIN[hanzi] ?? pinyin;
      meaning = MEANINGS[hanzi] ?? meaning;
      if (meaning.length > LONG_MEANING) longMeanings.push(`${hanzi}: ${meaning}`);
      words.push({ id, hanzi, pinyin, meaning, level });
    }
  }
  if (problems.length) fail(problems);

  // Keep the previous version, so the ids can be recovered if something goes wrong.
  copyFileSync(OUTPUT, BACKUP);
  writeFileSync(OUTPUT, renderWordJson(words));
  const newWords = words.filter((w) => !WORD_LIST.some((old) => old.id === w.id)).length;
  console.log(`Wrote ${words.length} words (${newWords} new) to src/data/words.generated.json.`);
  if (undecided.length) {
    console.log(`\n${undecided.length} words have other readings. Confirm each in READINGS (import-overrides.ts):`);
    for (const line of undecided) console.log(`  ${line}`);
  }
  if (longMeanings.length) {
    console.log(`\n${longMeanings.length} meanings are long. Consider a shorter one in MEANINGS:`);
    for (const line of longMeanings) console.log(`  ${line}`);
  }
}

main();
