// Pure rules for checking example sentences (used by scripts/check-data.ts).
// No file access here, so every rule can be tested on its own.
// These only check the form of a sentence. Whether its words suit an HSK 5
// learner is left to the writer: a word-list check flagged too many fine sentences.

// Longest allowed sentence, counted in Chinese characters (punctuation not counted).
export const MAX_SENTENCE_CHARS = 15;

const HAN = /\p{Script=Han}/u;

export function countChinese(text: string): number {
  return [...text].filter((ch) => HAN.test(ch)).length;
}

// Checks one example sentence and its translation against the rules in CLAUDE.md.
// Returns the problems found; an empty list means the example is fine.
export function checkExample(hanzi: string, example: { example: string; exampleMeaning: string }): string[] {
  const errors: string[] = [];
  const sentence = example.example.trim();
  const translation = example.exampleMeaning.trim();

  if (!sentence.includes(hanzi)) errors.push(`does not contain ${hanzi}`);
  const length = countChinese(sentence);
  if (length > MAX_SENTENCE_CHARS) errors.push(`is ${length} characters long (at most ${MAX_SENTENCE_CHARS})`);
  if (!/[。！？][”」]?$/.test(sentence)) errors.push("should end with 。, ！ or ？");
  if (/[A-Za-z]/.test(sentence)) errors.push("contains Latin letters");

  if (!translation) errors.push("has no translation");
  else if (!/^["“'‘]?[A-Z]/.test(translation) || !/[.!?]["”'’]?$/.test(translation)) {
    errors.push("translation should start with a capital letter and end with . ! or ?");
  }
  return errors;
}
