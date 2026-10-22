// Multiple-choice questions for battles and study. Pure functions only.

import type { Word } from "./data/words";
import { shuffle } from "./util";

// What a question shows and what you pick:
// - meaning: see the hanzi, pick its meaning
// - hanzi:   see the meaning, pick the hanzi
// - pinyin:  see the pinyin, pick the hanzi
// - blank:   see the word's example sentence with a gap, pick the hanzi that fills it
export type QuestionType = "meaning" | "hanzi" | "pinyin" | "blank";

export const BLANK = "＿＿";

// One answer option. `sub` is the small second line (the pinyin), if any.
export interface Choice {
  wordId: string;
  label: string;
  sub?: string;
}

export interface Question {
  type: QuestionType;
  word: Word; // the correct answer
  prompt: string; // what is shown above the options
  choices: Choice[]; // shuffled, one of them correct
}

// The word fields a question shows as its prompt and as its options. A wrong option
// must differ from the answer in both, or it could also be a right answer.
const PROMPT_FIELD: Record<QuestionType, keyof Word> = {
  meaning: "hanzi",
  hanzi: "meaning",
  pinyin: "pinyin",
  blank: "meaning", // two words with the same meaning could both fit the gap
};
const ANSWER_FIELD: Record<QuestionType, keyof Word> = {
  meaning: "meaning",
  hanzi: "hanzi",
  pinyin: "hanzi",
  blank: "hanzi",
};

// Only blank questions need something extra: an example sentence with the word in it
// exactly once. In "他拍了拍我的头。" blanking one 拍 would leave the answer showing.
export function canAsk(type: QuestionType, word: Word): boolean {
  if (type !== "blank") return true;
  return !!word.example && word.example.split(word.hanzi).length === 2;
}

// Picks one of the allowed types at random, skipping types this word can't be asked as.
// Falls back to "meaning", which every word can be asked as.
export function pickQuestionType(types: QuestionType[], word: Word, rng: () => number = Math.random): QuestionType {
  const usable = types.filter((t) => canAsk(t, word));
  if (usable.length === 0) return "meaning";
  return usable[Math.floor(rng() * usable.length)];
}

function promptFor(type: QuestionType, word: Word): string {
  if (type === "meaning") return word.hanzi;
  if (type === "hanzi") return word.meaning;
  if (type === "pinyin") return word.pinyin;
  return word.example!.replace(word.hanzi, BLANK);
}

// The option for one word. Pinyin questions never show pinyin on the options,
// because that would give the answer away.
function choiceFor(type: QuestionType, word: Word): Choice {
  if (type === "meaning") return { wordId: word.id, label: word.meaning, sub: word.pinyin };
  if (type === "pinyin") return { wordId: word.id, label: word.hanzi };
  return { wordId: word.id, label: word.hanzi, sub: word.pinyin };
}

// Builds a question with up to four options. The caller should check canAsk first;
// if it can't be asked, a "meaning" question is built instead.
export function makeQuestion(
  type: QuestionType,
  word: Word,
  pool: Word[],
  rng: () => number = Math.random,
): Question {
  const kind = canAsk(type, word) ? type : "meaning";
  const promptField = PROMPT_FIELD[kind];
  const answerField = ANSWER_FIELD[kind];

  // Keep one word per answer text, so no option is shown twice.
  const byAnswer = new Map<unknown, Word>();
  for (const w of shuffle(pool, rng)) {
    const differs = w[promptField] !== word[promptField] && w[answerField] !== word[answerField];
    if (differs && !byAnswer.has(w[answerField])) byAnswer.set(w[answerField], w);
  }
  const distractors = [...byAnswer.values()].slice(0, 3);
  const choices = shuffle([word, ...distractors], rng).map((w) => choiceFor(kind, w));
  return { type: kind, word, prompt: promptFor(kind, word), choices };
}

export function isCorrect(question: Question, wordId: string): boolean {
  return question.word.id === wordId;
}

// How many wrong answers a hint removes.
export const HINT_REMOVES = 2;

// The options still on screen after a hint: the correct one and all but
// HINT_REMOVES wrong ones. The choices are already shuffled, so taking the
// first wrong ones is as good as a random pick, and it stays the same on re-render.
export function choicesAfterHint(question: Question): Choice[] {
  let removed = 0;
  return question.choices.filter((choice) => {
    if (isCorrect(question, choice.wordId) || removed >= HINT_REMOVES) return true;
    removed++;
    return false;
  });
}
