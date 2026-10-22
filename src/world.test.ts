import { describe, expect, it } from "vitest";
import {
  MONSTERS,
  REGIONS,
  isMonsterUnlocked,
  isRegionUnlocked,
  latestUnlockedRegion,
  monsterById,
  regionMonsters,
  regionOf,
  unlockMessages,
} from "./world";

const [village, forest, mountains, palace] = REGIONS;
const monster = (id: string) => monsterById(id)!;

describe("world data", () => {
  it("has unique monster and region ids", () => {
    expect(new Set(MONSTERS.map((m) => m.id)).size).toBe(MONSTERS.length);
    expect(new Set(REGIONS.map((r) => r.id)).size).toBe(REGIONS.length);
  });

  it("keeps the monster ids that older saves use", () => {
    for (const id of ["slime", "wolf", "dragon"]) expect(monsterById(id)).toBeDefined();
  });

  it("places every monster in exactly one region, matching its regionId", () => {
    for (const m of MONSTERS) {
      const homes = REGIONS.filter((r) => regionMonsters(r).includes(m));
      expect(homes).toEqual([regionOf(m)]);
    }
  });

  it("gives each region one boss, listed as its bossId", () => {
    for (const r of REGIONS) {
      const bosses = regionMonsters(r).filter((m) => m.boss);
      expect(bosses.map((m) => m.id)).toEqual([r.bossId]);
    }
  });

  it("only asks blank questions in HSK 5 regions, which have example sentences", () => {
    for (const r of REGIONS) {
      if (r.questionTypes.includes("blank")) expect(r.level).toBe(5);
    }
  });

  it("gives every monster positive HP, XP and gold", () => {
    for (const m of MONSTERS) {
      expect(m.hp).toBeGreaterThan(0);
      expect(m.xp).toBeGreaterThan(0);
      expect(m.gold).toBeGreaterThan(0);
    }
  });
});

describe("unlocking", () => {
  it("starts with only the first region open", () => {
    expect(REGIONS.map((r) => isRegionUnlocked(r, []))).toEqual([true, false, false, false]);
    expect(latestUnlockedRegion([])).toBe(village);
  });

  it("opens the next region when the previous boss is defeated", () => {
    const defeated = ["slime", "wolf", "tiger"];
    expect(isRegionUnlocked(forest, defeated)).toBe(true);
    expect(isRegionUnlocked(mountains, defeated)).toBe(false);
    expect(latestUnlockedRegion(defeated)).toBe(forest);
  });

  it("locks a boss until the other monsters in its region are beaten", () => {
    expect(isMonsterUnlocked(monster("tiger"), [])).toBe(false);
    expect(isMonsterUnlocked(monster("tiger"), ["slime"])).toBe(false);
    expect(isMonsterUnlocked(monster("tiger"), ["slime", "wolf"])).toBe(true);
  });

  it("locks every monster in a locked region", () => {
    expect(isMonsterUnlocked(monster("fox"), [])).toBe(false);
    expect(isMonsterUnlocked(monster("fox"), ["tiger"])).toBe(true);
  });

  it("keeps a save from before the map playable: a beaten dragon opens its region and the next", () => {
    const oldSave = ["slime", "wolf", "dragon"];
    expect(isMonsterUnlocked(monster("dragon"), oldSave)).toBe(true);
    expect(isRegionUnlocked(mountains, oldSave)).toBe(true);
    expect(isRegionUnlocked(palace, oldSave)).toBe(true);
    expect(isRegionUnlocked(forest, oldSave)).toBe(false);
    expect(latestUnlockedRegion(oldSave)).toBe(palace);
  });
});

describe("unlock messages", () => {
  it("announces a boss once the other monsters in its region are beaten", () => {
    expect(unlockMessages(["slime"], ["slime", "wolf"])).toEqual(["The Paper Tiger awaits you!"]);
  });

  it("announces the next region after its boss falls", () => {
    expect(unlockMessages(["slime", "wolf"], ["slime", "wolf", "tiger"])).toEqual(["New region unlocked: Misty Forest!"]);
  });

  it("says nothing when nothing new opened", () => {
    expect(unlockMessages([], ["slime"])).toEqual([]);
    expect(unlockMessages(["slime"], ["slime"])).toEqual([]);
  });
});
