// Decisions a person made for the word import. The import reads these and never
// changes this file. Keys are simplified characters as they appear in the HSK lists.

// Which reading the HSK list means, for words with more than one real reading.
// Pinyin is written joined, as the app shows it (for example "dàng").
// The import lists every word with other readings that is not decided here yet.
//
// Decided on 2026-10-18 from the pinyin in Hanban's 2012 lists (hskhsk.com,
// "HSK Official With Definitions 2012 L4/L5.txt"). Where Hanban gives two readings
// (marked "both"), the app shows the first one. Tone changes that Hanban writes
// (bú, yí) and some neutral tones (mìshu, fùqin) are not copied: the app uses
// dictionary tones, like bùduàn, yīqiè, mìshū and fùqīn.
export const READINGS: Record<string, string> = {
  // A different reading from the dictionary's first choice
  场: "chǎng",
  大夫: "dàifu",
  得: "de",
  底: "dǐ",
  好处: "hǎochu",
  结果: "jiéguǒ",
  弄: "nòng",
  生意: "shēngyi",
  汤: "tāng",
  趟: "tàng", // both: tàng, tāng
  行: "xíng",
  页: "yè",
  脏: "zāng",
  重: "zhòng",
  重点: "zhòngdiǎn",
  唉: "ài",
  称: "chēng",
  大方: "dàfang",
  地道: "dìdao",
  划: "huà", // both: huà, huá
  结实: "jiēshi",
  精神: "jīngshen",
  匹: "pǐ",
  片: "piàn", // both: piàn, piān
  浅: "qiǎn",
  抢: "qiǎng", // both: qiǎng, qiāng
  圈: "quān",
  数: "shù", // both: shù, shǔ
  吓: "xià",
  占: "zhàn",
  正: "zhèng",
  追: "zhuī",
  // The dictionary's first choice is right (Hanban agrees)
  当: "dāng",
  当时: "dāngshí",
  倒: "dǎo", // both: dǎo, dào
  干: "gān",
  假: "jiǎ", // both: jiǎ, jià
  空: "kōng", // both: kōng, kòng
  省: "shěng",
  与: "yǔ",
  转: "zhuǎn", // both: zhuǎn, zhuàn
  赚: "zhuàn",
  薄: "báo",
  背: "bēi",
  朝: "cháo",
  冲: "chōng",
  臭: "chòu",
  挡: "dǎng",
  哈: "hā",
  尽量: "jǐnliàng",
  嗯: "ēn",
  切: "qiē", // both: qiē, qiè
  土地: "tǔdì",
  吐: "tǔ", // both: tǔ, tù
  歪: "wāi",
  系: "xì", // both: xì, jì
  乙: "yǐ",
  晕: "yūn",
  涨: "zhǎng", // both: zhǎng, zhàng
};

// Pinyin written by hand, for the few words where no reading in the dictionary is right.
export const PINYIN: Record<string, string> = {
  系领带: "jìlǐngdài", // 系 is jì (to tie) here; the dictionary only has xì
  互联网: "hùliánwǎng", // the dictionary capitalizes it like the English "Internet"
  礼拜天: "lǐbàitiān", // a common noun (Sunday), not a name
  华裔: "huáyì", // a common noun (person of Chinese descent), not a name
  // Lowercase, like most dictionaries. Capitals stay only for real names (长城, 长江, 亚洲, 欧洲).
  京剧: "jīngjù",
  除夕: "chúxī",
  国庆节: "guóqìngjié",
  元旦: "yuándàn",
};

// Meanings written by hand instead of taken from CC-CEDICT.
export const MEANINGS: Record<string, string> = {
  // The 20 words of the first seed list. These meanings were reviewed by hand.
  成功: "success; to succeed",
  到底: "(what) on earth; after all; in the end",
  发展: "development; to develop",
  将来: "future",
  经验: "experience",
  标准: "standard; criterion",
  感情: "emotion; feeling",
  规定: "rule; to stipulate",
  安排: "to arrange; arrangement",
  判断: "to judge; judgment",
  保持: "to maintain; to keep",
  财产: "property; assets",
  产生: "to produce; to arise",
  充分: "sufficient; full",
  反映: "to reflect; to report",
  分析: "to analyze; analysis",
  功能: "function; feature",
  必要: "necessary",
  承担: "to take on (a responsibility)",
  观察: "to observe; observation",

  // The dictionary's meaning was too long, unclear or missing.
  词语: "word; expression",
  份: "portion; share; measure word for copies, gifts",
  厉害: "terrible; formidable; awesome",
  呀: "ah; oh (particle showing surprise)",
  以为: "to think (often wrongly); to assume",
  咱们: "we; us (including the listener)",
  成语: "idiom (usually of four characters)",
  大厦: "large building; mansion",
  纪录: "record (e.g. a world record)",
  颗: "measure word for small round things",
  录取: "to admit (a student or applicant)",
  则: "then; but (literary)",
  嗯: "um; uh-huh (sound of agreement)",
  得: "particle linking a verb to its result (跑得快)",
  甲: "first in order; A (as in A, B, C)",
  乙: "second in order; B (as in A, B, C)",
  在乎: "to care about; to mind",
  // The dictionary lists a rarer sense first.
  台: "platform; stage; measure word for machines",
  云: "cloud",
  当: "to be; to act as; when (something happens)",
  背: "to carry on one's back",
  行: "OK; all right; capable",
  倍: "times; -fold (as in three times as much)",
  // The dictionary's wording was confusing.
  够: "enough; sufficient; quite",
  秩序: "order (orderly arrangement)",
  哈: "ha! (laughter)",
  // The dictionary put a rare or old sense first, not the one HSK 5 learners
  // need (and the one the example sentence uses).
  便: "then; as soon as; convenient",
  朝: "towards; facing",
  布: "cloth; to announce",
  冲: "to rush; to dash; to rinse",
  丑: "ugly; clown",
  刺激: "exciting; to stimulate; to upset",
  呆: "stunned; dull; to stay",
  方: "square; side; direction",
  划: "to draw (a line); to mark; to plan",
  届: "measure word for sessions and graduating classes",
  克: "gram; to overcome",
  木头: "wood; log",
  派: "to send; to assign; group",
  批: "batch; to criticize; to approve",
  首: "measure word for songs and poems; head; first",
  所: "measure word for schools and houses; place",
  套: "set; suit; measure word for sets",
  团: "ball; lump; group",
  闻: "to smell; to hear",
  系: "department (of a university); to relate to",
  项: "measure word for tasks and items; item",
  摘: "to pick; to take off",
  支: "measure word for pens and songs; to support",
};

// Words in the HSK lists that the dictionary file does not have.
export const MISSING: Record<string, { pinyin: string; meaning: string }> = {
  百分之: { pinyin: "bǎifēnzhī", meaning: "percent" },
  弹钢琴: { pinyin: "tángāngqín", meaning: "to play the piano" },
  冰激凌: { pinyin: "bīngjīlíng", meaning: "ice cream" },
  后背: { pinyin: "hòubèi", meaning: "back (of the body)" },
  名胜古迹: { pinyin: "míngshènggǔjì", meaning: "famous sights and historic sites" },
  模特: { pinyin: "mótè", meaning: "(fashion) model" },
  拼音: { pinyin: "pīnyīn", meaning: "pinyin (Chinese romanization)" },
};
