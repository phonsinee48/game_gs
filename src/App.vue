<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

import eggBlue from "./assets/ui/gameplay/egg-blue.png";
import eggWhite from "./assets/ui/gameplay/egg-white.png";
import eggBlack from "./assets/ui/gameplay/egg-black.png";
import eggSilver from "./assets/ui/gameplay/egg-silver.png";
import coinPile from "./assets/coin-pile.png";
import rewardLotus from "./assets/reward-lotus.svg";
import rewardPtt from "./assets/reward-ptt.svg";
import rewardHomepod from "./assets/reward-homepod.svg";
import gsBatteryBadge from "./assets/ui/common/badge.png";
import hudTopbar from "./assets/ui/common/topbar.png";
import hexBg from "./assets/ui/common/hex-bg.png";
import homeTitleFull from "./assets/ui/home/03.png";
import cabinetHero from "./assets/ui/home/cabinet.png";
import btnStart from "./assets/ui/home/btn-start.png";
import navExchangeHistory from "./assets/ui/home/nav-exchange-history.png";
import navHistory from "./assets/ui/home/nav-history.png";
import navRewards from "./assets/ui/home/nav-rewards.png";
import btnHowToPlayWide from "./assets/ui/home/btn-how-to-play-wide.png";

import GameMachine from "./components/GameMachine.vue";
import EggOpening from "./components/EggOpening.vue";
import RewardResult from "./components/RewardResult.vue";
import TicketExchange from "./components/TicketExchange.vue";
import CoinRewards from "./components/CoinRewards.vue";
import HistoryList from "./components/HistoryList.vue";
import ExchangeHistoryList from "./components/ExchangeHistoryList.vue";
import BatchSummary from "./components/BatchSummary.vue";
import HowToPlay from "./components/HowToPlay.vue";
import LimitReached from "./components/LimitReached.vue";
import { useClawDrive } from "./composables/useClawDrive";
import { clawGameApi, ApiError } from "./lib/api";
import { initLiff } from "./lib/liff";

const ROUND_TIME = 30; // matches the timer shown in the 08_gameplay / 06_claw_success mockups
const FRAMES = 4;
// Matches TicketExchange's max-per-exchange cap (10 tickets + 1 bonus) — the
// most a single round (or a live adjustment on the play screen) can ever use.
const MAX_BATCH = 11;
// How long each egg's own reward stays on screen (see advanceBatch) before
// the batch moves on to the next egg, or to the summary once it was the
// last one — long enough to actually read it, short enough that a 10-egg
// batch doesn't feel like it's stalling.
const BATCH_REVEAL_PAUSE_MS = 1600;
// Extra beat on top of that before AUTO starts the *next round* — the
// reveal pause alone is tuned for "next egg in the same batch", which
// feels rushed as a gap between two separate tickets.
const AUTO_ROUND_PAUSE_MS = 1400;
// Held after the last crack (see tapEgg/autoCrackEgg) just long enough for
// the "กำลังเปิดไข่..." beat + finalFlash pop to read, before cutting to the
// reward screen.
const CRACK_FINISH_PAUSE_MS = 550;

// gameState: idle | exchange | howToPlay | playing | stirring
//          | grabbing | opening | result | summary | rewards | history
//          | exchangeHistory
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
// True while confirmExchange's network call is in flight — the summary
// modal closes the instant it's tapped (see TicketExchange's confirm()),
// well before points/tickets actually update from the response, so
// without this the exchange screen just sits there unchanged with no
// feedback until the request resolves (or, on a slow/dropped request,
// looks stuck indefinitely).
const exchanging = ref(false);
const motionEnabled = ref(false);
const soundOn = ref(true);
// Gates the claw controls at the start of every round until the player
// shakes (or taps the shake prompt) at least once, per the "shake to stir
// before you can grab" flow — cleared the moment that first stir resolves.
const needsStir = ref(true);
const readyMessage = ref("");

const drive = useClawDrive(50);
const clawAnim = ref("idle"); // idle|pause|descend|grip|ascend|settle
const heldEgg = ref(null);
const targetEggId = ref(null);
const crackCount = ref(0);
const reward = ref(null);
const sceneFlash = ref(false);
const confetti = ref(false);
const justCompleted = ref(false);
const stirTrigger = ref(0);
// True from the moment egg #2+ of a batch starts auto-grabbing until it
// finishes cracking — blocks stray taps on the crack screen from racing
// the simulated ones (see autoCrackEgg) while that egg plays out.
const autoPlaying = ref(false);
// Toggled by the play screen's AUTO button — while true, every round
// (first egg included, see autoStartFirstGrab) plays itself out and the
// next one starts right after, with no shake or grab tap needed, until
// the player toggles it off, tickets run out, or something goes wrong.
const autoRepeat = ref(false);

const batchSize = ref(1);
const batchIndex = ref(0);
const batchRewards = ref([]);
// How many tickets this batch is actually revealing one-by-one — normally
// equal to batchSize, set from the real result count once play_claw
// responds so the rare stock-shortage case (fewer results than tickets
// spent) still shows the right "egg x/y" progress instead of overshooting.
const batchTotal = ref(1);
// Set whenever play_claw reports fully_completed:false (a reward ran out of
// stock mid-batch) — shown as a note on the result/summary screen so the
// player understands why they got fewer prizes than tickets spent, instead
// of it looking like some were silently dropped.
const stockShortageNote = ref("");
// True once the claw's own grab choreography has finished (egg already
// visibly gripped) but play_claw's response hasn't come back yet — the
// network round-trip is fired in parallel with that animation (see
// grabEgg), but on a slow connection it can easily outlast it, leaving the
// player looking at a motionless claw with no clue anything is still
// happening. Drives a spinner + message on the play screen for exactly
// that gap, cleared in every grabEgg exit path (success or error).
const awaitingResult = ref(false);
const historyLog = ref([]);
const exchangeHistoryLog = ref([]);
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
const baseEggs = [
  [13, 73, -9],
  [23, 68, 6],
  [36, 68, -4],
  [45, 70, 5],
  [61, 68, -7],
  [73, 68, 7],
  [82, 66, -4],
  [17, 82, 5],
  [36, 82, -7],
  [50, 82, 2],
  [66, 82, -3],
  [83, 83, 8],
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
    // the claw over to the next egg (see autoMoveClawTo) — without this,
    // that would also flip the arrow/grab buttons back on and let a player
    // tap fight the auto-slide for control of the claw mid-batch.
    !autoPlaying.value,
);
// Only set once a batch (>1 ticket) is actually mid-reveal — drives
// RewardResult's "egg x/y" caption in place of its usual play-again/home
// actions, since the app itself advances to the next egg (or the summary)
// a moment later without any tap needed.
const batchRevealProgress = computed(() =>
  batchSize.value > 1
    ? { current: batchRewards.value.length, total: batchTotal.value }
    : null,
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

function ticketsForAmount(amount) {
  const base = Math.floor(amount / campaign.value.exchangeRate);
  const bonus = amount >= campaign.value.bonusMinPoint ? campaign.value.bonusQty : 0;
  return { base, bonus, total: base + bonus };
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function confirmExchange(amount) {
  if (amount > points.value || amount < campaign.value.exchangeRate) return;
  if (devMode) {
    const { total, bonus } = ticketsForAmount(amount);
    points.value -= amount;
    tickets.value += total;
    message.value = bonus
      ? `แลกสำเร็จ! ได้รับ ${total} สิทธิ์ (รวมโบนัส +${bonus})`
      : `แลกสำเร็จ! ได้รับ ${total} สิทธิ์`;
    gameState.value = "exchange";
    return;
  }
  message.value = "";
  exchanging.value = true;
  try {
    const data = await clawGameApi.exchangeTicket(lineID.value, amount);
    points.value = data.point;
    tickets.value = data.ticket.balance;
    const bonus = amount >= campaign.value.bonusMinPoint ? campaign.value.bonusQty : 0;
    message.value = bonus
      ? `แลกสำเร็จ! ได้รับ ${data.ticket_gained} สิทธิ์ (รวมโบนัส +${bonus})`
      : `แลกสำเร็จ! ได้รับ ${data.ticket_gained} สิทธิ์`;
    gameState.value = "exchange";
  } catch (err) {
    message.value = err instanceof ApiError ? err.message : "แลกสิทธิ์ไม่สำเร็จ ลองใหม่อีกครั้ง กดยืนยันแลกใหม่อีกครั้ง";
  } finally {
    exchanging.value = false;
  }
}

function openTicketScreen() {
  if (devMode) {
    batchSize.value = 1;
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

// The exchange screen's own "เริ่มเกม" button always starts a single round
// — batch size beyond 1 is chosen live on the play screen itself (see
// GameMachine's ticket-row stepper / adjustBatchQty), not here.
function startFromExchange() {
  if (!canPlayBatch.value) return;
  batchSize.value = 1;
  batchIndex.value = 0;
  batchRewards.value = [];
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
  batchIndex.value++;
  eggs.value = makeEggs();
  drive.setX(50);
  clawAnim.value = "idle";
  heldEgg.value = null;
  targetEggId.value = null;
  crackCount.value = 0;
  justCompleted.value = false;
  autoPlaying.value = false;
  awaitingResult.value = false;
  reward.value = null;
  // advanceBatch indexes pendingResults by batchRewards.value.length — the
  // manual "play again" paths already reset this themselves before calling
  // startRound(), but AUTO's own repeat loop (startNextAutoRound) calls
  // straight into startRound() with last round's rewards still sitting
  // here. Left stale, the very next round's single result lands at index 1
  // instead of 0 (out of bounds -> undefined), and mapResult(undefined)
  // throws, freezing the crack screen right after the last tap since
  // nothing catches it. Resetting here once covers every entry point.
  batchRewards.value = [];
  stockShortageNote.value = "";
  sceneFlash.value = false;
  timer.value = ROUND_TIME;
  gameState.value = "playing";
  // AUTO (see toggleAutoRepeat) skips the shake gate entirely — a mode
  // that's supposed to run hands-off until the player turns it off
  // shouldn't still make them shake first every single round.
  needsStir.value = !autoRepeat.value;
  readyMessage.value =
    batchSize.value > 1 ? `รอบ ${batchIndex.value}/${batchSize.value}` : "";
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

  if (autoRepeat.value) autoStartFirstGrab();
}

// Lets the player fine-tune how many eggs this round will open directly on
// the play screen (before grabbing) — the exchange screen's "เริ่มเกม"
// always starts at 1, so this is the only place batch size goes up.
// `tickets` is the real (unspent) balance the whole time — nothing is
// reserved locally, so this only has to clamp the on-screen choice.
// Wired to the play screen's AUTO toggle. Turning it off just stops the
// *next* round from starting (every in-flight auto step already checks
// autoRepeat before continuing — see advanceBatch/startNextAutoRound); the
// current egg still finishes playing out rather than cutting off mid-
// animation. Turning it on mid-round, before that round's own grab has
// happened yet, takes over right away instead of leaving the player to
// still shake/tap first.
function toggleAutoRepeat() {
  autoRepeat.value = !autoRepeat.value;
  if (!autoRepeat.value) return;

  if (["playing", "stirring"].includes(gameState.value) && !autoPlaying.value) {
    needsStir.value = false;
    autoStartFirstGrab();
  }
}

function adjustBatchQty(nextQty) {
  if (!["playing", "stirring"].includes(gameState.value)) return;
  const maxTotal = Math.min(MAX_BATCH, tickets.value);
  const clamped = Math.max(1, Math.min(nextQty, maxTotal));
  if (clamped === batchSize.value) return;
  batchSize.value = clamped;
  message.value = "";
}

function startRoundTimer() {
  if (devMode) return;
  timerId = setInterval(() => {
    timer.value--;
    if (timer.value <= 0) {
      stopTimer();
      grabEgg(true);
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
      message.value = readyMessage.value;
      startRoundTimer();
    }
  });
}

// Holds whatever play_claw returned for the round currently in progress,
// consumed by advanceBatch one egg at a time as each one finishes
// cracking — every reward in the batch is decided here (grab-time), just
// not shown yet.
let pendingResults = [];

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
  await delay(90);
  if (token !== transitionToken) return false;

  clawAnim.value = "descend";
  beep(180, 0.08);
  await delay(380);
  if (token !== transitionToken) return false;

  target.hidden = true;
  settleNearbyEggs(target);
  heldEgg.value = target;
  clawAnim.value = "grip";
  beep(420, 0.07);
  await delay(160);
  if (token !== transitionToken) return false;

  clawAnim.value = "ascend";
  await delay(380);
  if (token !== transitionToken) return false;

  clawAnim.value = "settle";
  await delay(140);
  return token === transitionToken;
}

// autoAdvance: true only when AUTO's own autoStartFirstGrab is driving
// this — the crack that follows plays itself out (autoCrackEgg) instead
// of waiting on taps, same as egg #2+ of a batch already does.
async function grabEgg(auto = false, autoAdvance = false) {
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
  message.value = auto ? "หมดเวลา ระบบกำลังคีบให้อัตโนมัติ" : "";
  // Assumed equal to batchSize until the real response (if any) comes back
  // and refines it — see the stock-shortage note below.
  batchTotal.value = batchSize.value;

  // Fire the real play the moment the grab is committed, so the network
  // round-trip overlaps the descend/grip/ascend animation below instead of
  // adding its own wait after the crack finishes. Only awaited just before
  // we actually need the results. One call resolves every ticket in this
  // batch at once — egg #2 onward (see autoGrabNext) just replays the
  // grab/crack choreography per egg against results already in hand, no
  // repeat network round-trip needed.
  const playPromise = devMode ? null : clawGameApi.playClaw(lineID.value, batchSize.value);

  try {
    const ok = await playGrabAnimation(token, target);
    if (!ok) return;

    if (!devMode) {
      // The animation is done (egg visibly gripped) but the network call
      // fired back at the top of this function may well still be in
      // flight — show that explicitly rather than leaving the claw just
      // sitting there with no explanation.
      awaitingResult.value = true;
      message.value = "กำลังเปิดไข่...";
      const data = await playPromise;
      awaitingResult.value = false;
      pendingResults = data.results;
      batchTotal.value = data.results.length;
      tickets.value = data.ticket.balance;
      coins.value = data.coin;
      stockShortageNote.value =
        data.fully_completed === false
          ? `ได้รับ ${data.results.length} จาก ${batchSize.value} รางวัลที่ใช้สิทธิ์ไป (ของรางวัลบางส่วนหมดสต็อกระหว่างคีบ)`
          : "";
    }

    proceedToOpening(token, autoAdvance);
  } catch (err) {
    // Whatever went wrong, never leave the player stuck on a dead
    // 'grabbing' screen with no controls and no way forward.
    console.error("grabEgg failed, recovering to playing", err);
    awaitingResult.value = false;
    if (token === transitionToken) {
      // Don't keep spending tickets in a loop against whatever's actually
      // wrong — stop AUTO here and let the player see the error themselves.
      autoRepeat.value = false;
      target.hidden = false;
      heldEgg.value = null;
      clawAnim.value = "idle";
      targetEggId.value = null;
      gameState.value = "playing";
      message.value = err instanceof ApiError ? err.message : "เกิดข้อผิดพลาด ลองคีบใหม่อีกครั้ง";
    }
  }
}

// Egg #2 onward in a batch (n > 1): the first egg is the player's own grab
// (see grabEgg); every ticket's reward already came back from that same
// play_claw call (pendingResults), so the rest of the batch just replays
// the grab + crack choreography per egg — purely visual, no further API
// calls or player input — until every ticket's been shown.
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

// Shared by autoGrabNext (rest of a batch) and autoStartFirstGrab (a whole
// round auto-played via the AUTO toggle). Rolls a random zone (left/centre/
// right of the chamber) first, then grabs whichever live egg sits closest
// to it — picking uniformly among whatever's left in the pile could,
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

async function autoGrabNext() {
  const token = ++transitionToken;
  autoPlaying.value = true;
  const live = eggs.value.filter((e) => !e.hidden);
  const eggNum = batchRewards.value.length + 1;
  if (!live.length) {
    // Shouldn't happen (12 egg slots vs. MAX_BATCH 11) but never strand the
    // player on a dead scene if it somehow does.
    console.error("autoGrabNext: no eggs left in pile, finishing batch early");
    autoPlaying.value = false;
    gameState.value = "summary";
    celebrate();
    return;
  }
  const target = pickAutoTarget(live);

  try {
    // Stay on "playing" (claw idle, just sliding) while lining up over the
    // egg — controlsEnabled already blocks real arrow/grab taps for the
    // whole autoPlaying span, so this doesn't hand control back to the
    // player mid-batch.
    gameState.value = "playing";
    clawAnim.value = "idle";
    message.value = `ระบบกำลังเลื่อนตัวคีบไปยังไข่ฟองที่ ${eggNum}/${batchSize.value}...`;
    const arrived = await autoMoveClawTo(target.x, token);
    if (!arrived) return;

    targetEggId.value = target.id;
    gameState.value = "grabbing";
    message.value = `ระบบกำลังคีบไข่ฟองที่ ${eggNum}/${batchSize.value} ให้อัตโนมัติ...`;

    const ok = await playGrabAnimation(token, target);
    if (!ok) return;
    await proceedToOpening(token, true);
  } catch (err) {
    console.error("autoGrabNext failed, closing out the batch with what we have", err);
    if (token === transitionToken) {
      drive.release();
      autoPlaying.value = false;
      gameState.value = "summary";
      celebrate();
    }
  }
}

// Kicks off a round's own first egg when AUTO (see toggleAutoRepeat) is on
// — startRound() already skipped the shake gate, so nothing else is
// waiting on the player here. Slides the claw to a target the same way
// autoGrabNext does, then hands off to the ordinary grabEgg(): it picks
// "whichever live egg is closest to drive.x", which by now is the egg we
// just parked on, so this rides the exact same spend/API/animation path a
// manual grab takes rather than duplicating it.
async function autoStartFirstGrab() {
  const token = ++transitionToken;
  autoPlaying.value = true;
  const live = eggs.value.filter((e) => !e.hidden);
  if (!live.length) {
    autoPlaying.value = false;
    return;
  }
  const target = pickAutoTarget(live);

  gameState.value = "playing";
  clawAnim.value = "idle";
  message.value = "ระบบกำลังคีบให้อัตโนมัติ...";
  const arrived = await autoMoveClawTo(target.x, token);
  if (!arrived || token !== transitionToken) return;

  await grabEgg(false, true);
}

// autoAdvance: true for egg #2+ of a batch (see autoGrabNext) — the crack
// itself plays out on its own (autoCrackEgg) instead of waiting on taps.
async function proceedToOpening(token, autoAdvance = false) {
  if (token !== transitionToken) return;
  sceneFlash.value = true;
  await delay(180);
  if (token !== transitionToken) return;

  gameState.value = "opening";
  sceneFlash.value = false;
  clawAnim.value = "idle";
  crackCount.value = 0;
  justCompleted.value = false;

  if (autoAdvance) {
    await autoCrackEgg(token);
    return;
  }
  message.value =
    batchSize.value > 1
      ? `แตะที่ไข่ย้ำ ๆ ให้แตกครบ ${FRAMES} ครั้ง เพื่อเปิดฟองแรก อีก ${batchSize.value - 1} ฟองที่เหลือระบบจะคีบและเปิดให้อัตโนมัติ`
      : `แตะที่ไข่ย้ำ ๆ ให้แตกครบ ${FRAMES} ครั้ง`;
}

async function tapEgg() {
  if (
    gameState.value !== "opening" ||
    crackCount.value >= FRAMES ||
    autoPlaying.value
  )
    return;
  crackCount.value += 1;
  beep(320 + crackCount.value * 35, 0.035);
  if (navigator.vibrate) navigator.vibrate(18);
  if (crackCount.value >= FRAMES) {
    const token = transitionToken;
    justCompleted.value = true;
    message.value = "กำลังเปิดไข่...";
    beep(760, 0.1);
    await delay(CRACK_FINISH_PAUSE_MS);
    if (token !== transitionToken) return;
    // justCompleted resets on the next round's setup, not here — this
    // screen is about to be replaced, so reverting it now just snaps the
    // egg back to fully visible for a frame before the transition covers it.
    advanceBatch();
  }
}

// Simulates the same taps tapEgg() takes from the player, at a steady
// pace, for every egg after the first in a batch — autoPlaying (set by
// autoGrabNext) keeps a stray real tap from racing these.
async function autoCrackEgg(token) {
  message.value = "ระบบกำลังเปิดไข่ให้อัตโนมัติ...";
  for (let i = 0; i < FRAMES; i++) {
    await delay(340);
    if (token !== transitionToken) return;
    crackCount.value += 1;
    beep(320 + crackCount.value * 35, 0.035);
  }
  justCompleted.value = true;
  message.value = "กำลังเปิดไข่...";
  beep(760, 0.1);
  await delay(CRACK_FINISH_PAUSE_MS);
  if (token !== transitionToken) return;
  advanceBatch();
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

// Called once per egg's crack completing, whether that egg was the
// player's own (tapEgg) or an auto-played one (autoCrackEgg). Reveals
// that egg's already-known reward, then either sends the claw after the
// next egg in the batch or, once every ticket's been shown, wraps the
// round up.
// Called once per egg's crack completing, whether that egg was the
// player's own (tapEgg) or an auto-played one (autoCrackEgg). Every egg —
// including the last one in a batch — gets its own reward reveal; a
// batch just auto-advances off of that reveal a beat later (to the next
// egg, or to the summary once it was the last one) instead of waiting on
// a tap the way a single play does.
function advanceBatch() {
  let r;
  if (devMode) {
    r = drawReward();
    if (r.type === "coin") coins.value += r.value;
    logReward(r);
  } else {
    r = mapResult(pendingResults[batchRewards.value.length]);
  }

  reward.value = r;
  batchRewards.value.push(r);
  autoPlaying.value = false;
  gameState.value = "result";
  celebrate();

  if (batchSize.value === 1) {
    if (autoRepeat.value) startNextAutoRound();
    return;
  }

  const token = transitionToken;
  const isLastEgg = batchRewards.value.length >= batchTotal.value;
  setTimeout(() => {
    if (token !== transitionToken) return;
    if (isLastEgg) {
      gameState.value = "summary";
      celebrate();
      if (autoRepeat.value) startNextAutoRound();
    } else {
      autoGrabNext();
    }
  }, BATCH_REVEAL_PAUSE_MS);
}

// AUTO (see toggleAutoRepeat): once a round's very last reveal has had its
// moment on screen, wait one more beat — this pause is tuned for "between
// two separate tickets", a bit more breathing room than the one between
// eggs of the same batch — then start the next round, unless the player
// switched AUTO off (or navigated away entirely) during that wait.
function startNextAutoRound() {
  const token = transitionToken;
  setTimeout(() => {
    if (token !== transitionToken || !autoRepeat.value) return;
    // Out of tickets: startRound() would otherwise call goHome() right out
    // from under whatever reward/summary screen the player is currently
    // looking at, bouncing them back to the home screen a beat after AUTO's
    // very last reward appears with no action on their part. Stop the loop
    // here instead and just leave that screen up — same as running out
    // mid-AUTO always should have felt, they can back out (or exchange for
    // more) themselves whenever they're done looking.
    if (!devMode && tickets.value < 1) {
      autoRepeat.value = false;
      return;
    }
    // The manual "play again" paths (playAgain/playMoreFromSummary) reset
    // batchSize to 1 before every fresh round, so this never comes up for
    // them — but AUTO keeps reusing whatever batch size was already
    // selected, and tickets only ever go down round to round. Without this
    // clamp, a later round could ask play_claw for more tickets than are
    // actually left.
    if (!devMode) {
      batchSize.value = Math.max(1, Math.min(batchSize.value, tickets.value));
    }
    startRound();
  }, AUTO_ROUND_PAUSE_MS);
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

function playAgain() {
  if (!devMode && !canPlayBatch.value) {
    goHome();
    return;
  }
  batchSize.value = 1;
  batchIndex.value = 0;
  batchRewards.value = [];
  startRound();
}

function playMoreFromSummary() {
  if (!canPlayBatch.value) {
    goHome();
    return;
  }
  batchSize.value = 1;
  batchIndex.value = 0;
  batchRewards.value = [];
  startRound();
}

function goHome() {
  transitionToken++;
  stopTimer();
  drive.stop();
  gameState.value = "idle";
  message.value = "";
  // Bumping transitionToken alone stops a mid-flight auto-grab chain (see
  // autoGrabNext/autoCrackEgg) at its next await checkpoint, but every one
  // of those checkpoints just returns early without clearing this — reset
  // it here so a fresh round never starts with the first egg's own tap
  // wrongly blocked by a leftover autoPlaying flag from the last one.
  autoPlaying.value = false;
  // Leaving the play screen has to actually stop AUTO, not just the current
  // round — otherwise a player backing out mid-cycle would come back to
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

// Best-effort recovery for a batch left mid-play by an interrupted session
// (network drop, tab closed mid-grab) — there's no claw/crack animation to
// replay here, so just resolve it server-side and land straight on the
// reveal screen with whatever it decided.
async function resumePendingBatch(ticketId, requestedTotal) {
  const data = await clawGameApi.playClaw(lineID.value);
  tickets.value = data.ticket.balance;
  coins.value = data.coin;
  markPendingBatchResolved(ticketId);
  batchRewards.value = data.results.map(mapResult);
  batchSize.value = batchRewards.value.length;
  stockShortageNote.value =
    data.fully_completed === false
      ? `ได้รับ ${data.results.length} จาก ${requestedTotal ?? "?"} รางวัลที่ใช้สิทธิ์ไป (ของรางวัลบางส่วนหมดสต็อกระหว่างคีบ)`
      : "";
  // A batch already settled server-side (e.g. an earlier resume that
  // partially failed after paying out) can legitimately come back empty —
  // nothing left to show, so just stay on whatever screen we're already on.
  if (batchSize.value === 0) return;
  if (batchSize.value > 1) {
    gameState.value = "summary";
  } else {
    reward.value = batchRewards.value[0];
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
  try {
    const rows = await clawGameApi.getPlayHistory(lineID.value);
    historyLog.value = rows.map((r, i) => mapHistoryRow(r, i)).sort((a, b) => b.ts - a.ts);
  } catch (err) {
    message.value = err instanceof ApiError ? err.message : "โหลดประวัติไม่สำเร็จ";
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
  try {
    const rows = await clawGameApi.getRedeemHistory(lineID.value);
    exchangeHistoryLog.value = rows.map(mapExchangeRow);
  } catch (err) {
    message.value = err instanceof ApiError ? err.message : "โหลดประวัติการแลกไม่สำเร็จ";
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
    message.value = "เปิด Motion แล้ว";
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
  // autoMoveClawTo (see autoGrabNext/autoStartFirstGrab) deliberately holds
  // gameState at "playing" for however long the claw takes to slide toward
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

function beep(freq = 320, duration = 0.05) {
  if (!soundOn.value) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
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
      :class="{ flash: sceneFlash }"
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

        <TicketExchange
          v-else-if="gameState === 'exchange'"
          key="exchange"
          :points="points"
          :tickets="tickets"
          :exchanging="exchanging"
          :message="message"
          @back="goHome"
          @confirm="confirmExchange"
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
          @back="goHome"
        />

        <ExchangeHistoryList
          v-else-if="gameState === 'exchangeHistory'"
          key="exchangeHistory"
          :entries="exchangeHistoryLog"
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
          :batch-size="batchSize"
          :max-batch="MAX_BATCH"
          :held-egg-color="heldEgg?.color || 'blue'"
          :needs-stir="needsStir"
          :awaiting-result="awaitingResult"
          @back="goHome"
          @toggle-motion="enableMotion"
          @shake-tap="onShakeTap"
          @move-start="drive.press"
          @move-end="drive.release"
          @grab="grabEgg(false)"
          @stir="stirEggs"
          @adjust-qty="adjustBatchQty"
        />

        <EggOpening
          v-else-if="gameState === 'opening'"
          key="opening"
          :crack-count="crackCount"
          :frames="FRAMES"
          :message="message"
          :just-completed="justCompleted"
          :egg-color="heldEgg?.color || 'blue'"
          @tap="tapEgg"
        />

        <BatchSummary
          v-else-if="gameState === 'summary'"
          key="summary"
          :rewards="batchRewards"
          :tickets="tickets"
          :confetti="confetti"
          :note="stockShortageNote"
          @play-more="playMoreFromSummary"
          @go-home="goHome"
        />

        <RewardResult
          v-else
          key="result"
          :reward="reward"
          :reward-image="rewardImage"
          :can-play="canPlayBatch"
          :confetti="confetti"
          :note="stockShortageNote"
          :batch-progress="batchRevealProgress"
          :auto-continuing="batchSize === 1 && autoRepeat"
          @play-again="playAgain"
          @go-home="goHome"
        />
      </transition>

      <!-- Lives outside the screen transition on purpose: AUTO cycles
           through playing/grabbing/opening/result/summary every round, and
           GameMachine (which used to own this button) only renders during
           a few of those — the button kept disappearing mid-cycle, making
           it nearly impossible to reliably tap off. Anchored to
           .game-phone instead so it stays put and clickable for the whole
           cycle; hidden outside it so it doesn't clutter unrelated screens
           (home, exchange, history, ...). -->
      <button
        v-if="['playing', 'stirring', 'grabbing', 'opening', 'result', 'summary'].includes(gameState)"
        class="auto-toggle-fab"
        :class="{ active: autoRepeat }"
        @click="toggleAutoRepeat"
      >
        <span class="auto-toggle-fab-dot"></span>
        AUTO
      </button>
    </section>
  </main>
</template>
