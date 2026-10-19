// Checks the word list: required fields, unique ids, no retired ids, per-level
// counts, and every example sentence (see scripts/sentence-lib.ts).
// Run with: npm run check-data (add -- --strict before release)

import { EXAMPLES } from "../src/data/examples";
import { RETIRED_IDS, WORDS } from "../src/data/words";
import { checkExample } from "./sentence-lib";

// New words per level in HSK 2.0 (HSK 4 is 1200 in total, but 600 of those are HSK 1–3).
const MIN_PER_LEVEL: Record<number, number> = { 4: 600, 5: 1300 };
const strict = process.argv.includes("--strict");
const ID_FORMAT = /^h[45]-\d{3,}$/;
const PINYIN_LETTERS = /^[a-zA-ZāáǎàēéěèīíǐìōóǒòūúǔùüǖǘǚǜĀÁǍÀĒÉĚÈŌÓǑÒ']+$/;
const problems: string[] = [];

const seen = new Set<string>();
const hanziSeen = new Set<string>();
for (const w of WORDS) {
  if (seen.has(w.id)) problems.push(`duplicate id: ${w.id}`);
  // A retired id may still be in someone's saved progress, for a different word.
  if (RETIRED_IDS.includes(w.id)) problems.push(`${w.id} is retired and must not be reused`);
  seen.add(w.id);
  if (hanziSeen.has(w.hanzi)) problems.push(`duplicate hanzi: ${w.hanzi}`);
  hanziSeen.add(w.hanzi);
  if (!w.id.startsWith(`h${w.level}-`)) problems.push(`${w.id} id does not match level ${w.level}`);
  if (!ID_FORMAT.test(w.id)) problems.push(`${w.id} is not a valid id (like h5-012)`);
  // Pinyin must be letters with tone marks only. Spaces, digits or brackets mean
  // a dictionary note slipped through the import.
  if (!PINYIN_LETTERS.test(w.pinyin)) problems.push(`${w.id} ${w.hanzi} has unusual pinyin: ${w.pinyin}`);
  if (w.level !== 4 && w.level !== 5) problems.push(`${w.id} has invalid level ${w.level}`);
  for (const field of ["hanzi", "pinyin", "meaning"] as const) {
    if (!w[field]?.trim()) problems.push(`${w.id} is missing ${field}`);
  }
  // An example without its translation (or the other way round) is half-finished.
  if (!!w.example?.trim() !== !!w.exampleMeaning?.trim()) {
    problems.push(`${w.id} needs both example and exampleMeaning, or neither`);
  }
}

// Every example must belong to an HSK 5 word that exists. HSK 4 words don't use examples.
const studyIds = new Set(WORDS.filter((w) => w.level === 5).map((w) => w.id));
for (const id of Object.keys(EXAMPLES)) {
  if (!studyIds.has(id)) problems.push(`examples.ts has ${id}, which is not an HSK 5 word`);
}

for (const level of [4, 5]) {
  const count = WORDS.filter((w) => w.level === level).length;
  const target = MIN_PER_LEVEL[level];
  const short = count < target;
  console.log(`HSK ${level}: ${count} words (${short ? `short of ${target}` : "ok"})`);
  // A short list is only an error with --strict, so day-to-day checks still pass.
  if (short && strict) problems.push(`HSK ${level} needs ${target} words`);
}

// Every example sentence must follow the sentence rules (form only, see sentence-lib.ts).
for (const w of WORDS) {
  if (!w.example || !w.exampleMeaning) continue;
  const errors = checkExample(w.hanzi, { example: w.example, exampleMeaning: w.exampleMeaning });
  const label = `${w.id} ${w.hanzi} "${w.example}"`;
  problems.push(...errors.map((e) => `${label} ${e}`));
}

// HSK 5 words are studied, so each needs an example before release. They are written
// in batches, so missing ones are only an error with --strict.
const withExample = WORDS.filter((w) => w.level === 5 && w.example?.trim()).length;
console.log(`HSK 5 examples: ${withExample} / ${studyIds.size}`);
if (withExample < studyIds.size && strict) {
  problems.push(`${studyIds.size - withExample} HSK 5 words still need an example sentence`);
}

if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log("Data checks passed.");
