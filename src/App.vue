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
import navHowToPlay from "./assets/ui/home/nav-how-to-play.png";
import navHistory from "./assets/ui/home/nav-history.png";
import navRewards from "./assets/ui/home/nav-rewards.png";
import coinNoteBanner from "./assets/ui/how-to-play/note.png";

import GameMachine from "./components/GameMachine.vue";
import EggOpening from "./components/EggOpening.vue";
import RewardResult from "./components/RewardResult.vue";
import TicketExchange from "./components/TicketExchange.vue";
import BatchPicker from "./components/BatchPicker.vue";
import CoinRewards from "./components/CoinRewards.vue";
import HistoryList from "./components/HistoryList.vue";
import BatchSummary from "./components/BatchSummary.vue";
import HowToPlay from "./components/HowToPlay.vue";
import LimitReached from "./components/LimitReached.vue";
import { useClawDrive } from "./composables/useClawDrive";

const EXCHANGE_RATE = 10; // points per ticket
const EXCHANGE_MAX = 100; // max points per exchange, grants +1 bonus ticket
const ROUND_TIME = 30; // matches the timer shown in the 08_gameplay / 06_claw_success mockups
const FRAMES = 4;
// Matches TicketExchange's max-per-exchange cap (10 tickets + 1 bonus) — the
// most a single round (or a live adjustment on the play screen) can ever use.
const MAX_BATCH = 11;

// gameState: idle | exchange | batchPick | howToPlay | playing | stirring
//          | grabbing | opening | result | summary | rewards | history
// ?dev=1 skips ticket/point cost and the round timer so the claw screen
// can be reached repeatedly while iterating on its UI.
const devMode = new URLSearchParams(window.location.search).get("dev") === "1";

const gameState = ref("idle");
const points = ref(120);
const coins = ref(1250);
const tickets = ref(0);
const timer = ref(ROUND_TIME);
const message = ref("");
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

const batchSize = ref(1);
const batchIndex = ref(0);
const batchRewards = ref([]);
const batchRevealIndex = ref(0);
const historyLog = ref([]);
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

function makeEggs() {
  return baseEggs.map(([x, y, rot], i) => {
    const { src, color } = eggPool[i % eggPool.length];
    return { id: i + 1, x, y, rot, src, color, hidden: false };
  });
}

const eggs = ref(makeEggs());

// Weighted reward draw, synced to "GS Game.pdf" p.3's official rate table.
const rewards = [
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

// Coin-shop catalog, synced to "GS Game.pdf" p.4-5's official prices.
const coinCatalog = [
  {
    id: "lotus100",
    label: "บัตรกำนัล Lotus 100 บาท",
    cost: 300,
    image: rewardLotus,
  },
  {
    id: "lotus200",
    label: "บัตรกำนัล Lotus 200 บาท",
    cost: 600,
    image: rewardLotus,
  },
  {
    id: "lotus300",
    label: "บัตรกำนัล Lotus 300 บาท",
    cost: 900,
    image: rewardLotus,
  },
  {
    id: "ptt500",
    label: "บัตรกำนัล ปตท. 500 บาท",
    cost: 1500,
    image: rewardPtt,
  },
  {
    id: "ptt1000",
    label: "บัตรกำนัล ปตท. 1,000 บาท",
    cost: 3000,
    image: rewardPtt,
  },
  { id: "homepod", label: "HomePod mini", cost: 11670, image: rewardHomepod },
];

const canExchange = computed(() => points.value >= EXCHANGE_RATE);
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
    !needsStir.value,
);

function imageForReward(r) {
  if (!r || r.type === "coin") return coinPile;
  if (r.label.includes("HomePod")) return rewardHomepod;
  if (r.label.includes("ปตท")) return rewardPtt;
  if (r.label.includes("Lotus")) return rewardLotus;
  return coinPile;
}

const rewardImage = computed(() => imageForReward(reward.value));

function ticketsForAmount(amount) {
  const base = Math.floor(amount / EXCHANGE_RATE);
  const bonus = amount >= EXCHANGE_MAX ? 1 : 0;
  return { base, bonus, total: base + bonus };
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function confirmExchange(amount) {
  if (amount > points.value || amount < EXCHANGE_RATE) return;
  const { total, bonus } = ticketsForAmount(amount);
  points.value -= amount;
  tickets.value += total;
  message.value = bonus
    ? `แลกสำเร็จ! ได้รับ ${total} สิทธิ์ (รวมโบนัส +${bonus})`
    : `แลกสำเร็จ! ได้รับ ${total} สิทธิ์`;
  gameState.value = "batchPick";
}

function exchangeMore() {
  gameState.value = "exchange";
}

function openBatchPick() {
  if (devMode) {
    batchSize.value = 1;
    startRound();
    return;
  }
  if (canPlayBatch.value) {
    gameState.value = "batchPick";
  } else if (canExchange.value) {
    gameState.value = "exchange";
  }
  // otherwise isLimitReached is true and the home screen already shows
  // the LimitReached screen instead of this button.
}

function confirmBatch(size) {
  const n = Math.max(1, Math.min(size, tickets.value));
  batchIndex.value = 0;
  batchRewards.value = [];
  if (n === 1) {
    batchSize.value = 1;
    startRound();
  } else {
    startBatchRound(n);
  }
}

// Batch mode (n > 1): the claw grabs once and the egg is tapped open once,
// then every ticket's reward is resolved together and shown as a list —
// the player never repeats the grab/crack animation per ticket.
function startBatchRound(n) {
  if (n < 1 || tickets.value < n) {
    goHome();
    return;
  }
  stopTimer();
  transitionToken++;
  tickets.value -= n;
  batchSize.value = n;
  eggs.value = makeEggs();
  drive.setX(50);
  clawAnim.value = "idle";
  heldEgg.value = null;
  targetEggId.value = null;
  crackCount.value = 0;
  justCompleted.value = false;
  reward.value = null;
  sceneFlash.value = false;
  timer.value = ROUND_TIME;
  gameState.value = "playing";
  needsStir.value = true;
  readyMessage.value = "";
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
}

function redeemCoinReward(item) {
  if (coins.value < item.cost) return;
  coins.value -= item.cost;
  historyLog.value.unshift({
    id: ++historySeq,
    ts: Date.now(),
    label: item.label,
    image: item.image,
    kind: "redeem",
    coinValue: item.cost,
  });
  message.value = `แลก ${item.label} สำเร็จ!`;
}

function startRound() {
  if (!devMode && tickets.value < 1) {
    goHome();
    return;
  }
  stopTimer();
  transitionToken++;
  if (!devMode) tickets.value--;
  batchIndex.value++;
  eggs.value = makeEggs();
  drive.setX(50);
  clawAnim.value = "idle";
  heldEgg.value = null;
  targetEggId.value = null;
  crackCount.value = 0;
  justCompleted.value = false;
  reward.value = null;
  sceneFlash.value = false;
  timer.value = ROUND_TIME;
  gameState.value = "playing";
  needsStir.value = true;
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
}

// Lets the player fine-tune how many eggs this round will open directly on
// the play screen (before grabbing), mirroring BatchPicker's own stepper.
// `tickets` stays the un-committed pool shown as "สิทธิ์คงเหลือ" here; any
// increase/decrease just moves the difference between that pool and the
// already-reserved batchSize, capped at MAX_BATCH total either way.
function adjustBatchQty(nextQty) {
  if (!["playing", "stirring"].includes(gameState.value)) return;
  const maxTotal = Math.min(MAX_BATCH, tickets.value + batchSize.value);
  const clamped = Math.max(1, Math.min(nextQty, maxTotal));
  const delta = clamped - batchSize.value;
  if (delta === 0) return;
  tickets.value -= delta;
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

async function grabEgg(auto = false) {
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
  message.value = auto ? "หมดเวลา ระบบกำลังคีบให้อัตโนมัติ" : "กำลังคีบ...";

  try {
    clawAnim.value = "pause";
    beep(220, 0.05);
    await delay(140);
    if (token !== transitionToken) return;

    clawAnim.value = "descend";
    beep(180, 0.08);
    await delay(500);
    if (token !== transitionToken) return;

    target.hidden = true;
    heldEgg.value = target;
    clawAnim.value = "grip";
    beep(420, 0.07);
    await delay(200);
    if (token !== transitionToken) return;

    clawAnim.value = "ascend";
    await delay(500);
    if (token !== transitionToken) return;

    clawAnim.value = "settle";
    await delay(160);
    if (token !== transitionToken) return;

    proceedToOpening(token);
  } catch (err) {
    // Whatever went wrong, never leave the player stuck on a dead
    // 'grabbing' screen with no controls and no way forward.
    console.error("grabEgg failed, recovering to playing", err);
    if (token === transitionToken) {
      clawAnim.value = "idle";
      targetEggId.value = null;
      gameState.value = "playing";
      message.value = "เกิดข้อผิดพลาด ลองคีบใหม่อีกครั้ง";
    }
  }
}

async function proceedToOpening(token) {
  if (token !== transitionToken) return;
  sceneFlash.value = true;
  await delay(240);
  if (token !== transitionToken) return;

  gameState.value = "opening";
  sceneFlash.value = false;
  clawAnim.value = "idle";
  crackCount.value = 0;
  justCompleted.value = false;
  message.value =
    batchSize.value > 1
      ? `แตะที่ไข่เพื่อเปิดพร้อมกันทั้งหมด ${batchSize.value} ฟอง`
      : `แตะที่ไข่ย้ำ ๆ ให้แตกครบ ${FRAMES} ครั้ง`;
}

async function tapEgg() {
  if (gameState.value !== "opening" || crackCount.value >= FRAMES) return;
  const batchMode = batchSize.value > 1;
  crackCount.value = batchMode ? FRAMES : crackCount.value + 1;
  beep(320 + crackCount.value * 35, 0.035);
  if (navigator.vibrate) navigator.vibrate(18);
  if (crackCount.value >= FRAMES) {
    const token = transitionToken;
    justCompleted.value = true;
    message.value = "กำลังเปิดไข่...";
    beep(760, 0.1);
    await delay(480);
    if (token !== transitionToken) return;
    // justCompleted resets on the next round's setup, not here — this
    // screen is about to be replaced, so reverting it now just snaps the
    // egg back to fully visible for a frame before the transition covers it.
    if (batchMode) resolveBatchAll();
    else revealReward();
  }
}

function logReward(r, kind = "grab") {
  historyLog.value.unshift({
    id: ++historySeq,
    ts: Date.now(),
    label: r.label,
    image: imageForReward(r),
    kind,
    coinValue: r.type === "coin" ? r.value : null,
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

function revealReward() {
  reward.value = drawReward();
  if (reward.value.type === "coin") coins.value += reward.value.value;
  batchRewards.value.push(reward.value);
  logReward(reward.value);
  gameState.value = "result";
  celebrate();
}

// Batch mode still grabs/cracks once, but every ticket's reward now gets
// its own reveal on the result screen (one at a time, via nextBatchReveal)
// instead of jumping straight to the combined list — the summary screen
// still shows at the end as a recap.
function resolveBatchAll() {
  const n = batchSize.value;
  batchRewards.value = [];
  for (let i = 0; i < n; i++) {
    const r = drawReward();
    if (r.type === "coin") coins.value += r.value;
    batchRewards.value.push(r);
    logReward(r);
  }
  batchRevealIndex.value = 0;
  reward.value = batchRewards.value[0];
  gameState.value = "result";
  celebrate();
}

function nextBatchReveal() {
  if (batchRevealIndex.value < batchRewards.value.length - 1) {
    batchRevealIndex.value++;
    reward.value = batchRewards.value[batchRevealIndex.value];
    celebrate();
  } else {
    gameState.value = "summary";
  }
}

function drawReward() {
  const total = rewards.reduce((s, r) => s + r.weight, 0);
  let n = Math.random() * total;
  for (const r of rewards) {
    n -= r.weight;
    if (n <= 0) return r;
  }
  return rewards.at(-1);
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
  gameState.value = "batchPick";
}

function goHome() {
  transitionToken++;
  stopTimer();
  drive.stop();
  gameState.value = "idle";
  message.value = "";
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
  if (gameState.value !== "playing") return;
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

onMounted(() => {
  Promise.all(allImages.map(preloadImage)).then(() => {
    appReady.value = true;
  });
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
          <span class="preloader-spinner"></span>
          <p class="preloader-label">กำลังโหลด...</p>
        </div>
      </transition>

      <!-- Temporary debug readout to track down the "everything stops
           responding" report — remove once that's confirmed fixed. -->
      <div class="debug-badge">
        {{ gameState }} / {{ clawAnim }} / ctrl:{{ controlsEnabled }}
      </div>

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
          <button class="img-btn home-start-btn" @click="openBatchPick">
            <img :src="btnStart" alt="เริ่มเล่น ใช้ 10 Points" />
          </button>

          <div class="home-nav-row">
            <button class="img-btn" @click="gameState = 'howToPlay'">
              <img :src="navHowToPlay" alt="วิธีเล่น" />
            </button>
            <button class="img-btn" @click="gameState = 'history'">
              <img :src="navHistory" alt="ประวัติการเล่น" />
            </button>
            <button class="img-btn" @click="gameState = 'rewards'">
              <img :src="navRewards" alt="แลกรางวัล" />
            </button>
          </div>
          <img
            class="home-footer-note"
            :src="coinNoteBanner"
            alt="Coin ไม่มีวันหมดอายุ"
          />
          <p v-if="message" class="message">{{ message }}</p>
        </section>

        <TicketExchange
          v-else-if="gameState === 'exchange'"
          key="exchange"
          :points="points"
          @back="goHome"
          @confirm="confirmExchange"
        />

        <BatchPicker
          v-else-if="gameState === 'batchPick'"
          key="batchPick"
          :tickets="tickets"
          @back="goHome"
          @confirm="confirmBatch"
          @exchange-more="exchangeMore"
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
          :single-tap="batchSize > 1"
          :message="message"
          :just-completed="justCompleted"
          @tap="tapEgg"
        />

        <BatchSummary
          v-else-if="gameState === 'summary'"
          key="summary"
          :rewards="batchRewards"
          :tickets="tickets"
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
          :batch-index="batchSize > 1 ? batchRevealIndex + 1 : 0"
          :batch-total="batchSize > 1 ? batchRewards.length : 0"
          @play-again="playAgain"
          @go-home="goHome"
          @next="nextBatchReveal"
        />
      </transition>
    </section>
  </main>
</template>
