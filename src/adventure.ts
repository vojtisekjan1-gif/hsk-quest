// Adventure mode rules: HP, items, gold, monster abilities and battles. Pure functions
// only, so the UI just calls these and shows the result. The regions and monsters
// are in world.ts, and the questions in questions.ts.

import type { AbilityId, Monster } from "./world";

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

// Gold prices in the shop.
export const SHOP_PRICES: Record<ItemId, number> = {
  potion: 15,
  hint: 10,
  shield: 12,
};

export type Items = Record<ItemId, number>;

export interface AdventureState {
  hp: number;
  hpDay: string | null; // calendar day HP was last restored
  items: Items;
  gold: number;
  defeated: string[]; // monster ids whose rewards have been claimed
}

export function emptyItems(): Items {
  return { potion: 0, hint: 0, shield: 0 };
}

export function emptyAdventure(): AdventureState {
  return { hp: MAX_HP, hpDay: null, items: emptyItems(), gold: 0, defeated: [] };
}

// A whole number of 0 or more, or 0 for anything else.
function count(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
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
  for (const id of ITEM_IDS) items[id] = count(rawItems[id]);

  const defeated = Array.isArray(source.defeated)
    ? [...new Set(source.defeated.filter((id): id is string => typeof id === "string"))]
    : [];

  return {
    hp,
    hpDay: typeof source.hpDay === "string" ? source.hpDay : null,
    items,
    // Saves from before the shop have no gold, so they start at 0.
    gold: count(source.gold),
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

// --- Shop -------------------------------------------------------------------

export function canBuy(adv: AdventureState, id: ItemId): boolean {
  return adv.gold >= SHOP_PRICES[id];
}

// Buys one item. Without enough gold, the state is returned unchanged.
export function buyItem(adv: AdventureState, id: ItemId): AdventureState {
  if (!canBuy(adv, id)) return adv;
  return {
    ...adv,
    gold: adv.gold - SHOP_PRICES[id],
    items: { ...adv.items, [id]: adv.items[id] + 1 },
  };
}

// --- Battles ----------------------------------------------------------------

export interface Battle {
  monsterHp: number;
  monsterMaxHp: number;
  abilities: AbilityId[]; // copied from the monster, so answer() needs only the battle
  armorUp: boolean; // an armored monster absorbs the first hit
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
    monsterMaxHp: monster.hp,
    abilities: [...monster.abilities],
    armorUp: monster.abilities.includes("armored"),
    playerHp,
    shieldUp: false,
    hintShown: false,
    answered: false,
    log: `A wild ${monster.name} appears!`,
    over: null,
  };
}

// Correct answers needed to win if you never miss: armor absorbs one extra.
// (A regenerating monster can need more, because it heals when you miss.)
export function answersNeeded(monster: Monster): number {
  return monster.hp + (monster.abilities.includes("armored") ? 1 : 0);
}

export function hasAbility(battle: Battle, id: AbilityId): boolean {
  return battle.abilities.includes(id);
}

// Veiled monsters hide the pinyin on the answer options.
export function hidesPinyin(battle: Battle): boolean {
  return hasAbility(battle, "veiled");
}

// HP a wrong answer costs: 2 against a fierce monster, otherwise 1.
export function missDamage(battle: Battle): number {
  return hasAbility(battle, "fierce") ? 2 : 1;
}

// A correct answer hits the monster for 1, unless its armor absorbs the hit.
// A wrong answer hurts you (see missDamage) and lets a regenerating monster heal 1,
// unless a shield is up. Once answered, the question stays closed until nextQuestion().
export function answer(battle: Battle, correct: boolean): Battle {
  if (battle.over || battle.answered) return battle;
  return correct ? hitMonster(battle) : missMonster(battle);
}

function hitMonster(battle: Battle): Battle {
  if (battle.armorUp) {
    return { ...battle, armorUp: false, answered: true, log: "Its armor absorbs the hit and breaks!" };
  }
  const monsterHp = battle.monsterHp - 1;
  return {
    ...battle,
    monsterHp,
    answered: true,
    log: "Direct hit!",
    over: monsterHp <= 0 ? "win" : null,
  };
}

function missMonster(battle: Battle): Battle {
  if (battle.shieldUp) {
    return { ...battle, shieldUp: false, answered: true, log: "Your shield blocked the hit!" };
  }

  const damage = missDamage(battle);
  const playerHp = battle.playerHp - damage;
  const heals = hasAbility(battle, "regen") && battle.monsterHp < battle.monsterMaxHp;
  const monsterHp = heals ? battle.monsterHp + 1 : battle.monsterHp;

  let log = damage > 1 ? `A fierce blow! You lose ${damage} HP.` : "The monster strikes back!";
  if (heals) log += " It heals 1.";

  return {
    ...battle,
    playerHp,
    monsterHp,
    answered: true,
    log,
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

// --- Rewards ----------------------------------------------------------------

export interface Settlement {
  adv: AdventureState;
  xp: number; // XP to award now
  reward: string; // message for the player
}

// Gold for winning again against a monster you have already beaten:
// a fifth of the first-win gold, and at least 1.
export function practiceGold(monster: Monster): number {
  return Math.max(1, Math.round(monster.gold / 5));
}

// Applies the end of a battle. The first win against a monster gives XP and gold,
// and a boss also drops an item. Later wins give a little gold. Losing sends you
// to rest at REST_HP and costs nothing else.
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
    const gold = practiceGold(monster);
    return {
      adv: { ...base, gold: adv.gold + gold },
      xp: 0,
      reward: `Victory! Practice fights give +${gold} gold.`,
    };
  }

  const firstWin = { ...base, gold: adv.gold + monster.gold, defeated: [...adv.defeated, monster.id] };
  if (!monster.boss) {
    return { adv: firstWin, xp: monster.xp, reward: `Victory! +${monster.xp} XP and +${monster.gold} gold.` };
  }

  const item = randomItem(rng);
  return {
    adv: { ...firstWin, items: { ...adv.items, [item]: adv.items[item] + 1 } },
    xp: monster.xp,
    reward: `Boss defeated! +${monster.xp} XP, +${monster.gold} gold and a ${ITEM_NAMES[item]}.`,
  };
}

// Picks a random item for a boss reward.
export function randomItem(rng: () => number = Math.random): ItemId {
  return ITEM_IDS[Math.floor(rng() * ITEM_IDS.length)];
}
