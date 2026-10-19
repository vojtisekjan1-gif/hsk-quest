import { describe, expect, it } from "vitest";
import {
  HINT_REMOVES,
  MAX_HP,
  MONSTERS,
  REST_HP,
  answer,
  canUseItem,
  choicesAfterHint,
  emptyAdventure,
  emptyItems,
  makeQuestion,
  nextQuestion,
  randomItem,
  refreshDailyHp,
  refreshForDay,
  sanitizeAdventure,
  settleBattle,
  startBattle,
  useItem,
  type Items,
} from "./adventure";
import type { Word } from "./data/words";

const slime = MONSTERS[0];
const items = (overrides: Partial<Items> = {}): Items => ({ ...emptyItems(), ...overrides });

// Answers correctly until the battle ends, moving to the next question each time.
function winBattle() {
  let b = startBattle(slime, MAX_HP);
  while (!b.over) b = answer(nextQuestion(b), true);
  return b;
}

describe("battles", () => {
  it("a correct answer damages the monster by 1", () => {
    const b = answer(startBattle(slime, MAX_HP), true);
    expect(b.monsterHp).toBe(slime.hp - 1);
    expect(b.playerHp).toBe(MAX_HP);
  });

  it("a wrong answer costs the player 1 HP", () => {
    const b = answer(startBattle(slime, MAX_HP), false);
    expect(b.playerHp).toBe(MAX_HP - 1);
    expect(b.monsterHp).toBe(slime.hp);
  });

  it("only one answer counts per question", () => {
    const once = answer(startBattle(slime, MAX_HP), true);
    expect(answer(once, true)).toBe(once);
  });

  it("the next question reopens the answer", () => {
    const answered = answer(startBattle(slime, MAX_HP), true);
    expect(nextQuestion(answered).answered).toBe(false);
  });

  it("the battle is won when the monster reaches 0 HP", () => {
    expect(winBattle().over).toBe("win");
  });

  it("the battle is lost when the player reaches 0 HP", () => {
    let b = startBattle(slime, 2);
    b = answer(b, false);
    b = answer(nextQuestion(b), false);
    expect(b.over).toBe("lose");
  });

  it("nothing changes after the battle is over", () => {
    const won = winBattle();
    expect(answer(nextQuestion(won), false)).toEqual(won);
  });
});

describe("items", () => {
  it("a shield blocks exactly one wrong answer", () => {
    const start = startBattle(slime, MAX_HP);
    const shielded = useItem(start, items({ shield: 1 }), "shield");
    let b = answer(shielded.battle, false);
    expect(b.playerHp).toBe(MAX_HP);
    expect(b.shieldUp).toBe(false);
    b = answer(nextQuestion(b), false);
    expect(b.playerHp).toBe(MAX_HP - 1);
  });

  it("a potion heals 5 HP but never above the maximum", () => {
    const hurt = startBattle(slime, MAX_HP - 2);
    const healed = useItem(hurt, items({ potion: 1 }), "potion");
    expect(healed.battle.playerHp).toBe(MAX_HP);
    expect(healed.items.potion).toBe(0);
    const low = useItem({ ...hurt, playerHp: 3 }, items({ potion: 1 }), "potion");
    expect(low.battle.playerHp).toBe(8);
  });

  it("a hint is shown and used up", () => {
    const hinted = useItem(startBattle(slime, MAX_HP), items({ hint: 1 }), "hint");
    expect(hinted.battle.hintShown).toBe(true);
    expect(hinted.items.hint).toBe(0);
  });

  it("a hint writes its own log line instead of repeating the last one", () => {
    const answered = answer(startBattle(slime, MAX_HP), true);
    const hinted = useItem(nextQuestion(answered), items({ hint: 1 }), "hint");
    expect(hinted.battle.log).toBe("A hint removes two wrong answers.");
  });

  it("a hint cannot be used after the question is answered", () => {
    const answered = answer(startBattle(slime, MAX_HP), true);
    expect(canUseItem(answered, items({ hint: 1 }), "hint")).toBe(false);
  });

  it("an item with none left cannot be used", () => {
    const start = startBattle(slime, MAX_HP);
    expect(canUseItem(start, items(), "shield")).toBe(false);
    const result = useItem(start, items(), "shield");
    expect(result.battle).toBe(start);
  });

  it("a potion is useless at full HP", () => {
    expect(canUseItem(startBattle(slime, MAX_HP), items({ potion: 1 }), "potion")).toBe(false);
  });

  it("the random reward is one of the three items", () => {
    expect(randomItem(() => 0)).toBe("potion");
    expect(randomItem(() => 0.5)).toBe("hint");
    expect(randomItem(() => 0.99)).toBe("shield");
  });
});

describe("rewards", () => {
  const fresh = emptyAdventure();

  it("the first win gives XP and an item and marks the monster defeated", () => {
    const result = settleBattle(winBattle(), fresh, slime, () => 0);
    expect(result.xp).toBe(slime.xp);
    expect(result.adv.defeated).toEqual([slime.id]);
    expect(result.adv.items.potion).toBe(1);
  });

  it("practice wins give no XP and no item", () => {
    const beaten = { ...fresh, defeated: [slime.id] };
    const result = settleBattle(winBattle(), beaten, slime, () => 0);
    expect(result.xp).toBe(0);
    expect(result.adv.items).toEqual(emptyItems());
  });

  it("a loss sends you to rest at REST_HP with no rewards", () => {
    const lost = { ...startBattle(slime, 1), playerHp: 0, over: "lose" as const };
    const result = settleBattle(lost, fresh, slime);
    expect(result.adv.hp).toBe(REST_HP);
    expect(result.xp).toBe(0);
    expect(result.adv.defeated).toEqual([]);
  });
});

describe("saved data", () => {
  it("keeps valid data", () => {
    const adv = { ...emptyAdventure(), hp: 12, hpDay: "2026-10-18", items: items({ shield: 2 }), defeated: ["slime"] };
    expect(sanitizeAdventure(adv)).toEqual(adv);
  });

  it("replaces broken values with safe defaults", () => {
    const fixed = sanitizeAdventure({
      hp: "lots",
      items: { potion: -3, hint: "two", shield: 1.7 },
      defeated: ["slime", 42, "slime"],
    });
    expect(fixed.hp).toBe(MAX_HP);
    expect(fixed.items).toEqual(items({ shield: 1 }));
    expect(fixed.defeated).toEqual(["slime"]);
  });

  it("clamps HP to the valid range", () => {
    expect(sanitizeAdventure({ hp: 999 }).hp).toBe(MAX_HP);
    expect(sanitizeAdventure({ hp: 3.9 }).hp).toBe(3);
  });

  it("treats saved HP of 0 or less as resting HP, so fights are not locked", () => {
    expect(sanitizeAdventure({ hp: 0 }).hp).toBe(REST_HP);
    expect(sanitizeAdventure({ hp: -5 }).hp).toBe(REST_HP);
    expect(sanitizeAdventure({ hp: 0.5 }).hp).toBe(REST_HP);
  });

  it("falls back to defaults for unusual saved values", () => {
    expect(sanitizeAdventure({ hp: Infinity }).hp).toBe(MAX_HP);
    expect(sanitizeAdventure({ hp: NaN }).hp).toBe(MAX_HP);
    expect(sanitizeAdventure({ hp: null }).hp).toBe(MAX_HP);
    expect(sanitizeAdventure({ hpDay: 20261018 }).hpDay).toBe(null);
    expect(sanitizeAdventure({ items: [5, 5, 5] }).items).toEqual(emptyItems());
    expect(sanitizeAdventure({ items: null }).items).toEqual(emptyItems());
    expect(sanitizeAdventure({ items: { potion: Infinity } }).items.potion).toBe(0);
    expect(sanitizeAdventure({ defeated: { 0: "slime" } }).defeated).toEqual([]);
    expect(sanitizeAdventure(null)).toEqual(emptyAdventure());
    expect(sanitizeAdventure([1, 2])).toEqual(emptyAdventure());
  });

  it("returns defaults for missing or non-object data", () => {
    expect(sanitizeAdventure(undefined)).toEqual(emptyAdventure());
    expect(sanitizeAdventure("junk")).toEqual(emptyAdventure());
  });
});

describe("daily HP", () => {
  it("restores HP once per new day", () => {
    const adv = { ...emptyAdventure(), hp: 4, hpDay: "2026-10-17" };
    expect(refreshDailyHp(adv, "2026-10-17").hp).toBe(4);
    expect(refreshDailyHp(adv, "2026-10-18").hp).toBe(MAX_HP);
  });
});

describe("questions", () => {
  const word = (n: number, meaning: string): Word => ({
    id: `test-${n}`,
    hanzi: `字${n}`,
    pinyin: "x",
    meaning,
    example: "x",
    level: 4,
  });

  const meanings = (q: { choices: { meaning: string }[] }) => q.choices.map((c) => c.meaning);

  it("includes the correct meaning exactly once with 4 options", () => {
    const pool = [1, 2, 3, 4, 5].map((n) => word(n, `meaning ${n}`));
    const q = makeQuestion(pool[0], pool);
    expect(q.choices).toHaveLength(4);
    expect(meanings(q).filter((m) => m === pool[0].meaning)).toHaveLength(1);
    expect(new Set(meanings(q)).size).toBe(4);
  });

  it("never shows the same meaning twice, even when the pool repeats meanings", () => {
    const pool = [word(1, "same"), word(2, "same"), word(3, "same"), word(4, "other"), word(5, "third")];
    const q = makeQuestion(pool[0], pool);
    expect(new Set(meanings(q)).size).toBe(q.choices.length);
  });

  it("a hint removes two wrong answers and keeps the correct one", () => {
    const pool = [1, 2, 3, 4, 5].map((n) => word(n, `meaning ${n}`));
    const q = makeQuestion(pool[0], pool);
    const left = meanings({ choices: choicesAfterHint(q) });
    expect(left).toHaveLength(q.choices.length - HINT_REMOVES);
    expect(left).toContain(pool[0].meaning);
  });

  it("a hint never removes the correct answer, even with few options", () => {
    const pool = [word(1, "right"), word(2, "wrong")];
    const q = makeQuestion(pool[0], pool);
    expect(meanings({ choices: choicesAfterHint(q) })).toEqual(["right"]);
  });

  it("gives each option the pinyin of the word it belongs to", () => {
    const pool = [1, 2, 3, 4, 5].map((n) => ({ ...word(n, `meaning ${n}`), pinyin: `pin${n}` }));
    for (const choice of makeQuestion(pool[0], pool).choices) {
      const owner = pool.find((w) => w.meaning === choice.meaning);
      expect(choice.pinyin).toBe(owner?.pinyin);
    }
  });
});

describe("extra rules", () => {
  it("moving to the next question hides the hint again", () => {
    const hinted = useItem(startBattle(slime, MAX_HP), items({ hint: 1 }), "hint").battle;
    expect(nextQuestion(answer(hinted, true)).hintShown).toBe(false);
  });

  it("a shield cannot be raised after the question is answered", () => {
    const answered = answer(startBattle(slime, MAX_HP), false);
    expect(canUseItem(answered, items({ shield: 1 }), "shield")).toBe(false);
    const result = useItem(answered, items({ shield: 1 }), "shield");
    expect(result.battle).toBe(answered);
    expect(result.items.shield).toBe(1);
  });

  it("a shield stays up after a correct answer and blocks a later wrong one", () => {
    const shielded = useItem(startBattle(slime, MAX_HP), items({ shield: 1 }), "shield").battle;
    const afterHit = answer(shielded, true);
    expect(afterHit.shieldUp).toBe(true);
    const blocked = answer(nextQuestion(afterHit), false);
    expect(blocked.playerHp).toBe(MAX_HP);
    expect(blocked.shieldUp).toBe(false);
  });

  it("a shield can be raised again on the next question", () => {
    const answered = answer(startBattle(slime, MAX_HP), false);
    expect(canUseItem(nextQuestion(answered), items({ shield: 1 }), "shield")).toBe(true);
  });

  it("a second shield does nothing while one is already up", () => {
    const first = useItem(startBattle(slime, MAX_HP), items({ shield: 2 }), "shield");
    const second = useItem(first.battle, first.items, "shield");
    expect(second.items.shield).toBe(1);
    expect(second.battle).toBe(first.battle);
  });

  it("a player with no saved day gets a day stamp and full HP", () => {
    expect(refreshDailyHp(emptyAdventure(), "2026-10-18").hpDay).toBe("2026-10-18");
  });

  it("a word pool with fewer than four meanings gives fewer answer choices", () => {
    const word: Word = { id: "test-1", hanzi: "字", pinyin: "x", meaning: "only", example: "x", level: 4 };
    expect(makeQuestion(word, [word]).choices).toEqual([{ meaning: "only", pinyin: "x" }]);
  });
});

describe("day change during a battle", () => {
  const yesterday = { ...emptyAdventure(), hp: 4, hpDay: "2026-10-17" };

  it("restores saved HP and the battle's HP on a new day", () => {
    const battle = { ...startBattle(slime, 4) };
    const result = refreshForDay(yesterday, battle, "2026-10-18");
    expect(result.adv.hp).toBe(MAX_HP);
    expect(result.battle?.playerHp).toBe(MAX_HP);
  });

  it("changes nothing on the same day", () => {
    const today = { ...yesterday, hpDay: "2026-10-18" };
    const battle = startBattle(slime, 4);
    const result = refreshForDay(today, battle, "2026-10-18");
    expect(result.adv).toBe(today);
    expect(result.battle).toBe(battle);
  });

  it("leaves a finished battle alone", () => {
    const over = { ...startBattle(slime, 0), over: "lose" as const };
    const result = refreshForDay(yesterday, over, "2026-10-18");
    expect(result.battle).toBe(over);
  });
});
