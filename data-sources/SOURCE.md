# Word list sources

Raw data for the import script (`npm run import-words`, see `scripts/import-words.ts`).
Do not edit these files by hand. To update them, download again from a pinned commit and note it here.

## Which words are in each level: the official HSK 2.0 lists (2012 revision)

| File | Words | Downloaded from |
|---|---|---|
| `hsk2012-level1.txt` | 150 | `data/lists/HSK Official 2012 L1.txt` |
| `hsk2012-level2.txt` | 152 | `data/lists/HSK Official 2012 L2.txt` |
| `hsk2012-level3.txt` | 302 | `data/lists/HSK Official 2012 L3.txt` |
| `hsk2012-level4.txt` | 600 | `data/lists/HSK Official 2012 L4.txt` |
| `hsk2012-level5.txt` | 1300 | `data/lists/HSK Official 2012 L5.txt` |
| `hsk2012-level6.txt` | 2500 | `data/lists/HSK Official 2012 L6.txt` |

- **What each list is for:**
  - Levels 4 and 5 are the app's words.
  - Levels 1–3 and 6 were downloaded for a word-level sentence check. That check was dropped, so no code reads them now; they are kept for reference.
- **Downloaded:** levels 4 and 5 on 2026-10-18, then levels 1, 2, 3 and 6 the same day, from the same commit.

- **Repository:** https://github.com/glxxyz/hskhsk.com (the data behind http://hskhsk.com/word-lists)
- **Commit:** `8a6f229c699e2fd7ac8708156c55c3afb2be7e1f` (2021-05-04)
- **Format:** one simplified word per line, in Hanban's pinyin order. Each file lists only the words new at that level.
- **Origin:** Hanban's official lists, published September 2012. hskhsk.com also mirrors Hanban's original Excel file (`data/lists/HSK-2012.xls`) if these ever need checking.
- **Terms:** the site's author, Alan Davies, allows copying and changing for **non-commercial** use, if he is credited. Commercial use needs his permission.

### Why the 2012 lists, not 2010

The first HSK 2.0 lists (2010) were revised in 2012, and the exam has used the 2012 lists since then. The revision moved about 110 words between levels 4 and 5 and swapped about 150 in or out. For example, 反映 moved from HSK 4 to HSK 5, 互联网 came into HSK 4, and 磁带 moved out to HSK 6. hskhsk.com has a table of every change: https://hskhsk.pythonanywhere.com/hskwords20102018

An earlier download in this folder was the 2010 list by mistake, and it was deleted.

## Pinyin and meanings: complete-hsk-vocabulary

| File | Entries | Downloaded from |
|---|---|---|
| `complete-hsk-vocabulary.json` | 11470 | `complete.json` |

- **Repository:** https://github.com/drkameleon/complete-hsk-vocabulary
- **Commit:** `7ac65bf1a6387d35f1ade478906172a19311c7f9` (2026-03-23)
- **Downloaded:** 2026-10-18
- **What it is:** every word from all HSK 2.0 and 3.0 lists, with readings (pinyin), meanings, traditional characters, part of speech and frequency. Only pinyin and meanings are used.
- **Coverage:** 1893 of the 1900 words. The other 7 (百分之, 弹钢琴, 冰激凌, 后背, 名胜古迹, 模特, 拼音) are entered by hand in `scripts/import-overrides.ts`.

## Licenses and credit

- **complete-hsk-vocabulary:** MIT license, copyright (c) 2026 Yanis Zafirópulos. The full text is in `LICENSE-complete-hsk-vocabulary.txt` and must stay with the data.
- **The meanings:** these come from CC-CEDICT, under the CC BY-SA 4.0 license (https://cc-cedict.org/wiki/). The app must credit CC-CEDICT, and meanings changed from it stay under CC BY-SA.
- **The word lists:** credit Alan Davies (hskhsk.com) and Hanban, and keep to non-commercial use.

The app shows these credits on the Settings screen.

## Readings: checked against Hanban's pinyin (consulted online, not stored)

The choices in `READINGS` (`scripts/import-overrides.ts`) were made on 2026-10-18 by comparing every word's pinyin with Hanban's own pinyin. These files were read online and not downloaded:

- `data/lists/HSK Official With Definitions 2012 L4.txt`
- `data/lists/HSK Official With Definitions 2012 L5.txt`

They come from the same repository and commit as the word lists above (glxxyz/hskhsk.com, `8a6f229c699e2fd7ac8708156c55c3afb2be7e1f`). Each line is tab-separated: simplified, traditional, numbered pinyin, pinyin with tone marks, and definition. Use the tone-marked pinyin (4th column) to check the readings again.

After the overrides, the only differences from Hanban's pinyin are deliberate:
- **Dictionary tones instead of tone changes:** bùduàn not búduàn, yīqiè not yíqiè.
- **Some neutral tones:** fùqīn not fùqin, mìshū not mìshu.
- **Words with two readings in Hanban's list:** the app shows only the first.
- **俩:** kept as liǎ. Hanban's file says liǎng, which looks like an error, because liǎ is the reading for "two (people)".

## Known limits

- **Several readings:** many words list more than one reading. For example, 成功's first entry is a town in Taiwan, and 当 can be dāng or dàng. The import skips names, surnames and "variant of" entries. Where real choices remain, `scripts/import-overrides.ts` records which reading the HSK list means.
- **Meaning cleanup:** the import drops slang, Taiwan-only, dialect and sound-word senses and pronunciation notes, and puts classical or literary senses last. Unclear meanings get a hand-written replacement in `MEANINGS`.
