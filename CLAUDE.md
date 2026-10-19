# HSK Quest: project notes

A gamified Chinese vocabulary app for learners at HSK 4–5 who are aiming for HSK 5. It is a static web app built with Vite and TypeScript. Progress is stored in the browser's localStorage. There is no backend and no accounts in v1.

## Word data
These are the agreed rules. All 1900 words are in `src/data/words.generated.json`, and every HSK 5 word has an example sentence in `src/data/examples.ts`.
- Exam version: **HSK 2.0** (six levels), using the **2012 revision** of the lists that the exam has used since 2012 (not the 2010 original). Each level lists only the words new at that level: HSK 4 has 600, HSK 5 has 1300.
- **HSK 5 is the study target.** Study sessions use HSK 5 words only.
- **HSK 4 is for Adventure battles only.** The user already knows HSK 4, so these words serve as review and warm-up fights.
- Every word needs hanzi, pinyin and an English meaning. HSK 5 words also need an example sentence and its English translation. HSK 4 words don't need an example.
- Which words are in each level: Hanban's official 2012 lists, as mirrored by hskhsk.com, in `data-sources/` (see `data-sources/SOURCE.md`). They are free for non-commercial use with credit to Alan Davies (hskhsk.com).
- Pinyin and meanings: CC-CEDICT, via complete-hsk-vocabulary. Where a word has several readings, the one in Hanban's list is used (recorded in `scripts/import-overrides.ts`). Pinyin uses dictionary tones (bùduàn, yīqiè), not the tone changes Hanban writes (búduàn, yíqiè).
- The app credits the word lists and CC-CEDICT on the Settings screen. Keep those credits.
- Never edit `src/data/words.generated.json` by hand. Change `scripts/import-overrides.ts` and run `npm run import-words`.
- Example sentences: written by Claude from its own knowledge, kept short and simple, and added without a per-batch approval. Never copy sentences from textbooks or other copyrighted sources. There is no word-level check (an HSK-list checker flagged too many good sentences and was dropped). `check-data` only checks the form (`scripts/sentence-lib.ts`):
  - the sentence contains its word, unbroken (keep separable words like 洗澡 together)
  - at most 15 Chinese characters, ending with 。, ！ or ？, no Latin letters
  - a translation that starts with a capital letter and ends with . ! or ?
- One example per word for now. More may be added later for hard words.

## Commands
- `npm run dev`: start the dev server (http://localhost:5173)
- `npm test`: run unit tests (Vitest)
- `npm run check-data`: validate the word list and every example sentence
- `npm run check-data -- --strict`: same check, but also fails when a level is short or an HSK 5 word has no example (use before release)
- `npm run import-words`: rebuild `src/data/words.generated.json` from `data-sources/` and `scripts/import-overrides.ts`
- `npm run build`: type-check and build

On Windows PowerShell, use `npm.cmd` if `npm` is blocked by the execution policy.

## Structure
- `src/srs.ts`: SM-2 spaced repetition (pure, tested)
- `src/gamification.ts`: XP, levels, streaks, badges, flashcard XP by rating (pure, tested)
- `src/study.ts`: picks the words for a study session, HSK 5 only (pure, tested)
- `src/storage.ts`: localStorage wrapper with schema version 1 and shape checks
- `src/util.ts`: small shared helpers, such as `shuffle` (pure, tested)
- `src/data/words.ts`: word types, retired ids, and `WORDS` (the generated list joined with the examples)
- `src/data/words.generated.json`: all 1900 HSK 4 and 5 words with pinyin and meaning (generated, do not edit)
- `src/data/examples.ts`: hand-written example sentences for HSK 5 words, keyed by id
- `src/main.ts`: UI, screens and event handling
- `scripts/check-data.ts`: data validator; the sentence rules are in `scripts/sentence-lib.ts` (pure, tested)
- `scripts/import-words.ts`: the word import; its rules are in `scripts/import-lib.ts` (pure, tested) and hand decisions in `scripts/import-overrides.ts`
- `data-sources/`: downloaded raw data and `SOURCE.md` (where it came from, licenses)
- `.claude/agents/jarmil.md`: code-review subagent for this project

## Adventure mode
An RPG mode that sits alongside the study screens, not replacing them. Rules are in `src/adventure.ts` and the SVG art is in `src/art.ts`.
- Combat: quiz battles. Correct answers damage a monster; wrong answers cost HP.
- HP: refills daily and on level-up.
- Items: potions restore HP, hints remove two wrong answers, shields block one wrong answer.
- Answer options show their word's pinyin (in battles and in study multiple choice).
- Graphics: hand-drawn SVG monsters, items and battle screen, drawn in code.
- Keep combat, HP and item rules in pure modules with tests, like the existing logic.

## Conventions
- Keep scheduling, gamification and (later) combat logic pure and covered by tests. UI code only calls into them.
- Every localStorage access goes through `storage.ts` and is wrapped in try/catch.
- Progress is keyed by word `id`. Never reuse or renumber an id, or saved progress breaks.
- Follow the Word data rules above for every word and sentence. Check them with `npm run check-data`.
- Flashcard XP depends on the rating: again 0, hard 5, good 10, easy 12. Ratings are self-reported.
- Respect `prefers-reduced-motion` for any animation.
- Layout must work at 375px width.
- Keep the code readable for a beginner: short functions, clear names, and a comment where the reason isn't obvious.

## Starting a session
At the start of every session, Claude reads `HANDOFF.md` in the project root, if it exists, before doing anything else. It holds the state left by the previous session.

## Ending a session
When the user types `/handoff` (or asks to hand off), Claude follows the `handoff` skill to overwrite `HANDOFF.md`.

## Workflow with Claude
After finishing a coding task, Claude asks whether to run the **jarmil** reviewer. Run it only when the user says yes.

After jarmil reports, Claude lists its findings and asks whether to make the changes. Make changes only when the user says yes, and then rerun `npm test` and `npm run build`.

Claude does not commit or deploy without being asked.

## Open items
- Word data plan, in order:
  1. Done: record the Word data rules in this file.
  2. Done: study uses HSK 5 only (`src/study.ts`); `check-data` requires an example and `exampleMeaning` for HSK 5 only; the HSK 4 badge was removed.
  3. Done: Hanban's 2012 lists and the complete-hsk-vocabulary dictionary are in `data-sources/`, with `SOURCE.md` and the license. (A first download was the outdated 2010 list and was replaced.)
  4. Done: `npm run import-words` builds all 1900 words, keeps the 20 seed ids, and takes each reading from Hanban's list. Credits are on the Settings screen.
  5. Done: the sentence check runs in `check-data` (form only, rules in Word data above).
  6. Done: an example sentence for every HSK 5 word.
  7. Release check: `check-data --strict`, browser click-through, jarmil review.
- Browser check of the full session flow is still to do, including persistence after reload and the reset button.
- Check the layout at 375px width and the reduced-motion behavior in `style.css`. Jarmil did not cover these.
- Decide whether the XP rules need a recall check (typed answers) instead of self-rating.
