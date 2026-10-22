import "./style.css";
import { WORDS, type Word } from "./data/words";
import { newCard, review, type CardState, type Rating } from "./srs";
import { STUDY_LEVEL, buildStudyQueue, dueStudyWords, studyWords } from "./study";
import {
  BADGES,
  DEFAULT_DAILY_GOAL,
  dayKey,
  earnedBadges,
  levelProgress,
  nextStreak,
  xpForAnswer,
  xpForRating,
} from "./gamification";
import { loadProgress, resetProgress, saveProgress, type Progress } from "./storage";
import {
  ITEM_IDS,
  ITEM_NAMES,
  MAX_HP,
  REST_HP,
  SHOP_PRICES,
  answer,
  answersNeeded,
  buyItem,
  canBuy,
  canUseItem,
  hidesPinyin,
  nextQuestion,
  practiceGold,
  refreshForDay,
  settleBattle,
  startBattle as beginBattle,
  useItem as applyItem,
  type Battle,
  type ItemId,
} from "./adventure";
import {
  ABILITIES,
  REGIONS,
  isMonsterUnlocked,
  isRegionUnlocked,
  latestUnlockedRegion,
  monsterById,
  regionById,
  regionMonsters,
  regionOf,
  unlockMessages,
  type Monster,
  type Region,
} from "./world";
import {
  BLANK,
  choicesAfterHint,
  isCorrect,
  makeQuestion,
  pickQuestionType,
  type Choice,
  type Question,
  type QuestionType,
} from "./questions";
import { coinSvg, heroSvg, itemSvg, monsterSvg, regionSvg } from "./art";
import { shuffle } from "./util";

type View = "home" | "study" | "adventure" | "words" | "achievements" | "settings";

// Refresh daily HP as soon as the app loads.
const initial = loadProgress();
initial.adventure = refreshForDay(initial.adventure, null, dayKey(new Date())).adv;

let progress: Progress = initial;
let view: View = "home";
let queue: Word[] = [];
let index = 0;
let revealed = false;
let sessionStreak = 0;
let sessionXp = 0;
let mcChoices: Choice[] = [];
let mcAnswered: string | null = null; // word id of the chosen option
let celebrate: string | null = null;

// Adventure battle state (kept in memory; HP and items are saved as they change).
let battleMonster: Monster | null = null;
let battle: Battle | null = null;
let battlePool: Word[] = [];
let battleIndex = 0;
let question: Question | null = null;
let battleChoice: string | null = null; // word id of the option the player picked for this question
let battleReward: string | null = null;
let mapRegion: Region | null = null; // the region open on the map; null means the latest unlocked one

// Makes sure HP is restored once per calendar day, even if the tab stayed open overnight.
function refreshAdventure(): void {
  const result = refreshForDay(progress.adventure, battle, today());
  if (result.adv === progress.adventure) return;
  progress.adventure = result.adv;
  battle = result.battle;
  persist();
}

// Tells screen readers about a result. The live region lives outside the redrawn screen.
// Clearing first and setting on the next tick makes a repeated message read out again.
// Messages sent in the same moment (a hit, the victory and a level-up) are joined into
// one, so a later message never overwrites an earlier one before it is read.
let pendingAnnouncements: string[] = [];

function announce(message: string): void {
  const region = document.getElementById("live");
  if (!region || !message) return;
  pendingAnnouncements.push(message);
  if (pendingAnnouncements.length > 1) return; // already scheduled
  region.textContent = "";
  setTimeout(() => {
    region.textContent = pendingAnnouncements.join(" ");
    pendingAnnouncements = [];
  }, 50);
}

// Shows a short toast and reads it out through the live region.
// If a toast is still showing (say a level-up and a badge on the same card),
// the new message is added to it, so neither one is hidden.
function showToast(message: string): void {
  if (!celebrate) celebrate = message;
  else if (!celebrate.includes(message)) celebrate = `${celebrate} · ${message}`;
  announce(message);
}

const app = document.getElementById("app")!;

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function persist(): void {
  saveProgress(progress);
}

function today(): string {
  return dayKey(new Date());
}

function xpToday(): number {
  return progress.xpToday.day === today() ? progress.xpToday.amount : 0;
}

function addXp(amount: number): void {
  if (amount <= 0) return;
  const before = levelProgress(progress.xp).level;
  progress.xp += amount;
  if (progress.xpToday.day !== today()) progress.xpToday = { day: today(), amount: 0 };
  progress.xpToday.amount += amount;
  const after = levelProgress(progress.xp).level;
  if (after > before) showToast(`Level ${after} reached!`);
}

function cardStateFor(word: Word): CardState {
  return progress.cards[word.id] ?? newCard(Date.now());
}

function wordStats() {
  const mastered = (w: Word) => (progress.cards[w.id]?.interval ?? 0) >= 21;
  const learned = (w: Word) => (progress.cards[w.id]?.reps ?? 0) >= 1;
  // Only studied words count, so old HSK 4 cards from before study became HSK 5 only
  // don't count toward badges.
  const study = studyWords(WORDS);
  return {
    wordsLearned: study.filter(learned).length,
    wordsMastered: study.filter(mastered).length,
    hsk5Mastered: study.filter(mastered).length,
    hsk5Total: study.length,
    streak: progress.streak,
  };
}

function refreshBadges(): void {
  const earned = earnedBadges(wordStats());
  const fresh = earned.filter((id) => !progress.badges.includes(id));
  if (fresh.length) {
    const name = BADGES.find((b) => b.id === fresh[0])!.name;
    showToast(`Badge unlocked: ${name}`);
  }
  progress.badges = earned;
}

// --- Study mode -------------------------------------------------------------

function startStudy(): void {
  queue = buildStudyQueue(WORDS, progress.cards, Date.now());
  index = 0;
  revealed = false;
  sessionStreak = 0;
  sessionXp = 0;
  mcAnswered = null;
  prepareChoices();
  view = "study";
  render();
}

// Every third card is multiple choice, the rest are flashcards.
function isMultipleChoice(): boolean {
  const word = queue[index];
  if (!word || index % 3 !== 2) return false;
  // Multiple choice needs at least four different meanings at this level.
  const meanings = new Set(WORDS.filter((w) => w.level === word.level).map((w) => w.meaning));
  return meanings.size >= 4;
}

function prepareChoices(): void {
  const word = queue[index];
  if (!word || !isMultipleChoice()) return;
  mcChoices = makeQuestion("meaning", word, WORDS.filter((w) => w.level === word.level)).choices;
  mcAnswered = null;
}

function rate(rating: Rating): void {
  const word = queue[index];
  progress.cards[word.id] = review(cardStateFor(word), rating, Date.now());
  const gained = xpForRating(rating);
  sessionXp += gained;
  sessionStreak = rating === "again" ? 0 : sessionStreak + 1;
  addXp(gained);
  persist();
  afterAnswer();
}

function answerChoice(wordId: string): void {
  if (mcAnswered) return;
  const word = queue[index];
  mcAnswered = wordId;
  const correct = wordId === word.id;
  const rating: Rating = correct ? "good" : "again";
  progress.cards[word.id] = review(cardStateFor(word), rating, Date.now());
  const gained = xpForAnswer(correct, sessionStreak);
  sessionXp += gained;
  sessionStreak = correct ? sessionStreak + 1 : 0;
  addXp(gained);
  persist();
  render();
}

function afterAnswer(): void {
  revealed = false;
  index++;
  if (index >= queue.length) {
    finishSession();
    return;
  }
  prepareChoices();
  render();
}

function finishSession(): void {
  const next = nextStreak({ streak: progress.streak, lastDay: progress.lastDay }, today());
  progress.streak = next.streak;
  progress.lastDay = next.lastDay;
  refreshBadges();
  persist();
  view = "home";
  render();
}

// --- Adventure mode ---------------------------------------------------------

function fight(monster: Monster): void {
  refreshAdventure();
  if (progress.adventure.hp <= 0 || !isMonsterUnlocked(monster, progress.adventure.defeated)) return;
  const pool = shuffle(WORDS.filter((w) => w.level === regionOf(monster).level));
  // A battle needs at least four different meanings for the answer choices.
  const distinctMeanings = new Set(pool.map((w) => w.meaning)).size;
  if (distinctMeanings < 4) {
    showToast("Not enough words for a battle yet.");
    render();
    return;
  }
  battleMonster = monster;
  battle = beginBattle(monster, progress.adventure.hp);
  battlePool = pool;
  battleIndex = 0;
  battleChoice = null;
  battleReward = null;
  question = battleQuestion(monster, battlePool[0]);
  render();
}

// A question of one of the kinds the monster's region asks.
function battleQuestion(monster: Monster, word: Word): Question {
  const type = pickQuestionType(regionOf(monster).questionTypes, word);
  return makeQuestion(type, word, battlePool);
}

function nextBattleQuestion(): void {
  if (!battle || !battleMonster) return;
  battle = nextQuestion(battle);
  battleChoice = null;
  battleIndex = (battleIndex + 1) % battlePool.length;
  question = battleQuestion(battleMonster, battlePool[battleIndex]);
  render();
}

function answerBattle(wordId: string): void {
  refreshAdventure();
  if (!battle || !battleMonster || !question || battle.over || battle.answered) return;
  const correct = isCorrect(question, wordId);
  battleChoice = wordId;
  battle = answer(battle, correct);
  progress.adventure.hp = battle.playerHp;
  // Announce the hit first, so the victory or defeat message is added after it.
  announce(battle.log);
  if (battle.over) finishBattle();
  else persist();
  render();
}

// Hands the battle result to the rules module, then applies XP and saves.
function finishBattle(): void {
  if (!battle || !battleMonster) return;
  const before = progress.adventure.defeated;
  const result = settleBattle(battle, progress.adventure, battleMonster);
  progress.adventure = result.adv;
  battleReward = result.reward;
  announce(result.reward);
  addXp(result.xp); // may add "Level N reached!" after the reward
  const unlocked = unlockMessages(before, result.adv.defeated);
  for (const message of unlocked) showToast(message);
  if (unlocked.length > 0) mapRegion = null; // the map opens on the newest region
  persist();
}

function useItem(id: ItemId): void {
  refreshAdventure();
  if (!battle || battle.over) return;
  const result = applyItem(battle, progress.adventure.items, id);
  if (result.battle === battle) return;
  battle = result.battle;
  progress.adventure = { ...progress.adventure, items: result.items, hp: battle.playerHp };
  persist();
  announce(battle.log);
  render();
}

function buy(id: ItemId): void {
  const after = buyItem(progress.adventure, id);
  if (after === progress.adventure) return;
  progress.adventure = after;
  persist();
  announce(`Bought a ${ITEM_NAMES[id]}. ${after.gold} gold left.`);
  render();
}

function openRegion(id: string): void {
  const region = regionById(id);
  if (!region || !isRegionUnlocked(region, progress.adventure.defeated)) return;
  mapRegion = region;
  render();
}

function leaveBattle(): void {
  battle = null;
  battleMonster = null;
  question = null;
  battleReward = null;
  render();
}

// Clears everything kept in memory for the current visit: study session, battle and toast.
// Used by reset, so nothing from before (like a "Level up" toast) shows up afterwards.
function clearSessionState(): void {
  queue = [];
  index = 0;
  revealed = false;
  sessionStreak = 0;
  sessionXp = 0;
  mcChoices = [];
  mcAnswered = null;
  celebrate = null;
  battleMonster = null;
  battle = null;
  battlePool = [];
  battleIndex = 0;
  question = null;
  battleChoice = null;
  battleReward = null;
  mapRegion = null;
}

function setView(v: View): void {
  view = v;
  if (v === "adventure") refreshAdventure();
  render();
}

// --- Rendering --------------------------------------------------------------

function header(): string {
  const { level, into, span } = levelProgress(progress.xp);
  const pct = Math.round((into / span) * 100);
  return `
    <header class="top">
      <div class="brand">HSK Quest</div>
      <div class="stats">
        <span title="Day streak">🔥 ${progress.streak}</span>
        <span title="Level">⭐ Lv ${level}</span>
        <div class="xpbar"><div style="width:${pct}%"></div></div>
      </div>
    </header>`;
}

function nav(): string {
  const items: [View, string][] = [
    ["home", "Home"],
    ["study", "Study"],
    ["adventure", "Adventure"],
    ["words", "Words"],
    ["achievements", "Badges"],
    ["settings", "Settings"],
  ];
  return `<nav>${items
    .map(([v, label]) => `<button data-view="${v}" class="${view === v ? "active" : ""}">${label}</button>`)
    .join("")}</nav>`;
}

function homeView(): string {
  const dueCount = dueStudyWords(WORDS, progress.cards, Date.now()).length;
  const goal = progress.dailyGoal || DEFAULT_DAILY_GOAL;
  const goalPct = Math.min(100, Math.round((xpToday() / goal) * 100));
  const stats = wordStats();
  return `
    <section class="card">
      <h2>Today</h2>
      <p>${dueCount} HSK 5 words due for review.</p>
      <div class="goal"><div style="width:${goalPct}%"></div></div>
      <p class="muted">${xpToday()} / ${goal} XP daily goal</p>
      <button class="primary" data-action="start">Start session</button>
    </section>
    <section class="card">
      <h2>Mastery toward HSK 5</h2>
      <p>HSK 5: ${stats.hsk5Mastered} / ${stats.hsk5Total} mastered</p>
      <p class="muted">Mastered means an interval of 3 weeks or more. HSK 4 words appear in Adventure battles.</p>
    </section>`;
}

// The example sentence and its translation, if the word has one.
function exampleBlock(word: Word): string {
  if (!word.example) return "";
  const translation = word.exampleMeaning ? `<p class="muted">${esc(word.exampleMeaning)}</p>` : "";
  return `<p class="example">${esc(word.example)}</p>${translation}`;
}

// An answer option's text, with its word's pinyin on a second line when there is one.
// showPinyin is false against a veiled monster.
function choiceLabel(choice: Choice, showPinyin = true): string {
  const sub = showPinyin && choice.sub ? `<span class="choice-pinyin">${esc(choice.sub)}</span>` : "";
  return `${esc(choice.label)}${sub}`;
}

function studyView(): string {
  if (queue.length === 0) {
    return `<section class="card"><p>Nothing due right now. Come back later.</p>
      <button data-view="home">Back</button></section>`;
  }
  const word = queue[index];
  const progressLine = `<p class="muted">Card ${index + 1} of ${queue.length} · session XP ${sessionXp}</p>`;

  if (isMultipleChoice()) {
    const options = mcChoices
      .map((choice) => {
        let cls = "";
        if (mcAnswered) {
          if (choice.wordId === word.id) cls = "correct";
          else if (choice.wordId === mcAnswered) cls = "wrong";
        }
        return `<button class="choice ${cls}" data-action="choose" data-value="${esc(choice.wordId)}" ${mcAnswered ? "disabled" : ""}>${choiceLabel(choice)}</button>`;
      })
      .join("");
    return `
      ${progressLine}
      <section class="card center">
        <div class="hanzi">${esc(word.hanzi)}</div>
        <p class="muted">What does this mean?</p>
        <div class="choices">${options}</div>
        ${mcAnswered ? `<button class="primary" data-action="next">Next</button>` : ""}
      </section>`;
  }

  if (!revealed) {
    return `
      ${progressLine}
      <section class="card center">
        <div class="hanzi">${esc(word.hanzi)}</div>
        <button class="primary" data-action="reveal">Show answer</button>
      </section>`;
  }

  return `
    ${progressLine}
    <section class="card center">
      <div class="hanzi">${esc(word.hanzi)}</div>
      <div class="pinyin">${esc(word.pinyin)}</div>
      <div class="meaning">${esc(word.meaning)}</div>
      ${exampleBlock(word)}
      <div class="ratings">
        <button data-action="rate" data-rating="again">Again</button>
        <button data-action="rate" data-rating="hard">Hard</button>
        <button data-action="rate" data-rating="good">Good</button>
        <button data-action="rate" data-rating="easy">Easy</button>
      </div>
    </section>`;
}

// Item chips. In a battle they are buttons that are disabled when they can't help now.
function itemsRow(inBattle: boolean): string {
  return `<div class="items">${ITEM_IDS.map((id) => {
    const count = progress.adventure.items[id];
    const label = `${ITEM_NAMES[id]} ×${count}`;
    if (!inBattle) {
      return `<div class="item-chip">${itemSvg(id)}<span>${label}</span></div>`;
    }
    const usable = !!battle && canUseItem(battle, progress.adventure.items, id);
    return `<button class="item-chip" data-action="item" data-item="${id}" ${usable ? "" : "disabled"}>${itemSvg(id)}<span>${label}</span></button>`;
  }).join("")}</div>`;
}

function hpBar(pct: number, enemy = false): string {
  return `<div class="hpbar${enemy ? " enemy" : ""}"><div style="width:${Math.max(0, pct)}%"></div></div>`;
}

function adventureView(): string {
  refreshAdventure();
  if (battleMonster && battle) return battleView(battleMonster, battle);

  const adv = progress.adventure;
  const region = mapRegion ?? latestUnlockedRegion(adv.defeated);
  const heroPct = Math.round((adv.hp / MAX_HP) * 100);

  return `
    <section class="card hero">
      <div class="art">${heroSvg()}</div>
      <div class="hero-info">
        <h2>Your hero</h2>
        <p>HP ${adv.hp} / ${MAX_HP}</p>
        ${hpBar(heroPct)}
        <p class="gold">${coinSvg()}<span>${adv.gold} gold</span></p>
        <p class="muted">HP refills each day. After a defeat you rest at ${REST_HP} HP.</p>
      </div>
    </section>
    ${mapView(region)}
    ${regionMonsters(region).map(monsterCard).join("")}
    <section class="card">
      <h2>Items</h2>
      ${itemsRow(false)}
    </section>
    ${shopView()}`;
}

// What each kind of question asks, for the region description and the battle screen.
const QUESTION_KINDS: Record<QuestionType, { short: string; ask: string }> = {
  meaning: { short: "hanzi → meaning", ask: "What does this mean?" },
  hanzi: { short: "meaning → hanzi", ask: "Which word means this?" },
  pinyin: { short: "pinyin → hanzi", ask: "Which word is this?" },
  blank: { short: "fill the gap", ask: "Which word fills the gap?" },
};

// The row of regions. Locked regions say which boss opens them.
function mapView(current: Region): string {
  const defeated = progress.adventure.defeated;
  const stops = REGIONS.map((r, i) => {
    const open = isRegionUnlocked(r, defeated);
    const status = open || i === 0 ? `HSK ${r.level}` : `🔒 Beat the ${monsterById(REGIONS[i - 1].bossId)!.name}`;
    return `
      <button class="map-stop${r === current ? " selected" : ""}" data-action="region" data-id="${r.id}"
        aria-pressed="${r === current}" ${open ? "" : "disabled"}>
        ${regionSvg(r.id)}
        <span class="map-name">${esc(r.name)}</span>
        <span class="map-status">${esc(status)}</span>
      </button>`;
  }).join("");
  const kinds = current.questionTypes.map((t) => QUESTION_KINDS[t].short).join(", ");
  return `
    <section class="card">
      <h2>World map</h2>
      <div class="map">${stops}</div>
      <p class="muted">${esc(current.name)}: HSK ${current.level} words · ${esc(kinds)}</p>
    </section>`;
}

function abilityList(m: Monster): string {
  if (m.abilities.length === 0) return "";
  const items = m.abilities
    .map((a) => `<li><strong>${ABILITIES[a].name}</strong>: ${ABILITIES[a].description}</li>`)
    .join("");
  return `<ul class="abilities">${items}</ul>`;
}

function monsterCard(m: Monster): string {
  const adv = progress.adventure;
  const beaten = adv.defeated.includes(m.id);
  const open = isMonsterUnlocked(m, adv.defeated);
  const reward = beaten
    ? `rewards claimed · +${practiceGold(m)} gold per practice win`
    : `+${m.xp} XP and +${m.gold} gold on first win${m.boss ? ", plus an item" : ""}`;
  const button = open
    ? `<button class="primary" data-action="fight" data-id="${m.id}" ${adv.hp <= 0 ? "disabled" : ""}>${beaten ? "Practice fight" : "Fight"}</button>`
    : `<p class="muted">🔒 Beat the other monsters here first.</p>`;
  return `
    <section class="card monster-card${open ? "" : " locked"}">
      <div class="art">${monsterSvg(m.id)}</div>
      <div class="monster-info">
        <h3>${esc(m.name)}${beaten ? " ✔" : ""}${m.boss ? ` <span class="tag">Boss</span>` : ""}</h3>
        <p class="muted">${answersNeeded(m)} correct answers to win · ${reward}</p>
        ${abilityList(m)}
        ${button}
      </div>
    </section>`;
}

function shopView(): string {
  const adv = progress.adventure;
  const buttons = ITEM_IDS.map((id) => {
    const price = SHOP_PRICES[id];
    return `<button class="item-chip" data-action="buy" data-item="${id}" aria-label="Buy a ${ITEM_NAMES[id]} for ${price} gold" ${canBuy(adv, id) ? "" : "disabled"}>
      ${itemSvg(id)}<span>${ITEM_NAMES[id]}</span><span class="price">${coinSvg()}${price}</span>
    </button>`;
  }).join("");
  return `
    <section class="card">
      <h2>Shop</h2>
      <p class="muted">You have ${adv.gold} gold. Win battles to earn more.</p>
      <div class="items">${buttons}</div>
    </section>`;
}

// The example sentence with a gap. After answering, the word fills the gap
// and the translation appears, so the sentence can be read in full.
function blankSentence(q: Question, answered: boolean): string {
  const [before, after = ""] = q.prompt.split(BLANK);
  const gap = answered
    ? `<strong class="gap">${esc(q.word.hanzi)}</strong>`
    : `<span class="gap"><span aria-hidden="true">${BLANK}</span><span class="sr-only">blank</span></span>`;
  const translation = answered && q.word.exampleMeaning ? `<p class="muted">${esc(q.word.exampleMeaning)}</p>` : "";
  return `<p class="sentence">${esc(before)}${gap}${esc(after)}</p>${translation}`;
}

// What the question shows above its options.
function questionPrompt(q: Question, answered: boolean): string {
  const ask = `<p class="muted">${QUESTION_KINDS[q.type].ask}</p>`;
  if (q.type === "meaning") return `<div class="hanzi">${esc(q.prompt)}</div>${ask}`;
  if (q.type === "pinyin") return `<div class="prompt-pinyin">${esc(q.prompt)}</div>${ask}`;
  if (q.type === "hanzi") return `<div class="prompt-meaning">${esc(q.prompt)}</div>${ask}`;
  return `${blankSentence(q, answered)}${ask}`;
}

function battleView(m: Monster, b: Battle): string {
  let body: string;
  if (b.over) {
    body = `
      <p class="reward">${esc(battleReward ?? "")}</p>
      <button class="primary" data-action="leave-battle">Back to Adventure</button>`;
  } else if (question) {
    const current = question;
    const shown = b.hintShown ? choicesAfterHint(current) : current.choices;
    const showPinyin = !hidesPinyin(b);
    const options = shown
      .map((choice) => {
        let cls = "";
        if (b.answered) {
          if (isCorrect(current, choice.wordId)) cls = "correct";
          else if (choice.wordId === battleChoice) cls = "wrong";
        }
        return `<button class="choice ${cls}" data-action="battle-choose" data-value="${esc(choice.wordId)}" ${b.answered ? "disabled" : ""}>${choiceLabel(choice, showPinyin)}</button>`;
      })
      .join("");
    body = `
      ${questionPrompt(current, b.answered)}
      <div class="choices">${options}</div>
      ${b.answered ? `<button class="primary" data-action="battle-next">Next question</button>` : ""}`;
  } else {
    body = "";
  }

  const tags = m.abilities.map((a) => `<span class="tag">${ABILITIES[a].name}</span>`).join("");
  return `
    <section class="card battle">
      <div class="fighters">
        <div class="fighter">
          <div class="art">${monsterSvg(m.id)}</div>
          <strong>${esc(m.name)}</strong>
          ${tags ? `<div class="tags">${tags}</div>` : ""}
          ${hpBar(Math.round((b.monsterHp / b.monsterMaxHp) * 100), true)}
          <span class="muted">${b.monsterHp} / ${b.monsterMaxHp} left${b.armorUp ? " · armored" : ""}</span>
        </div>
        <div class="fighter">
          <div class="art">${heroSvg()}</div>
          <strong>You</strong>
          ${hpBar(Math.round((b.playerHp / MAX_HP) * 100))}
          <span class="muted">HP ${b.playerHp} / ${MAX_HP}</span>
        </div>
      </div>
      <p class="log">${esc(b.log)}</p>
      ${body}
    </section>
    ${b.over ? "" : `<section class="card"><h2>Items</h2>${itemsRow(true)}</section>`}`;
}

// How far along a studied word is, from its saved card (if any).
function cardStatus(card: CardState | undefined): string {
  if (!card) return "new";
  if (card.interval >= 21) return "mastered";
  return card.reps >= 1 ? "learning" : "new";
}

function wordsView(): string {
  const rows = WORDS.map((w) => {
    // HSK 4 words are not studied, so show where they are used instead.
    const status = w.level === STUDY_LEVEL ? cardStatus(progress.cards[w.id]) : "battles";
    return `<tr><td class="hanzi-sm">${esc(w.hanzi)}</td><td>${esc(w.pinyin)}</td><td>${esc(w.meaning)}</td><td>HSK ${w.level}</td><td class="status ${status}">${status}</td></tr>`;
  }).join("");
  return `<section class="card"><h2>Words</h2>
    <table><thead><tr><th>Hanzi</th><th>Pinyin</th><th>Meaning</th><th>Level</th><th>Status</th></tr></thead>
    <tbody>${rows}</tbody></table></section>`;
}

function achievementsView(): string {
  const earned = new Set(progress.badges);
  const items = BADGES.map(
    (b) => `<li class="${earned.has(b.id) ? "earned" : "locked"}"><strong>${esc(b.name)}</strong> · ${esc(b.description)}</li>`,
  ).join("");
  return `<section class="card"><h2>Badges</h2><ul class="badges">${items}</ul></section>`;
}

function settingsView(): string {
  return `
    <section class="card">
      <h2>Settings</h2>
      <label>Daily XP goal
        <input type="number" min="5" max="200" id="goal" value="${progress.dailyGoal}" />
      </label>
      <button data-action="save-goal">Save goal</button>
    </section>
    <section class="card">
      <h2>Reset</h2>
      <p class="muted">Deletes all progress saved in this browser.</p>
      <button class="danger" data-action="reset">Reset progress</button>
    </section>
    ${creditsCard()}`;
}

// The word data licenses require these credits (see data-sources/SOURCE.md).
function creditsCard(): string {
  const link = (url: string, text: string) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`;
  return `
    <section class="card">
      <h2>About the words</h2>
      <p class="muted">Word lists: the official HSK 2.0 lists (Hanban, 2012), from
        ${link("https://hskhsk.com/word-lists", "hskhsk.com")} by Alan Davies, used under
        his terms for non-commercial use.</p>
      <p class="muted">Meanings are adapted from
        ${link("https://cc-cedict.org/wiki/", "CC-CEDICT")}
        (${link("https://creativecommons.org/licenses/by-sa/4.0/", "CC BY-SA 4.0")}):
        shortened and edited, and shared under the same license.
        Pinyin and meanings come via
        ${link("https://github.com/drkameleon/complete-hsk-vocabulary", "complete-hsk-vocabulary")}
        by Yanis Zafirópulos (MIT license).</p>
    </section>`;
}

function celebrationBanner(): string {
  // The toast is only visual. Screen readers hear it once through #live (see showToast),
  // because this element is rebuilt on every redraw and would not be read reliably.
  return celebrate ? `<div class="toast" aria-hidden="true">${esc(celebrate)}</div>` : "";
}

function render(): void {
  const body = {
    home: homeView,
    study: studyView,
    adventure: adventureView,
    words: wordsView,
    achievements: achievementsView,
    settings: settingsView,
  }[view]();
  app.innerHTML = `${header()}${celebrationBanner()}<main>${body}</main>${nav()}`;
  if (celebrate) {
    const msg = celebrate;
    setTimeout(() => {
      if (celebrate === msg) {
        celebrate = null;
        document.querySelector(".toast")?.remove();
      }
    }, 2500);
  }
}

// --- Events -----------------------------------------------------------------

app.addEventListener("click", (event) => {
  const target = (event.target as HTMLElement).closest<HTMLElement>("[data-view],[data-action]");
  if (!target || (target as HTMLButtonElement).disabled) return;

  if (target.dataset.view) {
    setView(target.dataset.view as View);
    return;
  }

  switch (target.dataset.action) {
    case "start":
      startStudy();
      break;
    case "reveal":
      revealed = true;
      render();
      break;
    case "rate":
      rate(target.dataset.rating as Rating);
      break;
    case "choose":
      answerChoice(target.dataset.value!);
      break;
    case "next":
      afterAnswer();
      break;
    case "fight": {
      const monster = monsterById(target.dataset.id!);
      if (monster) fight(monster);
      break;
    }
    case "region":
      openRegion(target.dataset.id!);
      break;
    case "buy":
      buy(target.dataset.item as ItemId);
      break;
    case "battle-choose":
      answerBattle(target.dataset.value!);
      break;
    case "battle-next":
      nextBattleQuestion();
      break;
    case "item":
      useItem(target.dataset.item as ItemId);
      break;
    case "leave-battle":
      leaveBattle();
      break;
    case "save-goal": {
      const input = document.getElementById("goal") as HTMLInputElement;
      const value = Math.round(Number(input.value));
      if (value >= 5 && value <= 200) {
        progress.dailyGoal = value;
        persist();
        render();
      }
      break;
    }
    case "reset":
      if (confirm("Delete all progress in this browser?")) {
        progress = resetProgress();
        clearSessionState();
        view = "home";
        render();
      }
      break;
  }
});

render();
