// The Adventure world: regions, their monsters and the order they unlock in.
// Pure data and functions only. Battle rules are in adventure.ts.

import type { HskLevel } from "./data/words";
import type { QuestionType } from "./questions";

// Special rules a monster can bring to a fight (applied in adventure.ts).
export type AbilityId = "fierce" | "armored" | "regen" | "veiled";

export const ABILITIES: Record<AbilityId, { name: string; description: string }> = {
  fierce: { name: "Fierce", description: "Wrong answers cost 2 HP." },
  armored: { name: "Armored", description: "Its armor blocks your first hit." },
  regen: { name: "Regenerates", description: "Heals 1 when you miss." },
  veiled: { name: "Veiled", description: "Hides the pinyin on the answers." },
};

export interface Monster {
  id: string; // saved in AdventureState.defeated, so never rename or reuse one
  name: string;
  regionId: string;
  boss: boolean;
  hp: number; // correct answers needed to defeat it
  xp: number; // XP reward for the first win
  gold: number; // gold reward for the first win
  abilities: AbilityId[];
}

export interface Region {
  id: string;
  name: string;
  level: HskLevel; // which HSK level its questions come from
  questionTypes: QuestionType[]; // the kinds of question its monsters ask
  monsterIds: string[]; // the normal monsters, in the order they are shown
  bossId: string; // unlocks once every normal monster here is defeated
}

export const MONSTERS: Monster[] = [
  // Bamboo Village
  { id: "slime", name: "Pinyin Slime", regionId: "village", boss: false, hp: 3, xp: 20, gold: 10, abilities: [] },
  { id: "wolf", name: "Tone Wolf", regionId: "village", boss: false, hp: 5, xp: 35, gold: 15, abilities: [] },
  { id: "tiger", name: "Paper Tiger", regionId: "village", boss: true, hp: 7, xp: 50, gold: 30, abilities: ["fierce"] },
  // Misty Forest
  { id: "fox", name: "Fox Spirit", regionId: "forest", boss: false, hp: 5, xp: 40, gold: 15, abilities: ["veiled"] },
  { id: "turtle", name: "Stone Turtle", regionId: "forest", boss: false, hp: 6, xp: 45, gold: 20, abilities: ["armored"] },
  { id: "nian", name: "Nian Beast", regionId: "forest", boss: true, hp: 9, xp: 70, gold: 40, abilities: ["fierce", "regen"] },
  // Jade Mountains
  { id: "crane", name: "Riddle Crane", regionId: "mountains", boss: false, hp: 6, xp: 50, gold: 20, abilities: ["veiled"] },
  { id: "bat", name: "Ink Bat", regionId: "mountains", boss: false, hp: 6, xp: 50, gold: 20, abilities: ["fierce"] },
  { id: "dragon", name: "Character Dragon", regionId: "mountains", boss: true, hp: 10, xp: 80, gold: 50, abilities: ["fierce", "armored"] },
  // Imperial Palace
  { id: "guard", name: "Terracotta Guard", regionId: "palace", boss: false, hp: 7, xp: 60, gold: 25, abilities: ["armored"] },
  { id: "mirror", name: "Mirror Spirit", regionId: "palace", boss: false, hp: 7, xp: 60, gold: 25, abilities: ["regen"] },
  { id: "emperor", name: "Shadow Emperor", regionId: "palace", boss: true, hp: 12, xp: 100, gold: 60, abilities: ["veiled", "regen"] },
];

// In unlock order. Each region opens once the boss of the one before it is defeated.
export const REGIONS: Region[] = [
  { id: "village", name: "Bamboo Village", level: 4, questionTypes: ["meaning"], monsterIds: ["slime", "wolf"], bossId: "tiger" },
  { id: "forest", name: "Misty Forest", level: 4, questionTypes: ["meaning", "hanzi"], monsterIds: ["fox", "turtle"], bossId: "nian" },
  { id: "mountains", name: "Jade Mountains", level: 5, questionTypes: ["meaning", "hanzi", "pinyin"], monsterIds: ["crane", "bat"], bossId: "dragon" },
  // "blank" needs example sentences, which only HSK 5 words have.
  { id: "palace", name: "Imperial Palace", level: 5, questionTypes: ["meaning", "hanzi", "pinyin", "blank"], monsterIds: ["guard", "mirror"], bossId: "emperor" },
];

export function monsterById(id: string): Monster | undefined {
  return MONSTERS.find((m) => m.id === id);
}

export function regionById(id: string): Region | undefined {
  return REGIONS.find((r) => r.id === id);
}

// The region a monster lives in. Every monster has one (world.test.ts checks this).
export function regionOf(monster: Monster): Region {
  return regionById(monster.regionId)!;
}

// The monsters of a region: the normal ones first, then the boss.
export function regionMonsters(region: Region): Monster[] {
  return [...region.monsterIds, region.bossId].map((id) => monsterById(id)!);
}

// A region opens once the boss of the region before it is defeated. A region where
// you already beat a monster also stays open: saves from before the map existed
// may have beaten the Character Dragon without ever meeting the bosses before it.
export function isRegionUnlocked(region: Region, defeated: string[]): boolean {
  const index = REGIONS.indexOf(region);
  if (index <= 0) return true;
  if (defeated.includes(REGIONS[index - 1].bossId)) return true;
  return regionMonsters(region).some((m) => defeated.includes(m.id));
}

// A boss waits until the other monsters in its region are beaten. A monster you
// have already beaten always stays open, so older saves keep their practice fights.
export function isMonsterUnlocked(monster: Monster, defeated: string[]): boolean {
  if (defeated.includes(monster.id)) return true;
  const region = regionOf(monster);
  if (!isRegionUnlocked(region, defeated)) return false;
  if (!monster.boss) return true;
  return region.monsterIds.every((id) => defeated.includes(id));
}

// The furthest region the player can enter: where the map opens.
export function latestUnlockedRegion(defeated: string[]): Region {
  const open = REGIONS.filter((r) => isRegionUnlocked(r, defeated));
  return open[open.length - 1];
}

// Messages for what a win just opened up: a new region, or a boss that now
// accepts a challenge. `before` and `after` are the defeated lists around the win.
export function unlockMessages(before: string[], after: string[]): string[] {
  const messages: string[] = [];
  for (const region of REGIONS) {
    if (!isRegionUnlocked(region, before) && isRegionUnlocked(region, after)) {
      messages.push(`New region unlocked: ${region.name}!`);
    }
    const boss = monsterById(region.bossId)!;
    if (!isMonsterUnlocked(boss, before) && isMonsterUnlocked(boss, after)) {
      messages.push(`The ${boss.name} awaits you!`);
    }
  }
  return messages;
}
