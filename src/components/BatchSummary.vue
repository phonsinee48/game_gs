<script setup>
import { computed, ref } from "vue";
import coinIcon from "../assets/coin-icon.webp";
import coinWord from "../assets/ui/receive-prize/coin-word.webp";
import title from "../assets/ui/receive-prize/title.webp";
import coinStack from "../assets/ui/receive-prize/coin-stack.webp";
import btnHome from "../assets/ui/common/btn-home-blue.webp";
import titleAndSubtitle from "../assets/ui/egg-open/title-and-subtitle.webp";
import btnOpenAll from "../assets/ui/egg-open/btn-open-all.webp";
import cardFrame from "../assets/ui/egg-open/card-frame.webp";
import scrollHint from "../assets/ui/egg-open/scroll-hint.webp";
import totalEggsPill from "../assets/ui/egg-open/total-eggs-pill.webp";
import labelEggIndex from "../assets/ui/egg-open/label-egg-index.webp";
import CrackableEgg from "./CrackableEgg.vue";

const props = defineProps({
  // Every egg grabbed this session, each { id, color, src, reward } — reward
  // is already decided (see App.vue's grabEgg) but stays hidden in the UI
  // until its card is opened, individually (same crack-open interaction as
  // the lone-egg screen, see CrackableEgg) or via "เปิดทั้งหมด".
  eggs: { type: Array, required: true },
  confetti: { type: Boolean, default: false },
  // Set when play_claw stopped short of the full session because a reward
  // ran out of stock mid-draw — explains why one grab yielded nothing.
  note: { type: String, default: "" },
});

const emit = defineEmits(["go-home", "open", "crack"]);

// A plain Set (not a boolean per egg) so isOpened stays a simple lookup —
// each id only ever gets added, via onCardOpen below, once that egg's own
// CrackableEgg instance has actually finished cracking (whether from a real
// tap or from openAll's simulated one).
const openedIds = ref(new Set());
// CrackableEgg instances currently on screen, keyed by egg id — openAll
// needs these to trigger each one's own autoOpen() (see CrackableEgg).
// Vue drops an id's entry here on its own once that card unmounts (see the
// template's function-ref binding), so this never holds onto stale refs
// for eggs that already got revealed.
const crackableRefs = ref({});

function isOpened(id) {
  return openedIds.value.has(id);
}
function setCrackableRef(id, el) {
  if (el) crackableRefs.value[id] = el;
  else delete crackableRefs.value[id];
}
function onCardOpen(id) {
  if (openedIds.value.has(id)) return;
  const next = new Set(openedIds.value);
  next.add(id);
  openedIds.value = next;
  emit("open");
}
// Still plays every still-closed egg's own crack animation (see
// CrackableEgg's autoOpen) rather than just snapping straight to opened —
// staggered a beat apart so they crack in a cascading ripple down the list
// instead of all flashing at once.
const AUTO_OPEN_STAGGER_MS = 150;
function openAll() {
  const unopened = props.eggs.filter((e) => !openedIds.value.has(e.id));
  unopened.forEach((egg, i) => {
    setTimeout(() => {
      crackableRefs.value[egg.id]?.autoOpen();
    }, i * AUTO_OPEN_STAGGER_MS);
  });
}

const allOpened = computed(
  () => props.eggs.length > 0 && openedIds.value.size >= props.eggs.length,
);
</script>

<template>
  <section class="screen scene summary-screen">
    <div v-if="confetti" class="confetti" aria-hidden="true">
      <i
        v-for="i in 18"
        :key="i"
        :style="{
          '--i': i,
          '--x': (i * 23) % 100,
          '--dur': 0.9 + (i % 5) * 0.12,
        }"
      ></i>
    </div>

    <template v-if="!allOpened">
      <img
        class="crack-heading"
        :src="titleAndSubtitle"
        alt="คุณได้ไข่แล้ว! แตะเพื่อเปิดไข่"
      />
      <div class="total-eggs-pill">
        <img class="total-eggs-pill-bg" :src="totalEggsPill" alt="" />
        <span class="total-eggs-num">{{ eggs.length }}</span>
      </div>
      <button class="img-btn open-all-btn" @click="openAll">
        <img :src="btnOpenAll" alt="เปิดทั้งหมด" />
      </button>
    </template>
    <img
      v-else
      class="scene-title"
      :src="title"
      alt="ยินดีด้วย! คุณได้รับรางวัลจาก GS CLAW EGG"
    />

    <ul class="egg-list">
      <li v-for="(egg, idx) in eggs" :key="egg.id" class="egg-list-item">
        <div class="egg-card">
          <img class="card-frame-bg" :src="cardFrame" alt="" />

          <div v-if="!isOpened(egg.id)" class="card-egg-wrap">
            <CrackableEgg
              :ref="(el) => setCrackableRef(egg.id, el)"
              :egg-src="egg.src"
              @crack="$emit('crack', $event)"
              @open="onCardOpen(egg.id)"
            />
          </div>
          <!-- Cracked, but the session's one batch call (see App.vue's
               resolveSessionBatch) hasn't resolved yet — only really shows
               for whichever card the player happens to crack first, since
               that network wait usually finishes before they get to the
               rest. -->
          <div v-else-if="!egg.reward" class="card-loading">
            <span class="preloader-spinner"></span>
          </div>
          <!-- coinStack is a coin-pile pedestal, so it's only ever shown
               behind an actual coin win; a prize gets its own backend
               photo standing alone instead — the two are never layered
               together. -->
          <template v-else>
            <div class="card-hero">
              <img
                v-if="egg.reward.type === 'coin'"
                class="card-hero-bg"
                :src="coinStack"
                alt=""
              />
              <img
                v-if="egg.reward.type === 'coin'"
                class="card-hero-coin"
                :src="coinIcon"
                alt=""
              />
              <img
                v-else
                class="card-hero-prize-standalone"
                :src="egg.reward.image"
                :alt="egg.reward.label"
              />
            </div>
            <span
              class="card-value"
              :class="
                egg.reward.type === 'coin'
                  ? 'card-value-coin'
                  : 'card-value-prize'
              "
              >{{
                egg.reward.type === "coin" ? egg.reward.value : egg.reward.label
              }}</span
            >
            <img
              v-if="egg.reward.type === 'coin'"
              class="card-unit"
              :src="coinWord"
              alt="Coin"
            />
          </template>

          <div class="card-label-pill">
            <img class="card-label-pill-bg" :src="labelEggIndex" alt="" />
            <span class="card-label-pill-num">{{ idx + 1 }}</span>
          </div>
        </div>

        <img
          v-if="idx < eggs.length - 1"
          class="scroll-hint"
          :src="scrollHint"
          alt="เลื่อนลงเพื่อดูไข่ใบถัดไป"
        />
      </li>
    </ul>

    <p v-if="note" class="stock-note">{{ note }}</p>

    <div class="summary-actions">
      <button class="img-btn" :disabled="!allOpened" @click="$emit('go-home')">
        <img :src="btnHome" alt="กลับหน้าหลัก" />
      </button>
    </div>
  </section>
</template>

<style scoped>
.summary-screen {
  text-align: center;
}

.crack-heading {
  width: min(340px, 82vw);
  height: auto;
  margin: 0 0 8px;
}

/* Percentages measured against the 1241x227 pill art — "ไข่ทั้งหมด" and
   "ฟอง" are baked in on either side of a gap left for the live count. */
.total-eggs-pill {
  position: relative;
  width: min(280px, 72vw);
  aspect-ratio: 1241 / 227;
  margin: 0 0 10px;
}
.total-eggs-pill-bg {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}
.total-eggs-num {
  position: absolute;
  left: 53%;
  width: 14%;
  top: 18%;
  height: 64%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: "Baloo 2", Inter, ui-sans-serif, system-ui, sans-serif;
  font-weight: 800;
  color: #ffd739;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
  font-size: clamp(16px, 5vw, 22px);
  font-variant-numeric: tabular-nums;
}

.open-all-btn {
  width: min(190px, 56vw);
  margin: 0 0 14px;
  touch-action: manipulation;
}

.egg-list {
  position: relative;
  width: 100%;
  max-width: 320px;
  list-style: none;
  margin: 0 0 14px;
  padding: 4px 10px 4px 2px;
  max-height: 58vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
/* A thin neon scrollbar instead of the browser default — the list is
   deliberately tall enough to need scrolling for anything past a couple of
   eggs (see .egg-list's max-height), so this is the main hint that there's
   more below besides the per-card scroll-hint graphic. Webkit-only, but
   that covers every real target here (LINE's in-app browser, Chrome,
   Safari); other browsers just keep their native scrollbar. */
.egg-list::-webkit-scrollbar {
  width: 5px;
}
.egg-list::-webkit-scrollbar-track {
  background: rgba(101, 197, 255, 0.15);
  border-radius: 999px;
}
.egg-list::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #7fe0ff, #1f9bff);
  border-radius: 999px;
}

.egg-list-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* Percentages below are measured against the 318x380 frame art — its own
   glow border + hex floor + reflection ring are baked in, so the egg/
   reward content just has to sit inside the area they already leave clear. */
.egg-card {
  position: relative;
  width: min(230px, 60vw);
  aspect-ratio: 318 / 380;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.card-frame-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  z-index: 0;
}
.card-egg-wrap {
  position: relative;
  z-index: 1;
  width: 62%;
  margin-top: 14%;
}
.card-loading {
  position: relative;
  z-index: 1;
  margin-top: 32%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.card-loading .preloader-spinner {
  width: 36px;
  height: 36px;
}
.card-hero {
  position: relative;
  z-index: 1;
  width: 58%;
  aspect-ratio: 1;
  margin-top: 12%;
  display: grid;
  place-items: center;
  animation: heroPop 0.5s cubic-bezier(0.2, 0.9, 0.25, 1.25) both;
}
.card-hero-bg {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.card-hero-coin {
  position: absolute;
  width: 34%;
  height: 34%;
  object-fit: contain;
  filter: drop-shadow(0 6px 10px rgba(0, 0, 0, 0.35));
}
.card-hero-prize-standalone {
  width: 84%;
  height: 84%;
  object-fit: contain;
  filter: drop-shadow(0 10px 16px rgba(0, 0, 0, 0.35));
}
@keyframes heroPop {
  0% {
    opacity: 0;
    transform: scale(0.62) rotate(-4deg);
  }
  70% {
    transform: scale(1.05);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}
.card-value {
  position: relative;
  z-index: 1;
  color: #fff;
  font-weight: 800;
  max-width: 78%;
  text-align: center;
  line-height: 1.25;
  margin-top: -4px;
  /* A prize's name (unlike a coin amount) has no fixed length — long ones
     (e.g. "บัตรกำนัล ปตท. 1,000 บาท") wrap onto a second line instead of
     being cut off with "...", matching how the lone-egg screen's own
     .prize-label already handles the same text. */
  overflow-wrap: break-word;
  font-variant-numeric: tabular-nums;
}
/* Only the coin amount (never a prize name — those stay in .card-value-prize
   below) gets the same numeral font as the HUD's own Point/Coin counters
   and the lone-egg screen's .amount-num, for a consistent look. A coin
   amount is always short (a plain number), so it can afford to run much
   bigger than a prize name without risking overflow/wrap. */
.card-value-coin {
  font-family: "Baloo 2", Inter, ui-sans-serif, system-ui, sans-serif;
  font-size: 30px;
  color: #ffd739;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
}
/* A prize's name can run long ("บัตรกำนัล ปตท. มูลค่า 500 บาท") and wraps
   onto multiple lines inside the same card — kept well below the coin
   amount's size so it fits without dominating the card. */
.card-value-prize {
  font-size: 18px;
}
/* Real artwork, not text — matches the lone-egg screen's own
   .amount-coin-word (coin-word.png) instead of rendering "Coin" in a system
   font, which is what looked off here. */
.card-unit {
  position: relative;
  z-index: 1;
  width: 42px;
  aspect-ratio: 425 / 220;
  height: auto;
  object-fit: contain;
}
.card-label-pill {
  position: relative;
  z-index: 1;
  margin-top: auto;
  margin-bottom: 8%;
  width: min(160px, 42vw);
}
.card-label-pill-bg {
  width: 100%;
  height: auto;
  display: block;
}
/* Percentages measured against the 461x120 label-egg-index.webp — "ไข่ใบที่"
   is baked in on the left, leaving the pill's own right-hand curve/padding
   free for the live index number. */
.card-label-pill-num {
  position: absolute;
  left: 60%;
  width: 20%;
  top: 15%;
  height: 76%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: "Baloo 2", Inter, ui-sans-serif, system-ui, sans-serif;
  font-weight: 800;
  color: #fff;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
  font-size: 20px;
  font-variant-numeric: tabular-nums;
}

.scroll-hint {
  width: min(220px, 58vw);
  height: auto;
  margin: 4px 0 2px;
}

.stock-note {
  margin: 0 0 12px;
  padding: 6px 14px;
  width: min(380px, 92vw);
  color: #ffcf8f;
  background: rgba(255, 169, 0, 0.12);
  border: 1px solid rgba(255, 169, 0, 0.4);
  border-radius: 10px;
  font-size: 11.5px;
  line-height: 1.4;
}

.summary-actions {
  width: min(280px, 80vw);
  display: flex;
  flex-direction: row;
  justify-content: center;
  gap: 12px;
}
.summary-actions .img-btn {
  flex: 1;
  min-width: 0;
}

.confetti {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 20;
  overflow: hidden;
}
.confetti i {
  position: absolute;
  left: calc(var(--x) * 1%);
  top: -12px;
  width: 8px;
  height: 14px;
  border-radius: 2px;
  background: linear-gradient(180deg, #ffe37a, #f5a400);
  animation: confettiFall calc(var(--dur) * 1s) ease-in forwards;
  transform: rotate(calc(var(--i) * 29deg));
}
.confetti i:nth-child(3n) {
  background: linear-gradient(180deg, #9fe0ff, #1f9bff);
}
@keyframes confettiFall {
  0% {
    opacity: 1;
    transform: translateY(-10px) rotate(0);
  }
  100% {
    opacity: 0;
    transform: translateY(730px) rotate(620deg);
  }
}
</style>
