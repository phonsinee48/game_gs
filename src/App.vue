<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

import eggBlue from "./assets/ui/gameplay/egg-blue.webp";
import eggWhite from "./assets/ui/gameplay/egg-white.webp";
import eggBlack from "./assets/ui/gameplay/egg-black.webp";
import eggSilver from "./assets/ui/gameplay/egg-silver.webp";
import coinPile from "./assets/coin-pile.webp";
import rewardLotus from "./assets/reward-lotus.svg";
import rewardPtt from "./assets/reward-ptt.svg";
import rewardHomepod from "./assets/reward-homepod.svg";
import gsBatteryBadge from "./assets/ui/common/badge.webp";
import hudTopbar from "./assets/ui/common/topbar.webp";
import hexBg from "./assets/ui/common/hex-bg.webp";
import homeTitleFull from "./assets/ui/home/03.webp";
import cabinetHero from "./assets/ui/home/cabinet.webp";
import btnStart from "./assets/ui/home/btn-start.webp";
import navExchangeHistory from "./assets/ui/home/nav-exchange-history.webp";
import navHistory from "./assets/ui/home/nav-history.webp";
import navRewards from "./assets/ui/home/nav-rewards.webp";
import btnHowToPlayWide from "./assets/ui/home/btn-how-to-play-wide.webp";

import GameMachine from "./components/GameMachine.vue";
import RewardResult from "./components/RewardResult.vue";
import TicketExchange from "./components/TicketExchange.vue";
import CoinRewards from "./components/CoinRewards.vue";
import HistoryList from "./components/HistoryList.vue";
import ExchangeHistoryList from "./components/ExchangeHistoryList.vue";
import BatchSummary from "./components/BatchSummary.vue";
import HowToPlay from "./components/HowToPlay.vue";
import LimitReached from "./components/LimitReached.vue";
import OutOfTicketsPopup from "./components/OutOfTicketsPopup.vue";
import { useClawDrive } from "./composables/useClawDrive";
import { clawGameApi, ApiError } from "./lib/api";
import { initLiff } from "./lib/liff";

const ROUND_TIME = 15;

// gameState: idle | exchange | howToPlay | playing | stirring | grabbing
//          | result | summary | rewards | history | exchangeHistory
// A session (from startRound to running out of tickets) stays on
// playing/stirring/grabbing for every grab it takes — there's no more
// per-grab reveal screen (see collectedEggs below); "result"/"summary" are
// only reached once, at the very end of the session.
// ?dev=1 skips ticket/point cost and the round timer so the claw screen
// can be reached repeatedly while iterating on its UI.
const devMode = new URLSearchParams(window.location.search).get("dev") === "1";

const gameState = ref("idle");
// Sensible offline defaults for ?dev=1 — overwritten by the real values
// from get_game_state as soon as that resolves (see loadGameState below).
const points = ref(120);
const coins = ref(1250);
const tickets = ref(0);
const campaign = ref({
  exchangeRate: 10,
  exchangeMax: 100,
  bonusMinPoint: 100,
  bonusQty: 1,
});
const lineID = ref(null);
const apiError = ref("");
const timer = ref(ROUND_TIME);
const message = ref("");
// True while exchangeTickets' network call is in flight (see
// startFromExchange) — without this the exchange screen just sits there
// unchanged with no feedback until the request resolves (or, on a slow/
// dropped request, looks stuck indefinitely).
const exchanging = ref(false);
const motionEnabled = ref(false);
const soundOn = ref(true);
// Gates the claw controls at the start of every round until the player
// shakes (or taps the shake prompt) at least once, per the "shake to stir
// before you can grab" flow — cleared the moment that first stir resolves.
const needsStir = ref(true);

const drive = useClawDrive(50);
const clawAnim = ref("idle"); // idle|pause|descend|grip|ascend|settle
const heldEgg = ref(null);
const targetEggId = ref(null);
const reward = ref(null);
const confetti = ref(false);
const stirTrigger = ref(0);
// True from the moment AUTO starts sliding toward its next egg until that
// grab's own result has been folded into collectedEggs — blocks the
// control dock (see controlsEnabled) from fighting AUTO for the claw
// mid-slide/mid-grab.
const autoPlaying = ref(false);
// Toggled by the play screen's AUTO button — while true, every grab (the
// session's first egg included) plays itself out and the next one starts
// right after with no shake or tap needed, until the player toggles it
// off, tickets run out, or something goes wrong.
const autoRepeat = ref(false);

// Every egg grabbed so far this session (manual or AUTO), in grab order —
// { id, color, src, reward }. The reward is decided the moment play_claw
// responds, but stays hidden from the player until the reveal screen (see
// goToReveal) once the whole session's tickets are spent; GameMachine shows
// these as a growing tray of unopened icons in the meantime.
const collectedEggs = ref([]);
// Shown once a grab leaves the player with 0 tickets — the session is over,
// so this is the only way forward from the play screen: dismiss it via
// goToReveal() once resolveSessionBatch (below) has actually finished.
const outOfTicketsPopup = ref(false);
// True while the session's one real play_claw call (see resolveSessionBatch)
// is still in flight. RewardResult's post-crack state uses this directly for
// its own spinner (that only shows once the player has already cracked the
// egg open, so a wait there is expected). The popup stays plain the whole
// time instead — only once the player actually confirms past it does a
// still-pending batch get its own dedicated loading screen (see goToReveal
// and gameState 'loadingReveal') rather than blocking the popup itself.
const sessionBatchLoading = ref(false);
// Set whenever play_claw reports fully_completed:false (a reward ran out of
// stock mid-grab) — shown as a note on the result/summary screen so the
// player understands why one grab yielded nothing, instead of it looking
// like it was silently dropped.
const stockShortageNote = ref("");
const historyLog = ref([]);
const exchangeHistoryLog = ref([]);
// True while openHistory/openExchangeHistory's own fetch is in flight —
// without this, the screen would render its empty-state art (still holding
// whatever was in historyLog/exchangeHistoryLog *before* this fetch, often
// nothing at all) for however long that request takes, which reads as "you
// have no history" for a beat before real rows pop in and replace it. A
// spinner in that same window makes clear a load is actually happening.
const historyLoading = ref(false);
const exchangeHistoryLoading = ref(false);
let historySeq = 0;

let timerId;
let lastShakeAt = 0;
let transitionToken = 0;

// Colors stay paired with each egg's image so the claw's "holding" art
// (which ships as a separate image per color) can match whichever egg was
// actually grabbed, instead of always showing the blue variant.
const eggPool = [
  { src: eggBlue, color: "blue" },
  { src: eggWhite, color: "white" },
  { src: eggBlack, color: "black" },
  { src: eggSilver, color: "silver" },
];
// 4 staggered rows of 5 — y never goes above 66 (any higher risks the claw's
// own descend reach, measured against Claw.vue's fixed-height rig, and the
// old 12-egg pile's own topmost row already sat right at that same 66
// without ever clipping the claw) or below 87 (egg-pile.vue's eggs are 78px
// tall with a centered anchor, so anything past ~87% of the chamber's own
// height starts getting clipped by .cabinet-chamber's overflow:hidden).
const baseEggs = [
  [13, 66, -6],
  [30, 66, 5],
  [47, 66, -3],
  [64, 66, 7],
  [81, 66, -8],
  [21, 72, 4],
  [38, 72, -7],
  [54, 72, 6],
  [70, 72, -4],
  [85, 72, 8],
  [13, 79, -5],
  [30, 79, 7],
  [47, 79, -6],
  [64, 79, 4],
  [81, 79, -3],
  [21, 85, 6],
  [38, 85, -8],
  [54, 85, 5],
  [70, 85, -4],
  [85, 85, 7],
];

// Colors are shuffled fresh per round (not just a fixed i%4 cycle across
// baseEggs' slots) so the pile actually looks randomized round to round on
// its own — previously a round only got new colors once the player shook
// it (see shuffledColors/stirEggs below), which AUTO mode never does (it
// skips the shake gate entirely), so every AUTO round kept re-drawing the
// exact same colors at the exact same positions.
function makeEggs() {
  const colors = shuffledColors(baseEggs.length);
  return baseEggs.map(([x, y, rot], i) => {
    const { src, color } = colors[i];
    return { id: i + 1, x, y, rot, src, color, hidden: false };
  });
}

const eggs = ref(makeEggs());

// Weighted reward draw, synced to "GS Game.pdf" p.3's official rate table —
// used only in ?dev=1 (the real game gets its result from play_claw).
const DEV_REWARDS = [
  { type: "prize", label: "ทอง 50 สตางค์", weight: 0.02 },
  { type: "prize", label: "ทอง 25 สตางค์", weight: 0.02 },
  { type: "prize", label: "HomePod mini", weight: 0.07 },
  { type: "prize", label: "บัตรกำนัล ปตท. 1,000 บาท", weight: 0.26 },
  { type: "prize", label: "บัตรกำนัล ปตท. 500 บาท", weight: 0.34 },
  { type: "prize", label: "บัตรกำนัล Lotus 300 บาท", weight: 0.43 },
  { type: "prize", label: "บัตรกำนัล Lotus 200 บาท", weight: 0.43 },
  { type: "prize", label: "บัตรกำนัล Lotus 100 บาท", weight: 0.51 },
  { type: "coin", label: "10 Coin", value: 10, weight: 34.07 },
  { type: "coin", label: "20 Coin", value: 20, weight: 25.55 },
  { type: "coin", label: "30 Coin", value: 30, weight: 21.29 },
  { type: "coin", label: "50 Coin", value: 50, weight: 17.03 },
];

// Coin-shop catalog for ?dev=1 only — the real game fetches this from
// get_redeem_list (see openRewards) since stock/prices live server-side.
const DEV_CATALOG = [
  {
    id: "lotus100",
    label: "บัตรกำนัล Lotus 100 บาท",
    cost: 300,
    image: rewardLotus,
    qty: 99,
  },
  {
    id: "lotus200",
    label: "บัตรกำนัล Lotus 200 บาท",
    cost: 600,
    image: rewardLotus,
    qty: 99,
  },
  {
    id: "lotus300",
    label: "บัตรกำนัล Lotus 300 บาท",
    cost: 900,
    image: rewardLotus,
    qty: 99,
  },
  {
    id: "ptt500",
    label: "บัตรกำนัล ปตท. 500 บาท",
    cost: 1500,
    image: rewardPtt,
    qty: 99,
  },
  {
    id: "ptt1000",
    label: "บัตรกำนัล ปตท. 1,000 บาท",
    cost: 3000,
    image: rewardPtt,
    qty: 99,
  },
  {
    id: "homepod",
    label: "HomePod mini",
    cost: 11670,
    image: rewardHomepod,
    qty: 99,
  },
];
const coinCatalog = ref(devMode ? DEV_CATALOG : []);

const canExchange = computed(() => points.value >= campaign.value.exchangeRate);
const canPlayBatch = computed(() => tickets.value >= 1);
const isLimitReached = computed(
  () => !canPlayBatch.value && !canExchange.value,
);
const inMachine = computed(() =>
  ["playing", "stirring", "grabbing"].includes(gameState.value),
);
const controlsEnabled = computed(
  () =>
    (gameState.value === "playing" || gameState.value === "stirring") &&
    !needsStir.value &&
    // autoGrabNext briefly sets gameState back to "playing" while it slides
    // the claw over to its next egg (see autoMoveClawTo) — without this,
    // that would also flip the arrow/grab buttons back on and let a player
    // tap fight AUTO for control of the claw mid-slide.
    !autoPlaying.value,
);

// Best-effort guess from the reward's name — only ever used as a fallback
// for ?dev=1 (its local DEV_REWARDS/DEV_CATALOG have no real photo) or for
// a live reward whose campaign entry happens to have no reward_img set.
// Whenever the API actually sends an image, that real photo wins instead
// (see the `r.image || imageForReward(r)` call sites below).
function imageForReward(r) {
  if (!r || r.type === "coin") return coinPile;
  if (r.label.includes("HomePod")) return rewardHomepod;
  if (r.label.includes("ปตท")) return rewardPtt;
  if (r.label.includes("Lotus")) return rewardLotus;
  return coinPile;
}

const rewardImage = computed(() => reward.value?.image || imageForReward(reward.value));

// Appends a just-grabbed egg to collectedEggs (see grabEgg) — its color is
// already known (whichever egg the claw actually gripped), pushed in
// immediately so the tray fills up with zero delay regardless of when the
// reward itself gets decided. reward starts null and is filled in later,
// either right away (devMode) or once the session's one batch call
// resolves on its last grab (see resolveReward/the real-API branch below).
function pushCollectedEgg(target) {
  const entry = {
    id: collectedEggs.value.length + 1,
    color: target.color,
    src: target.src,
    reward: null,
  };
  collectedEggs.value.push(entry);
  return entry;
}

// Attaches the image fallback the same way pushCollectedEgg used to before
// its reward was known up front — shared by devMode's immediate reward and
// the real API's deferred one.
function resolveReward(r) {
  return { ...r, image: r.image || imageForReward(r) };
}

function ticketsForAmount(amount) {
  const base = Math.floor(amount / campaign.value.exchangeRate);
  const bonus = amount >= campaign.value.bonusMinPoint ? campaign.value.bonusQty : 0;
  return { base, bonus, total: base + bonus };
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Spends `amount` Points for tickets — no separate confirm step of its own
// anymore (see startFromExchange, the only caller): it either runs on its
// own right before a round starts, or not at all.
async function exchangeTickets(amount) {
  if (amount > points.value || amount < campaign.value.exchangeRate) return false;
  if (devMode) {
    const { total } = ticketsForAmount(amount);
    points.value -= amount;
    tickets.value += total;
    return true;
  }
  message.value = "";
  exchanging.value = true;
  try {
    const data = await clawGameApi.exchangeTicket(lineID.value, amount);
    points.value = data.point;
    tickets.value = data.ticket.balance;
    return true;
  } catch (err) {
    message.value = err instanceof ApiError ? err.message : "แลกสิทธิ์ไม่สำเร็จ ลองใหม่อีกครั้ง";
    return false;
  } finally {
    exchanging.value = false;
  }
}

function openTicketScreen() {
  if (devMode) {
    startRound();
    return;
  }
  message.value = "";
  gameState.value = "exchange";
  // isLimitReached already gates this button out of the home screen
  // entirely (see the LimitReached branch above), so reaching here always
  // means the player can either exchange more Points or already has
  // tickets to spend.
}

// The exchange screen's own "เริ่มเกม" button starts a whole session that
// then keeps grabbing (see grabEgg) until every ticket is spent. Already
// having playable tickets always wins (never spends Points the player
// didn't ask to spend just because some amount happens to be selected on
// the stepper) — only exchanges the selected `amount` first when there's
// nothing left to play with yet, per the amount the player left dialed in.
async function startFromExchange(amount) {
  if (!canPlayBatch.value) {
    const ok = await exchangeTickets(amount);
    if (!ok) return;
  }
  startRound();
}

async function redeemCoinReward(item) {
  if (coins.value < item.cost || item.qty <= 0) return;
  if (devMode) {
    coins.value -= item.cost;
    // Goes to exchangeHistoryLog, not historyLog — a redemption belongs on
    // "ประวัติการแลกรางวัล" only, matching how the real get_play_history /
    // get_redeem_history split keeps them apart in non-dev mode too.
    exchangeHistoryLog.value.unshift({
      id: ++historySeq,
      ts: Date.now(),
      label: item.label,
      image: item.image,
      cost: item.cost,
      claimStatus: 0,
    });
    message.value = `แลก ${item.label} สำเร็จ!`;
    return;
  }
  try {
    const data = await clawGameApi.redeemCoin(lineID.value, item.id);
    coins.value = data?.coin ?? coins.value - item.cost;
    message.value = `แลก ${item.label} สำเร็จ!`;
  } catch (err) {
    message.value = err instanceof ApiError ? err.message : "แลกของไม่สำเร็จ ลองใหม่อีกครั้ง";
  }
}

// Starts a whole session: from here, grabEgg's own continuation keeps the
// player on the play screen grabbing (manual or AUTO) — resetting the timer
// to ROUND_TIME after every successful grab — until tickets run out, with no
// need to call this again in between (see the out-of-tickets popup instead).
function startRound() {
  if (!devMode && tickets.value < 1) {
    goHome();
    return;
  }
  stopTimer();
  transitionToken++;
  // Tickets aren't spent locally — the real spend happens server-side in
  // grabEgg() via play_claw, which is the single source of truth for the
  // balance afterward. Not touching `tickets` here keeps it accurate even
  // if the player backs out before actually grabbing.
  eggs.value = makeEggs();
  drive.setX(50);
  clawAnim.value = "idle";
  heldEgg.value = null;
  targetEggId.value = null;
  autoPlaying.value = false;
  reward.value = null;
  collectedEggs.value = [];
  outOfTicketsPopup.value = false;
  sessionBatchLoading.value = false;
  stockShortageNote.value = "";
  timer.value = ROUND_TIME;
  gameState.value = "playing";
  // AUTO (see toggleAutoRepeat) skips the shake gate entirely — a mode
  // that's supposed to run hands-off until the player turns it off
  // shouldn't still make them shake first every single session. Manual play
  // only ever shakes once here too — every later grab this session just
  // resets the timer (see grabEgg), never needsStir.
  needsStir.value = !autoRepeat.value;
  // Left blank: the shake-pill's own artwork already carries the
  // "shake before you start" instruction while the gate is up.
  message.value = "";
  // The countdown only starts once the shake gate clears (see stirEggs) —
  // otherwise the mandatory first shake would eat into the player's time.
  // Ask for motion access right away so a real shake works immediately,
  // with no tap required first — browsers that need an explicit user
  // gesture for this (iOS Safari) will just no-op here; the shake-pill tap
  // is still there as the fallback for those.
  if (!motionEnabled.value) enableMotion();

  if (autoRepeat.value) autoGrabNext();
}

// Wired to the play screen's AUTO toggle. Turning it off just stops the
// *next* grab from auto-starting (grabEgg's own continuation already checks
// autoRepeat before chaining into another — see autoGrabNext); the current
// grab still finishes playing out rather than cutting off mid-animation.
// Turning it on mid-session, before the next grab has happened yet, takes
// over right away instead of leaving the player to still shake/tap first.
function toggleAutoRepeat() {
  autoRepeat.value = !autoRepeat.value;
  if (!autoRepeat.value) return;

  if (["playing", "stirring"].includes(gameState.value) && !autoPlaying.value) {
    needsStir.value = false;
    autoGrabNext();
  }
}

function startRoundTimer() {
  if (devMode) return;
  timerId = setInterval(() => {
    timer.value--;
    if (timer.value <= 0) {
      stopTimer();
      grabEgg();
    }
  }, 1000);
}

// Fisher-Yates so every slot's color is independently reassigned — a real
// swap of which egg sits where, not just a uniform relabel of the 4 colors.
function shuffledColors(count) {
  const colors = Array.from(
    { length: count },
    (_, i) => eggPool[i % eggPool.length],
  );
  for (let i = colors.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [colors[i], colors[j]] = [colors[j], colors[i]];
  }
  return colors;
}

function stirEggs() {
  if (gameState.value !== "playing") return;
  const token = transitionToken;
  const wasGated = needsStir.value;
  gameState.value = "stirring";
  // The eggs' x/y/rot slots stay put (they're tuned to avoid clipping the
  // chamber's edges) — only which colored egg sits in each slot changes,
  // so the pile visibly swaps positions per the shake-banner's promise.
  const colors = shuffledColors(eggs.value.length);
  eggs.value = eggs.value.map((egg, i) => ({
    ...egg,
    src: colors[i].src,
    color: colors[i].color,
  }));
  stirTrigger.value++;
  beep(150, 0.07);
  delay(620).then(() => {
    if (token !== transitionToken) return;
    if (gameState.value === "stirring") gameState.value = "playing";
    if (wasGated) {
      needsStir.value = false;
      message.value = "";
      startRoundTimer();
    }
  });
}

// Everything about this feels like "one ticket, one grab" from the player's
// side, but the real API call is only ever made ONCE per session, right on
// the very last grab, for every ticket spent this session at once (see
// grabEgg) — the dev backend can take 6-12s to answer even a trivial
// request, so every grab before the last one is purely local (claw
// animation only, no network wait at all): its color is already known from
// which egg was actually grabbed, so it's pushed into collectedEggs right
// away with reward left null. The one real wait lands on the last grab,
// right at the natural "done collecting, about to see what's inside"
// boundary, instead of interrupting the pile-up after every single tap.

function mapResult(r) {
  return {
    type: r.is_coin ? "coin" : "prize",
    label: r.reward_name,
    value: r.coin_gained,
    image: r.reward_img || null,
  };
}

// Every egg's x/y is a fixed slot for the whole round (see baseEggs) —
// real physics would be overkill for a dozen static positions, but a
// removed egg leaving its neighbours frozen in place looks obviously fake.
// Nudge the 1-2 closest still-live eggs partway toward the gap (and give
// them a fresh tilt) the instant the claw grips its egg, so the pile reads
// as settling rather than being a rack of independent slots. EggPile's own
// left/top transition (see .pile-egg) turns this into a roll rather than a
// snap.
function settleNearbyEggs(removedEgg) {
  const NEARBY_COUNT = 2;
  const MAX_DIST = 26; // in the same x/y % units as egg.x/egg.y
  const PULL = 0.35; // how far toward the gap they roll — not all the way, so it still reads as a pile, not a teleport

  const remaining = eggs.value
    .filter((e) => !e.hidden && e.id !== removedEgg.id)
    .map((e) => ({ egg: e, dist: Math.hypot(e.x - removedEgg.x, e.y - removedEgg.y) }))
    .sort((a, b) => a.dist - b.dist);

  for (const { egg, dist } of remaining.slice(0, NEARBY_COUNT)) {
    if (dist > MAX_DIST) continue;
    egg.x += (removedEgg.x - egg.x) * PULL;
    egg.y += (removedEgg.y - egg.y) * PULL;
    egg.rot += Math.random() * 16 - 8;
  }
}

// Shared by the player's own grab and every auto-grab later in a batch —
// just the claw choreography (pause/descend/grip/ascend/settle) against
// whichever target egg is passed in. Returns false if a newer transition
// (goHome, a fresh round, ...) preempted this one partway through, so the
// caller knows not to continue on stale state.
async function playGrabAnimation(token, target) {
  clawAnim.value = "pause";
  beep(220, 0.05);
  await delay(160);
  if (token !== transitionToken) return false;

  clawAnim.value = "descend";
  beep(180, 0.08);
  await delay(620);
  if (token !== transitionToken) return false;

  target.hidden = true;
  settleNearbyEggs(target);
  heldEgg.value = target;
  clawAnim.value = "grip";
  beep(420, 0.07);
  await delay(260);
  if (token !== transitionToken) return false;

  clawAnim.value = "ascend";
  await delay(620);
  if (token !== transitionToken) return false;

  clawAnim.value = "settle";
  await delay(230);
  return token === transitionToken;
}

// The whole grab: claw choreography, always local and instant, plus —
// only on the session's last ticket — the one real play_claw round-trip
// that decides every grab made so far at once (see isLastGrabOfSession).
// Folds the result(s) into collectedEggs, then either resets the timer for
// the next grab or, once tickets hit 0, pops the "out of tickets" popup.
// Called the same way whether the player tapped grab, the round timer ran
// out, or AUTO chained into it (see autoGrabNext).
async function grabEgg() {
  if (!["playing", "stirring"].includes(gameState.value)) return;
  stopTimer();
  const token = ++transitionToken;
  const live = eggs.value.filter((e) => !e.hidden);
  if (!live.length) return;
  const target = [...live].sort(
    (a, b) => Math.abs(a.x - drive.x.value) - Math.abs(b.x - drive.x.value),
  )[0];
  targetEggId.value = target.id;
  gameState.value = "grabbing";
  // Controls are about to be disabled (controlsEnabled requires 'playing'/
  // 'stirring') — if the player is still mid-hold on an arrow, disabling
  // its button doesn't reliably fire pointerup/pointercancel on every
  // browser, which could otherwise leave the drive's direction stuck non-
  // zero forever. Force it to a clean stop right here regardless.
  drive.release();
  message.value = "";

  // The last ticket in a session still only gets spent for real (i.e. the
  // reward decided) once the last grab's fetch resolves (see below) — but
  // the ticket COUNT itself decrements locally right away same as any other
  // grab, so "สิทธิ์คงเหลือ" reads 0 the instant this grab plays out instead
  // of sitting on the pre-grab number for however long that fetch takes
  // (this backend has measured 10-20s+ response times). resolveSessionBatch
  // still overwrites this with the server's own number once it answers, so
  // a stock-shortage or other mismatch self-corrects either way.
  const isLastGrabOfSession = !devMode && tickets.value <= 1;

  try {
    const ok = await playGrabAnimation(token, target);
    if (!ok) return;

    // The color is already decided by which egg the claw actually gripped
    // — push it into the tray immediately regardless of whether this grab
    // is the one that has to wait on the network; the reward itself stays
    // null (hidden) until it's known.
    const entry = pushCollectedEgg(target);

    if (devMode) {
      // ?dev=1 skips ticket/point cost entirely (see the top-of-file note)
      // — tickets never move here, so a dev session can be mashed
      // indefinitely while tuning the claw/animation without ever hitting
      // the out-of-tickets popup below.
      const r = drawReward();
      entry.reward = resolveReward(r);
      if (r.type === "coin") coins.value += r.value;
      logReward(r);
    } else {
      tickets.value -= 1;
    }
    // isLastGrabOfSession (real API): reward resolution is deferred to
    // resolveSessionBatch below, fired only once the player has already
    // landed on whichever screen is coming next — nothing left to decide
    // for this branch here.

    // The pile can run dry well before tickets do (see the plan's pile-
    // depletion note) — refill it right here so the next grab always has
    // something live to target instead of stranding the session.
    if (eggs.value.every((e) => e.hidden)) eggs.value = makeEggs();

    // Straight back to idle with no pause or flash in between — this used
    // to mirror the old crack-screen transition's own flash beat, but
    // that was tuned for a screen swap that no longer happens here; with
    // grabs now chaining back-to-back on the same play screen, a bright
    // full-screen flash on every single one (see .game-phone.flash in
    // style.css) read as the screen flickering/going dark by contrast each
    // time it snapped back, not as a smooth continuous session.
    clawAnim.value = "idle";
    heldEgg.value = null;
    targetEggId.value = null;
    autoPlaying.value = false;

    gameState.value = "playing";

    if (isLastGrabOfSession) {
      // Head straight to whichever reveal screen is coming next — a single
      // egg lands on RewardResult (still closed; cracking it doesn't need
      // the reward, only *revealing* it does), 2+ land on the popup. Either
      // way resolveSessionBatch's one real network call now runs behind
      // that screen instead of in front of it.
      if (collectedEggs.value.length === 1) {
        gameState.value = "result";
      } else {
        outOfTicketsPopup.value = true;
      }
      resolveSessionBatch(token);
      return;
    }

    timer.value = ROUND_TIME;
    message.value = "";
    if (autoRepeat.value) {
      autoGrabNext();
    } else {
      startRoundTimer();
    }
  } catch (err) {
    // Whatever went wrong, never leave the player stuck on a dead
    // 'grabbing' screen with no controls and no way forward.
    console.error("grabEgg failed, recovering to playing", err);
    if (token === transitionToken) {
      // Don't keep spending tickets in a loop against whatever's actually
      // wrong — stop AUTO here and let the player see the error themselves.
      autoRepeat.value = false;
      autoPlaying.value = false;
      target.hidden = false;
      heldEgg.value = null;
      clawAnim.value = "idle";
      targetEggId.value = null;
      gameState.value = "playing";
      message.value = err instanceof ApiError ? err.message : "เกิดข้อผิดพลาด ลองคีบใหม่อีกครั้ง";
    }
  }
}

// The session's one real play_claw call, fired only once the player has
// already landed on the reveal screen (RewardResult or the popup) instead
// of before it — see grabEgg's isLastGrabOfSession branch. Resolves every
// still-pending placeholder in collectedEggs at once; sessionBatchLoading
// drives a spinner on whichever screen is currently showing in the
// meantime, and each individual reward pops in as soon as this resolves
// even if the player hasn't cracked that particular egg open yet.
async function resolveSessionBatch(token) {
  const pending = collectedEggs.value.filter((e) => e.reward === null);
  sessionBatchLoading.value = true;
  try {
    const data = await clawGameApi.playClaw(lineID.value, pending.length);
    if (token !== transitionToken) return;
    const results = data.results.map(mapResult);
    pending.forEach((e, i) => {
      e.reward = results[i] ? resolveReward(results[i]) : null;
    });
    // Any placeholder that still has no reward ran into the rare stock-
    // shortage case (fewer results came back than pending tickets) —
    // nothing to show for that grab, so drop it rather than leave a
    // permanently-closed egg in the tray.
    collectedEggs.value = collectedEggs.value.filter((e) => e.reward);
    tickets.value = data.ticket.balance;
    coins.value = data.coin;
    stockShortageNote.value =
      data.fully_completed === false
        ? `ได้รับ ${data.results.length} จาก ${pending.length} รางวัลที่ใช้สิทธิ์ไป (ของรางวัลบางส่วนหมดสต็อกระหว่างคีบ)`
        : "";
    if (gameState.value === "result") {
      reward.value = collectedEggs.value[0]?.reward ?? null;
    } else if (gameState.value === "loadingReveal") {
      // The player already confirmed past the popup and has been waiting
      // on this — hand off to BatchSummary now that it's actually ready.
      gameState.value = "summary";
    }
  } catch (err) {
    console.error("resolveSessionBatch failed", err);
    // Never leave the player stuck staring at eggs that will never resolve
    // (RewardResult/BatchSummary both gate their own actions behind a
    // reward actually being there) — drop whatever's still pending, same
    // treatment as a stock shortage, so this screen's own action becomes
    // reachable again.
    collectedEggs.value = collectedEggs.value.filter((e) => e.reward);
    const errMessage = err instanceof ApiError ? err.message : "เกิดข้อผิดพลาด ลองใหม่อีกครั้ง";
    // This call is the whole session's one real spend (see grabEgg's
    // isLastGrabOfSession) — tickets/coin only ever moved locally as an
    // optimistic guess up to this point, so without this they'd stay frozen
    // at their last pre-spend value (e.g. the popup still showing "1 ticket
    // left" forever) whether or not the spend actually went through
    // server-side. Ask the server directly instead of guessing either way.
    try {
      const state = await clawGameApi.getGameState(lineID.value);
      tickets.value = state.ticket.balance;
      coins.value = state.coin;
    } catch {
      /* best effort only — leave the optimistic local values if even this fails */
    }
    if (gameState.value === "result" && !reward.value) {
      // The lone egg itself never resolved — nothing left to show here.
      goHome();
      message.value = errMessage;
    } else if (gameState.value === "loadingReveal") {
      if (collectedEggs.value.length) {
        stockShortageNote.value = errMessage;
        gameState.value = "summary";
      } else {
        // Every pending egg got filtered out above — nothing left to show.
        goHome();
        message.value = errMessage;
      }
    } else {
      stockShortageNote.value = errMessage;
    }
  } finally {
    if (token === transitionToken) sessionBatchLoading.value = false;
  }
}

// Slides the claw over to targetX using the same accelerate/decelerate
// motion as the player's own arrow buttons (see useClawDrive), rather than
// snapping straight there — so an auto-grabbed egg looks like the claw
// actually travelled to it instead of always dropping from wherever the
// last manual move left off. Returns false if a newer transition preempted
// this one, same convention as playGrabAnimation.
async function autoMoveClawTo(targetX, token) {
  const ARRIVE_THRESHOLD = 1.5;
  const MAX_STEPS = 120; // ~3.6s ceiling — well past any real crossing, just a safety net
  if (Math.abs(drive.x.value - targetX) <= ARRIVE_THRESHOLD) return true;

  const dir = targetX > drive.x.value ? 1 : -1;
  drive.press(dir);
  for (let i = 0; i < MAX_STEPS; i++) {
    await delay(30);
    if (token !== transitionToken) {
      drive.release();
      return false;
    }
    const remaining = targetX - drive.x.value;
    // Stop once close enough, or the instant we'd overshoot past the
    // target — mirrors how a player eyeballing the egg lets go.
    if (Math.abs(remaining) <= ARRIVE_THRESHOLD || Math.sign(remaining) !== dir) {
      break;
    }
  }
  drive.release();
  // Let the release's own deceleration settle before the claw drops.
  await delay(220);
  return token === transitionToken;
}

// Called by autoGrabNext before every AUTO grab. Rolls a random zone
// (left/centre/right of the chamber) first, then grabs whichever live egg
// sits closest to it — picking uniformly among whatever's left in the pile could,
// purely by chance, land near the same spot several eggs in a row; rolling
// the zone up front guarantees the claw's travel actually varies each time.
// A plain uniform pick among the 3 zones is *technically* random but still
// streaks in a row often enough (~1 in 9 times back-to-back, worse over a
// longer AUTO session) that it reads as "stuck in the same place" to a
// player watching it happen — excluding whichever zone was just used keeps
// every pick genuinely different from the one right before it.
let lastAutoZone = null;
function pickAutoTarget(liveEggs) {
  const ZONES = [20, 50, 80]; // left / centre / right, same x% units as egg.x
  const candidates = ZONES.filter((z) => z !== lastAutoZone);
  const zoneX = candidates[Math.floor(Math.random() * candidates.length)];
  lastAutoZone = zoneX;
  return [...liveEggs].sort(
    (a, b) => Math.abs(a.x - zoneX) - Math.abs(b.x - zoneX),
  )[0];
}

// Slides the claw to a target the same way a session's every AUTO grab
// does, then hands off to the ordinary grabEgg(): it picks "whichever live
// egg is closest to drive.x", which by now is the egg we just parked on, so
// every AUTO grab — first or fiftieth — rides the exact same spend/API/
// animation path a manual grab takes rather than duplicating it. Called
// once to kick AUTO off (from startRound/toggleAutoRepeat) and again by
// grabEgg's own continuation for as long as AUTO and tickets both hold.
async function autoGrabNext() {
  const token = ++transitionToken;
  autoPlaying.value = true;
  const live = eggs.value.filter((e) => !e.hidden);
  if (!live.length) {
    autoPlaying.value = false;
    return;
  }
  const target = pickAutoTarget(live);

  try {
    // Stay on "playing" (claw idle, just sliding) while lining up over the
    // egg — controlsEnabled already blocks real arrow/grab taps for the
    // whole autoPlaying span, so this doesn't hand control back to the
    // player mid-slide.
    gameState.value = "playing";
    clawAnim.value = "idle";
    const arrived = await autoMoveClawTo(target.x, token);
    if (!arrived) return;

    await grabEgg();
  } catch (err) {
    console.error("autoGrabNext failed, stopping AUTO", err);
    if (token === transitionToken) {
      drive.release();
      autoPlaying.value = false;
      autoRepeat.value = false;
      gameState.value = "playing";
      message.value = "เกิดข้อผิดพลาด ลองคีบใหม่อีกครั้ง";
    }
  }
}

function logReward(r, kind = "grab") {
  historyLog.value.unshift({
    id: ++historySeq,
    ts: Date.now(),
    label: r.label,
    image: r.image || imageForReward(r),
    kind,
    coinValue: r.type === "coin" ? r.value : null,
    // Matches the real API: coin is credited instantly (always claimed),
    // physical prizes start out pending fulfillment.
    claimStatus: r.type === "coin" ? 1 : 0,
  });
}

function celebrate() {
  confetti.value = true;
  beep(660, 0.12);
  setTimeout(() => beep(880, 0.16), 120);
  setTimeout(() => {
    confetti.value = false;
  }, 1600);
}

function drawReward() {
  const total = DEV_REWARDS.reduce((s, r) => s + r.weight, 0);
  let n = Math.random() * total;
  for (const r of DEV_REWARDS) {
    n -= r.weight;
    if (n <= 0) return r;
  }
  return DEV_REWARDS.at(-1);
}

// Confirms past the out-of-tickets popup — the popup only ever shows for
// the 2+ egg case (see grabEgg), a single egg lands straight on RewardResult
// without it. If resolveSessionBatch's one real call is still in flight at
// this point, don't dump the player straight onto BatchSummary with nothing
// to show yet — hold on a dedicated 'loadingReveal' screen (just a spinner
// + label) until it resolves, then resolveSessionBatch itself hands off to
// 'summary' (see its own gameState check). If it's already resolved by the
// time the player confirms, skip that screen entirely. Neither reveal
// screen celebrates on arrival — every egg is still sealed at that point,
// so celebrate() only ever fires from a CrackableEgg's own @open.
function goToReveal() {
  outOfTicketsPopup.value = false;
  if (!collectedEggs.value.length) {
    // Nothing survived resolveSessionBatch (see its error-path filtering) —
    // there'd be nothing to show on BatchSummary.
    goHome();
    return;
  }
  gameState.value = sessionBatchLoading.value ? "loadingReveal" : "summary";
}

// Each tap of a CrackableEgg's crack interaction — shared by RewardResult's
// single egg and every card in BatchSummary's list — same escalating-pitch
// beep + haptic buzz the old dedicated crack screen used per tap.
function onEggCrack(n) {
  beep(320 + n * 35, 0.035);
  if (navigator.vibrate) navigator.vibrate(18);
}

function goHome() {
  transitionToken++;
  stopTimer();
  drive.stop();
  gameState.value = "idle";
  message.value = "";
  outOfTicketsPopup.value = false;
  // Bumping transitionToken alone stops a mid-flight auto-grab chain (see
  // autoGrabNext) at its next await checkpoint, but every one of those
  // checkpoints just returns early without clearing this — reset it here
  // so a fresh session never starts with its first grab wrongly blocked by
  // a leftover autoPlaying flag from the last one.
  autoPlaying.value = false;
  // Leaving the play screen has to actually stop AUTO, not just the current
  // session — otherwise a player backing out mid-cycle would come back to
  // find the button still on (or worse, would rely on transitionToken
  // alone and never quite trust it stopped spending tickets on its own).
  autoRepeat.value = false;
}

async function loadGameState() {
  const data = await clawGameApi.getGameState(lineID.value);
  campaign.value = {
    exchangeRate: data.campaign.exchange_rate,
    exchangeMax: data.campaign.exchange_max,
    bonusMinPoint: data.campaign.bonus_min_point,
    bonusQty: data.campaign.bonus_qty,
  };
  points.value = data.point;
  coins.value = data.coin;
  tickets.value = data.ticket.balance;
  const pending = data.ticket.pending_batch;
  // Every resume already grants its coins the moment play_claw responds
  // (see resumePendingBatch) — the same ticket_id must never be replayed
  // for a second payout. Guard with sessionStorage, not just an in-memory
  // flag: reloading is exactly the scenario being guarded against, so the
  // record has to survive the reload that triggers this function again.
  if (pending && !hasResolvedPendingBatch(pending.ticket_id)) {
    await resumePendingBatch(pending.ticket_id, pending.total);
  }
}

const RESOLVED_BATCH_KEY = "gsClawEgg:resolvedPendingBatchIds";

function hasResolvedPendingBatch(ticketId) {
  try {
    return sessionStorage.getItem(RESOLVED_BATCH_KEY)?.split(",").includes(String(ticketId)) ?? false;
  } catch {
    return false;
  }
}

function markPendingBatchResolved(ticketId) {
  try {
    const seen = sessionStorage.getItem(RESOLVED_BATCH_KEY)?.split(",").filter(Boolean) ?? [];
    seen.push(String(ticketId));
    sessionStorage.setItem(RESOLVED_BATCH_KEY, seen.join(","));
  } catch {
    /* sessionStorage unavailable (private mode, etc.) — best effort only */
  }
}

// Best-effort recovery for a grab left mid-play by an interrupted session
// (network drop, tab closed mid-grab) — there's no claw animation to replay
// here, so just resolve it server-side and land straight on the reveal
// screen with whatever it decided. The color the player actually grabbed
// isn't recoverable (that only ever lived in the client state lost with the
// interrupted tab), so these fall back to the blue icon — same fallback
// used elsewhere (see heldEggColor) whenever a held egg's real color isn't
// known.
async function resumePendingBatch(ticketId, requestedTotal) {
  const data = await clawGameApi.playClaw(lineID.value);
  tickets.value = data.ticket.balance;
  coins.value = data.coin;
  markPendingBatchResolved(ticketId);
  collectedEggs.value = data.results.map((r) => {
    const mapped = mapResult(r);
    return {
      id: collectedEggs.value.length + 1,
      color: "blue",
      src: eggBlue,
      reward: { ...mapped, image: mapped.image || imageForReward(mapped) },
    };
  });
  stockShortageNote.value =
    data.fully_completed === false
      ? `ได้รับ ${data.results.length} จาก ${requestedTotal ?? "?"} รางวัลที่ใช้สิทธิ์ไป (ของรางวัลบางส่วนหมดสต็อกระหว่างคีบ)`
      : "";
  // A batch already settled server-side (e.g. an earlier resume that
  // partially failed after paying out) can legitimately come back empty —
  // nothing left to show, so just stay on whatever screen we're already on.
  if (collectedEggs.value.length === 0) return;
  if (collectedEggs.value.length > 1) {
    gameState.value = "summary";
  } else {
    reward.value = collectedEggs.value[0].reward;
    gameState.value = "result";
  }
}

function mapHistoryRow(row, i) {
  return {
    id: i,
    ts: new Date(row.created_at.replace(" ", "T")).getTime(),
    label: row.reward_name,
    coinValue: row.coin ? Math.abs(row.coin) : null,
    // Only meaningful for physical-prize rows (coin rows just show the
    // coin icon) — real photo from the campaign when the API sent one,
    // else the same name-based guess used everywhere else.
    image: row.reward_img || imageForReward({ label: row.reward_name }),
    kind: "grab",
    // 0 = not yet fulfilled/shipped, 1 = done. Coin rows are credited
    // instantly server-side and always come back claimed (1); only
    // physical-prize rows are ever meaningfully still pending.
    claimStatus: row.claim_status,
  };
}

// "ประวัติการเล่น" shows claw results only — coin-redemptions have their
// own dedicated "ประวัติการแลกรางวัล" screen (see openExchangeHistory)
// now, so merging get_redeem_history in here too would just show every
// redemption in both places.
async function openHistory() {
  gameState.value = "history";
  if (devMode) return;
  historyLoading.value = true;
  try {
    const rows = await clawGameApi.getPlayHistory(lineID.value);
    historyLog.value = rows.map((r, i) => mapHistoryRow(r, i)).sort((a, b) => b.ts - a.ts);
  } catch (err) {
    message.value = err instanceof ApiError ? err.message : "โหลดประวัติไม่สำเร็จ";
  } finally {
    historyLoading.value = false;
  }
}

function mapExchangeRow(row, i) {
  return {
    id: i,
    ts: new Date(row.created_at.replace(" ", "T")).getTime(),
    label: row.reward_name,
    image: row.reward_img || imageForReward({ label: row.reward_name }),
    cost: Math.abs(row.coin),
    claimStatus: row.claim_status,
  };
}

// Separate screen from the merged "ประวัติการเล่น" one above — same
// get_redeem_history data, but shown as its own dedicated "ประวัติการแลก"
// list (matching the home screen's own separate nav button for it) rather
// than folded into the play/redeem combined feed.
async function openExchangeHistory() {
  gameState.value = "exchangeHistory";
  // In dev mode, redeemCoinReward already pushes straight into
  // exchangeHistoryLog — nothing to fetch.
  if (devMode) return;
  exchangeHistoryLoading.value = true;
  try {
    const rows = await clawGameApi.getRedeemHistory(lineID.value);
    exchangeHistoryLog.value = rows.map(mapExchangeRow);
  } catch (err) {
    message.value = err instanceof ApiError ? err.message : "โหลดประวัติการแลกไม่สำเร็จ";
  } finally {
    exchangeHistoryLoading.value = false;
  }
}

async function openRewards() {
  gameState.value = "rewards";
  if (devMode) return;
  try {
    const rows = await clawGameApi.getRedeemList(lineID.value);
    coinCatalog.value = rows.map((r) => ({
      id: r.id,
      label: r.reward_name,
      cost: r.value,
      image: r.reward_img || imageForReward({ label: r.reward_name }),
      qty: r.qty,
    }));
  } catch (err) {
    message.value = err instanceof ApiError ? err.message : "โหลดรายการแลกไม่สำเร็จ";
  }
}

async function enableMotion() {
  try {
    if (
      typeof DeviceMotionEvent !== "undefined" &&
      typeof DeviceMotionEvent.requestPermission === "function"
    ) {
      const result = await DeviceMotionEvent.requestPermission();
      if (result !== "granted") return;
    }
    window.addEventListener("devicemotion", onMotion, { passive: true });
    motionEnabled.value = true;
  } catch {
    message.value =
      "อุปกรณ์นี้ไม่รองรับ Motion แตะที่ป้ายด้านล่างเพื่อกวนไข่แทนได้";
  }
}

// Tapping the shake prompt both opts into real motion detection (so later
// shakes this round work without asking again) and, regardless of whether
// that permission is granted, performs the stir itself right away — so the
// gate never strands a player on a device/browser without a motion sensor.
async function onShakeTap() {
  if (!motionEnabled.value) await enableMotion();
  stirEggs();
}

function onMotion(e) {
  // autoMoveClawTo (see autoGrabNext) deliberately holds gameState at
  // "playing" for however long the claw takes to slide toward
  // a target it already committed to — a real shake landing in that window
  // would restir eggs.value into a fresh set of objects/colors out from
  // under that already-picked target, so the claw ends up gripping (and
  // later revealing) a color that no longer matches what the pile actually
  // shows at that spot. Blocking shakes for the whole autoPlaying span
  // closes that off; a manual grab never has this window (gameState flips
  // to "grabbing" synchronously, before any await).
  if (gameState.value !== "playing" || autoPlaying.value) return;
  const a = e.accelerationIncludingGravity;
  if (!a) return;
  const force = Math.abs(a.x || 0) + Math.abs(a.y || 0) + Math.abs(a.z || 0);
  const now = Date.now();
  if (force > 28 && now - lastShakeAt > 850) {
    lastShakeAt = now;
    stirEggs();
  }
}

// Shared across every beep instead of a fresh AudioContext per call — a
// single grab fires 3 of these within under a second (pause/descend/grip),
// and a full session dozens more, so a new-context-per-beep never got to
// close any of them. Piling up that many live contexts is exactly the kind
// of thing that makes a mobile webview (LINE's in-app browser included)
// stutter or briefly blank the screen under the memory/audio-session churn.
let sharedAudioCtx = null;

function beep(freq = 320, duration = 0.05) {
  if (!soundOn.value) return;
  try {
    if (!sharedAudioCtx) {
      sharedAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = sharedAudioCtx;
    if (ctx.state === "suspended") ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.025, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    /* audio unsupported */
  }
}

function stopTimer() {
  clearInterval(timerId);
}

// Every screen's art loads as large PNGs; rather than gate just the home
// screen, preload every image asset in the app up front so switching
// screens later never pops live text/numbers in ahead of their artwork.
const appReady = ref(false);
const allImages = Object.values(
  import.meta.glob("./assets/**/*.{png,jpg,jpeg,svg,webp}", {
    eager: true,
    import: "default",
  }),
);

function preloadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = resolve;
    img.onerror = resolve;
    img.src = src;
  });
}

onMounted(async () => {
  const imagesDone = Promise.all(allImages.map(preloadImage));
  // ?dev=1 skips LIFF/API entirely and stays fully offline.
  //
  // LIFF check is commented out for now — there's no real LIFF ID yet, so
  // every non-dev load (with or without ?apitest=1) uses the fixed test
  // lineID from .env against the real API instead. Once a real LIFF ID
  // exists, swap the block below back to the initLiff() one to get each
  // player's own lineID instead of everyone sharing the test account.
  let stateDone = Promise.resolve();
  if (!devMode) {
    lineID.value = import.meta.env.VITE_TEST_LINE_ID;
    stateDone = loadGameState();
  }
  // else if (!devMode) {
  //   stateDone = (async () => {
  //     lineID.value = await initLiff();
  //     await loadGameState();
  //   })();
  // }
  try {
    await Promise.all([imagesDone, stateDone]);
    appReady.value = true;
  } catch (err) {
    apiError.value = err?.message || "เชื่อมต่อไม่สำเร็จ ลองใหม่อีกครั้ง";
  }
});

onBeforeUnmount(() => {
  transitionToken++;
  stopTimer();
  window.removeEventListener("devicemotion", onMotion);
});
</script>

<template>
  <main class="app-shell">
    <section
      class="game-phone"
      :style="{ backgroundImage: `url(${hexBg})` }"
    >
      <transition name="preloader-fade">
        <div v-if="!appReady" class="preloader">
          <template v-if="apiError">
            <p class="preloader-label error">{{ apiError }}</p>
          </template>
          <template v-else>
            <span class="preloader-spinner"></span>
            <p class="preloader-label">กำลังโหลด...</p>
          </template>
        </div>
      </transition>

      <header class="hud">
        <img class="gs-badge" :src="gsBatteryBadge" alt="GS Battery" />
        <div class="hud-topbar">
          <img class="hud-topbar-bg" :src="hudTopbar" alt="" />
          <span class="hud-num hud-num-points">{{
            points.toLocaleString()
          }}</span>
          <span class="hud-num hud-num-coin">{{ coins.toLocaleString() }}</span>
          <button
            class="hud-speaker-hit"
            :class="{ muted: !soundOn }"
            @click="soundOn = !soundOn"
            aria-label="เสียง"
          ></button>
        </div>
      </header>

      <transition name="screen" mode="out-in">
        <LimitReached
          v-if="gameState === 'idle' && isLimitReached"
          key="limit"
          @go-home="goHome"
        />

        <section
          v-else-if="gameState === 'idle'"
          key="home"
          class="screen home-screen"
        >
          <img
            class="home-title"
            :src="homeTitleFull"
            alt="GS Claw Egg คีบไข่ลุ้นรางวัล เกมคีบไข่ลุ้นรางวัลจาก GS BATTERY"
          />
          <img class="home-cabinet" :src="cabinetHero" alt="" />
          <button class="img-btn home-start-btn" @click="openTicketScreen">
            <img :src="btnStart" alt="เริ่มเล่น ใช้ 10 Points" />
          </button>

          <div class="home-nav-row">
            <button class="img-btn" @click="openExchangeHistory">
              <img :src="navExchangeHistory" alt="ประวัติการแลก" />
            </button>
            <button class="img-btn" @click="openHistory">
              <img :src="navHistory" alt="ประวัติการเล่น" />
            </button>
            <button class="img-btn" @click="openRewards">
              <img :src="navRewards" alt="แลกรางวัล" />
            </button>
          </div>
          <button
            class="img-btn home-howtoplay-btn"
            @click="gameState = 'howToPlay'"
          >
            <img :src="btnHowToPlayWide" alt="วิธีการเล่น" />
          </button>
          <p v-if="message" class="message">{{ message }}</p>
        </section>

        <section
          v-else-if="gameState === 'exchange' && exchanging"
          key="exchanging"
          class="screen loading-reveal-screen"
        >
          <span class="preloader-spinner"></span>
          <p class="preloader-label">กำลังโหลดหน้าคีบไข่...</p>
        </section>

        <TicketExchange
          v-else-if="gameState === 'exchange'"
          key="exchange"
          :points="points"
          :tickets="tickets"
          :exchanging="exchanging"
          :message="message"
          @back="goHome"
          @start="startFromExchange"
        />

        <HowToPlay
          v-else-if="gameState === 'howToPlay'"
          key="howToPlay"
          @close="goHome"
        />

        <CoinRewards
          v-else-if="gameState === 'rewards'"
          key="rewards"
          :coins="coins"
          :catalog="coinCatalog"
          @back="goHome"
          @redeem="redeemCoinReward"
        />

        <HistoryList
          v-else-if="gameState === 'history'"
          key="history"
          :entries="historyLog"
          :loading="historyLoading"
          @back="goHome"
        />

        <ExchangeHistoryList
          v-else-if="gameState === 'exchangeHistory'"
          key="exchangeHistory"
          :entries="exchangeHistoryLog"
          :loading="exchangeHistoryLoading"
          @back="goHome"
        />

        <GameMachine
          v-else-if="inMachine"
          key="machine"
          :eggs="eggs"
          :claw-x="drive.x.value"
          :claw-anim="clawAnim"
          :target-id="targetEggId"
          :timer="timer"
          :motion-enabled="motionEnabled"
          :controls-enabled="controlsEnabled"
          :message="message"
          :stir-trigger="stirTrigger"
          :tickets="tickets"
          :held-egg-color="heldEgg?.color || 'blue'"
          :needs-stir="needsStir"
          :auto-active="autoRepeat"
          :collected-eggs="collectedEggs"
          @back="goHome"
          @toggle-motion="enableMotion"
          @shake-tap="onShakeTap"
          @toggle-auto="toggleAutoRepeat"
          @move-start="drive.press"
          @move-end="drive.release"
          @grab="grabEgg"
          @stir="stirEggs"
        />

        <section
          v-else-if="gameState === 'loadingReveal'"
          key="loadingReveal"
          class="screen loading-reveal-screen"
        >
          <span class="preloader-spinner"></span>
          <p class="preloader-label">รอสักครู่ กำลังโหลดหน้าของรางวัล</p>
        </section>

        <BatchSummary
          v-else-if="gameState === 'summary'"
          key="summary"
          :eggs="collectedEggs"
          :confetti="confetti"
          :note="stockShortageNote"
          @go-home="goHome"
          @open="celebrate"
          @crack="onEggCrack"
        />

        <RewardResult
          v-else
          key="result"
          :reward="reward"
          :reward-image="rewardImage"
          :confetti="confetti"
          :note="stockShortageNote"
          :egg-src="collectedEggs[0]?.src"
          @go-home="goHome"
          @open="celebrate"
          @crack="onEggCrack"
        />
      </transition>

      <OutOfTicketsPopup
        v-if="outOfTicketsPopup"
        :note="stockShortageNote"
        @confirm="goToReveal"
      />
    </section>
  </main>
</template>
