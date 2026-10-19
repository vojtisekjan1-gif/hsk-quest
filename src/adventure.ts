// Adventure mode rules: HP, items, monsters and battles. Pure functions only,
// so the UI just calls these and shows the result.

import type { Word } from "./data/words";
import { shuffle } from "./util";

export const MAX_HP = 20;
export const POTION_HEAL = 5;
export const REST_HP = 5; // HP you wake up with after losing a battle

export type ItemId = "potion" | "hint" | "shield";
export const ITEM_IDS: ItemId[] = ["potion", "hint", "shield"];
export const ITEM_NAMES: Record<ItemId, string> = {
  potion: "Potion",
  hint: "Hint",
  shield: "Shield",
};

export interface Monster {
  id: string;
  name: string;
  level: 4 | 5; // which HSK level its questions come from
  hp: number; // correct answers needed to defeat it
  xp: number; // XP reward for the first win
}

export const MONSTERS: Monster[] = [
  { id: "slime", name: "Pinyin Slime", level: 4, hp: 3, xp: 20 },
  { id: "wolf", name: "Tone Wolf", level: 4, hp: 5, xp: 35 },
  { id: "dragon", name: "Character Dragon", level: 5, hp: 8, xp: 60 },
];

export type Items = Record<ItemId, number>;

export interface AdventureState {
  hp: number;
  hpDay: string | null; // calendar day HP was last restored
  items: Items;
  defeated: string[]; // monster ids whose rewards have been claimed
}

export function emptyItems(): Items {
  return { potion: 0, hint: 0, shield: 0 };
}

export function emptyAdventure(): AdventureState {
  return { hp: MAX_HP, hpDay: null, items: emptyItems(), defeated: [] };
}

// Turns saved data of unknown shape into a valid AdventureState.
// Bad values fall back to defaults, so corrupted saves can't break the UI.
export function sanitizeAdventure(raw: unknown): AdventureState {
  const source = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const savedHp = typeof source.hp === "number" && Number.isFinite(source.hp)
    ? Math.min(MAX_HP, Math.floor(source.hp))
    : MAX_HP;
  // The game never saves 0 HP (a loss leaves you at REST_HP), so 0 or less means a
  // broken save. Resting keeps it from locking every fight until midnight.
  const hp = savedHp <= 0 ? REST_HP : savedHp;

  const rawItems = (typeof source.items === "object" && source.items !== null ? source.items : {}) as Record<string, unknown>;
  const items = emptyItems();
  for (const id of ITEM_IDS) {
    const count = rawItems[id];
    items[id] = typeof count === "number" && Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  }

  const defeated = Array.isArray(source.defeated)
    ? [...new Set(source.defeated.filter((id): id is string => typeof id === "string"))]
    : [];

  return {
    hp,
    hpDay: typeof source.hpDay === "string" ? source.hpDay : null,
    items,
    defeated,
  };
}

// HP is restored once per calendar day.
export function refreshDailyHp(adv: AdventureState, today: string): AdventureState {
  if (adv.hpDay === today) return adv;
  return { ...adv, hp: MAX_HP, hpDay: today };
}

// Applies the daily refresh to saved HP and to a battle that is still going,
// so the battle never writes the old HP back over the new one.
export function refreshForDay(
  adv: AdventureState,
  battle: Battle | null,
  today: string,
): { adv: AdventureState; battle: Battle | null } {
  const refreshed = refreshDailyHp(adv, today);
  if (refreshed === adv) return { adv, battle };
  const updatedBattle = battle && !battle.over ? { ...battle, playerHp: refreshed.hp } : battle;
  return { adv: refreshed, battle: updatedBattle };
}

// --- Battles ----------------------------------------------------------------

export interface Battle {
  monsterHp: number;
  playerHp: number;
  shieldUp: boolean; // blocks the next wrong answer
  hintShown: boolean; // removes two wrong answers from the current question
  answered: boolean; // true once the current question has been answered
  log: string;
  over: "win" | "lose" | null;
}

export function startBattle(monster: Monster, playerHp: number): Battle {
  return {
    monsterHp: monster.hp,
    playerHp,
    shieldUp: false,
    hintShown: false,
    answered: false,
    log: `A wild ${monster.name} appears!`,
    over: null,
  };
}

// A correct answer hits the monster for 1. A wrong answer hurts you for 1,
// unless a shield is up. Once answered, the question stays closed until nextQuestion().
export function answer(battle: Battle, correct: boolean): Battle {
  if (battle.over || battle.answered) return battle;

  if (correct) {
    const monsterHp = battle.monsterHp - 1;
    return {
      ...battle,
      monsterHp,
      answered: true,
      log: "Direct hit!",
      over: monsterHp <= 0 ? "win" : null,
    };
  }

  if (battle.shieldUp) {
    return { ...battle, shieldUp: false, answered: true, log: "Your shield blocked the hit!" };
  }

  const playerHp = battle.playerHp - 1;
  return {
    ...battle,
    playerHp,
    answered: true,
    log: "The monster strikes back!",
    over: playerHp <= 0 ? "lose" : null,
  };
}

export function nextQuestion(battle: Battle): Battle {
  if (battle.over) return battle;
  return { ...battle, answered: false, hintShown: false };
}

// Whether an item would do anything right now. Hints and shields only matter
// before the question is answered; potions only help when you are hurt.
export function canUseItem(battle: Battle, items: Items, id: ItemId): boolean {
  if (battle.over || items[id] <= 0) return false;
  if (id === "potion") return battle.playerHp < MAX_HP;
  if (battle.answered) return false;
  if (id === "hint") return !battle.hintShown;
  return !battle.shieldUp;
}

// Uses one item if it can help. Otherwise returns the inputs unchanged.
export function useItem(battle: Battle, items: Items, id: ItemId): { battle: Battle; items: Items } {
  if (!canUseItem(battle, items, id)) return { battle, items };

  let next: Battle;
  if (id === "potion") {
    next = { ...battle, playerHp: Math.min(MAX_HP, battle.playerHp + POTION_HEAL), log: "You drink a potion." };
  } else if (id === "hint") {
    next = { ...battle, hintShown: true, log: "A hint removes two wrong answers." };
  } else {
    next = { ...battle, shieldUp: true, log: "A shield protects you." };
  }
  return { battle: next, items: { ...items, [id]: items[id] - 1 } };
}

export interface Settlement {
  adv: AdventureState;
  xp: number; // XP to award now
  reward: string; // message for the player
}

// Applies the end of a battle. Rewards (XP and an item) are given only on the
// first win against each monster. Losing sends you to rest at REST_HP.
export function settleBattle(
  battle: Battle,
  adv: AdventureState,
  monster: Monster,
  rng: () => number = Math.random,
): Settlement {
  if (battle.over === "lose") {
    return {
      adv: { ...adv, hp: REST_HP },
      xp: 0,
      reward: `You were defeated. You rest and wake with ${REST_HP} HP.`,
    };
  }

  const base = { ...adv, hp: battle.playerHp };
  if (battle.over !== "win") return { adv: base, xp: 0, reward: "" };

  if (adv.defeated.includes(monster.id)) {
    return { adv: base, xp: 0, reward: "Victory! Practice fights give no rewards." };
  }

  const item = randomItem(rng);
  return {
    adv: {
      ...base,
      defeated: [...adv.defeated, monster.id],
      items: { ...adv.items, [item]: adv.items[item] + 1 },
    },
    xp: monster.xp,
    reward: `Victory! +${monster.xp} XP and a ${ITEM_NAMES[item]}.`,
  };
}

// --- Questions and rewards --------------------------------------------------

// One answer option: a meaning, with the pinyin of the word it belongs to.
export interface Choice {
  meaning: string;
  pinyin: string;
}

export interface Question {
  word: Word;
  choices: Choice[]; // shuffled, one of them correct
}

// Builds a multiple-choice question. Every option has a different meaning.
export function makeQuestion(word: Word, pool: Word[], rng: () => number = Math.random): Question {
  // Keep one word per meaning, so no meaning is shown twice.
  const byMeaning = new Map<string, Word>();
  for (const w of shuffle(pool, rng)) {
    if (w.meaning !== word.meaning && !byMeaning.has(w.meaning)) byMeaning.set(w.meaning, w);
  }
  const distractors = [...byMeaning.values()].slice(0, 3);
  const choices = shuffle([word, ...distractors], rng).map((w) => ({ meaning: w.meaning, pinyin: w.pinyin }));
  return { word, choices };
}

// How many wrong answers a hint removes.
export const HINT_REMOVES = 2;

// The options still on screen after a hint: the correct one and all but
// HINT_REMOVES wrong ones. The choices are already shuffled, so taking the
// first wrong ones is as good as a random pick, and it stays the same on re-render.
export function choicesAfterHint(question: Question): Choice[] {
  let removed = 0;
  return question.choices.filter((choice) => {
    if (choice.meaning === question.word.meaning || removed >= HINT_REMOVES) return true;
    removed++;
    return false;
  });
}

// Picks a random item for a battle reward.
export function randomItem(rng: () => number = Math.random): ItemId {
  return ITEM_IDS[Math.floor(rng() * ITEM_IDS.length)];
}
