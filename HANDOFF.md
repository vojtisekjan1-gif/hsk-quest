# Handoff: HSK Quest

## What changed
- Dropped the word-level sentence checker at the user's request. `scripts/sentence-lib.ts` now checks the form only (word present, ≤15 chars, end punctuation, no Latin letters, translation format). The HSK 1–3 and 6 lists in `data-sources/` are kept but unused.
- Wrote example sentences for every HSK 5 word, now 1300 of 1300 (h5-110 to h5-1303 added). The user doesn't approve each batch, and CLAUDE.md now says so.
- Study sessions are in random order. Due reviews go first and new words fill the rest (`src/study.ts`, using `shuffle` from `src/util.ts`).
- Multiple-choice options (battles and study) show the pinyin of each option's own word (`Choice` in `src/adventure.ts`, `choiceLabel` in `src/main.ts`).
- The Hint item now removes two wrong answers (`choicesAfterHint`). It used to reveal pinyin, which gave the answer away once options showed pinyin.
- Fixed 23 meanings in `MEANINGS` (`scripts/import-overrides.ts`) where CC-CEDICT gave a rare sense first, e.g. 便, 朝, 布, 克 (gram), 闻 (to smell), measure words 所/首/支/套/项. Ran `npm run import-words`.
- Ran jarmil on the day's work. All of its findings were fixed, including the duplicate `shuffle` and the 组合/划/针对 examples.
- Phone access works over home Wi-Fi: `npm.cmd run dev -- --host`, then http://10.0.1.13:5173. The PC's network had to be switched to Private, because the firewall blocks Node.js on Public.

## Status
- Tests: 120 of 120 pass (`npm test`).
- Build: passes (≈103 KB gzipped JS).
- check-data --strict: passes. 600 HSK 4, 1300 HSK 5, 1300 of 1300 examples.
- Browser: checked that new examples load, that sessions start with random words, and the battle screen at 375px (option pinyin readable on the green/red answers, no horizontal scroll). Also checked that Hint leaves 2 options including the correct one. The user ran it on their phone.
- Not checked: the full study session flow with persistence after reload and the reset button, reduced motion, and the full battle win/loss flow.
- No person has read through the 1194 new sentences. Jarmil spot-checked about 120.
- Nothing is committed. There's no git repo.

## Open review findings
- None open. Jarmil has not reviewed the fixes made after its report (the Hint change and the 20 extra meanings).

## Open decisions
- One example per word for now. The user hasn't said whether hard words should get more.
- Whether XP needs a recall check (typed answers) instead of self-rating.
- 14 words have two readings in Hanban's list, and the app shows only the first.

## Next steps
1. Small bug: the Study tab says "Nothing due right now" when opened before "Start session" on Home, even when words are due. Make it start a session or show the due count.
2. Release check (step 7): browser click-through of a full study session (persistence after reload, reset button), the battle win/loss flow, reduced motion, and a jarmil review of the latest fixes.
3. Optionally scan the other HSK 5 meanings for more rare-first CC-CEDICT senses, like the 23 fixed this session.
