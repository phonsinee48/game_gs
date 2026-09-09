<script setup>
import { computed, watch } from "vue";
import Claw from "./Claw.vue";
import EggPile from "./EggPile.vue";
import GameIcon from "./GameIcon.vue";
import cabinetBox from "../assets/ui/gameplay/cabinet-box.png";
import shakeBanner from "../assets/ui/gameplay/shake-banner.png";
import ticketRow from "../assets/ui/gameplay/ticket-row.png";
import arrowLeft from "../assets/ui/gameplay/arrow-left.png";
import arrowRight from "../assets/ui/gameplay/arrow-right.png";
import btnGrab from "../assets/ui/gameplay/btn-grab.png";

const props = defineProps({
  eggs: { type: Array, required: true },
  clawX: { type: Number, required: true },
  clawAnim: { type: String, required: true },
  targetId: { type: [Number, null], default: null },
  timer: { type: Number, required: true },
  motionEnabled: { type: Boolean, default: false },
  controlsEnabled: { type: Boolean, default: false },
  message: { type: String, default: "" },
  stirTrigger: { type: Number, default: 0 },
  tickets: { type: Number, default: 0 },
  batchSize: { type: Number, default: 1 },
  maxBatch: { type: Number, default: 11 },
  heldEggColor: { type: String, default: "blue" },
  needsStir: { type: Boolean, default: false },
});

const emit = defineEmits([
  "back",
  "toggle-motion",
  "shake-tap",
  "move-start",
  "move-end",
  "grab",
  "stir",
  "adjust-qty",
]);

const DESCEND_Y = 46;

const clawY = computed(() =>
  props.clawAnim === "descend" || props.clawAnim === "grip" ? DESCEND_Y : 0,
);
const holding = computed(() =>
  ["grip", "ascend", "settle"].includes(props.clawAnim),
);
const grabbing = computed(() => props.clawAnim !== "idle");

// How many eggs this round will open, adjustable right here (mirrors
// BatchPicker's own stepper) up to whatever's left in the ticket pool,
// capped at maxBatch overall.
const maxUsable = computed(() =>
  Math.min(props.maxBatch, props.tickets + props.batchSize),
);

// Deliberately NOT using setPointerCapture here. It sounds like the right
// tool for a hold-button (guarantee the release fires on this element even
// if the finger drifts), but it repeatedly proved unreliable in practice:
// this button can go `disabled` mid-press (round timer hits 0, an auto-grab
// fires), and disabling an element that holds pointer capture does not
// reliably fire pointerup/pointercancel on it in every browser/emulator —
// leaving that capture live. While a capture is live, *every* pointer event
// for that pointerId reroutes to the capturing element no matter where on
// the page is actually tapped, which looks exactly like "the whole app
// stopped responding" (arrows, grab, even the next screen's buttons) with
// no console error, because nothing is actually throwing — events are just
// being silently misdirected.
//
// Binding the release listeners to `window` instead sidesteps the whole
// problem: they don't care whether this element is disabled, removed, or
// re-rendered, and a real pointerup/pointercancel still bubbles all the way
// to window regardless of what element it nominally targets.
let stopActivePress = null;

function handlePressStart(dir) {
  emit("move-start", dir);
  if (stopActivePress) stopActivePress();
  const onRelease = () => {
    window.removeEventListener("pointerup", onRelease);
    window.removeEventListener("pointercancel", onRelease);
    stopActivePress = null;
    emit("move-end");
  };
  window.addEventListener("pointerup", onRelease);
  window.addEventListener("pointercancel", onRelease);
  stopActivePress = onRelease;
}

watch(
  () => props.controlsEnabled,
  (enabled) => {
    if (!enabled && stopActivePress) stopActivePress();
  },
);

function stepQty(delta) {
  if (!props.controlsEnabled) return;
  emit("adjust-qty", props.batchSize + delta);
}
function setAllQty() {
  if (!props.controlsEnabled) return;
  emit("adjust-qty", maxUsable.value);
}
</script>

<template>
  <section class="screen play-screen">
    <div class="cabinet">
      <img class="cabinet-bg" :src="cabinetBox" alt="" />
      <span class="cabinet-timer" :class="{ danger: timer <= 5 }">{{
        timer
      }}</span>

      <div class="cabinet-chamber">
        <EggPile
          :eggs="eggs"
          :target-id="targetId"
          :stir-trigger="stirTrigger"
        />
        <Claw
          :x="clawX"
          :y="clawY"
          :phase="clawAnim"
          :holding="holding"
          :held-color="heldEggColor"
        />
      </div>
    </div>

    <div
      class="shake-pill"
      :class="{ 'shake-gate': needsStir }"
      :role="needsStir ? 'button' : null"
      @click="needsStir && emit('shake-tap')"
    >
      <img class="shake-pill-bg" :src="shakeBanner" alt="" />
      <p v-if="!needsStir" class="shake-pill-text">{{ message }}</p>
    </div>

    <div class="ticket-row">
      <img class="ticket-row-bg" :src="ticketRow" alt="" />
      <span class="ticket-row-remain">{{ tickets }}</span>
      <span class="ticket-row-qty">x{{ batchSize }}</span>
      <button
        class="ticket-row-hit ticket-row-minus"
        :disabled="!controlsEnabled || batchSize <= 1"
        @click="stepQty(-1)"
        aria-label="ลดจำนวน"
      ></button>
      <button
        class="ticket-row-hit ticket-row-plus"
        :disabled="!controlsEnabled || batchSize >= maxUsable"
        @click="stepQty(1)"
        aria-label="เพิ่มจำนวน"
      ></button>
      <button
        class="ticket-row-hit ticket-row-all"
        :disabled="!controlsEnabled || maxUsable <= 1"
        @click="setAllQty"
        aria-label="เลือกทั้งหมด"
      ></button>
    </div>

    <div class="control-dock">
      <button
        class="img-btn arrow-btn"
        :disabled="!controlsEnabled"
        @pointerdown="handlePressStart(-1)"
        aria-label="เลื่อนซ้าย"
      >
        <img :src="arrowLeft" alt="" />
      </button>
      <button
        class="img-btn grab-btn"
        :disabled="!controlsEnabled || grabbing"
        @click="emit('grab')"
      >
        <img :src="btnGrab" alt="คีบ" />
      </button>
      <button
        class="img-btn arrow-btn"
        :disabled="!controlsEnabled"
        @pointerdown="handlePressStart(1)"
        aria-label="เลื่อนขวา"
      >
        <img :src="arrowRight" alt="" />
      </button>
    </div>
  </section>
</template>

<style scoped>
/* Kept deliberately tight: this screen's content is taller than most others
   (cabinet art + message pill + ticket row + controls), and if it exceeds
   the viewport height the page has to scroll to reach the arrow buttons —
   which made real touch holds get cut short as scroll and press gestures
   fought over the same drag. Every margin/padding here is trimmed to keep
   the whole screen fitting without scroll on a typical phone viewport. */
.play-screen {
  padding-top: 6px;
  padding-bottom: 8px;
}
.play-toolbar {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2px;
}
.icon-btn {
  width: 34px;
  height: 34px;
  border-radius: 11px;
  border: 1px solid #2e79ba;
  color: #cfeaff;
  background: linear-gradient(#0c3768, #08254b);
  cursor: pointer;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
  display: grid;
  place-items: center;
  font-size: 17px;
}
.icon-btn.active {
  color: #061428;
  background: linear-gradient(#7fe0ff, #23a8ff);
  border-color: #9fe8ff;
  box-shadow: 0 0 14px rgba(60, 190, 255, 0.7);
}

/* Percentages measured against the 529x688 cabinet-box.png. Its glass
   interior is fully painted (no alpha cutout), so the live egg pile + claw
   render as an overlay clipped to the chamber's visible bounds, on top of
   the (now empty) illustrated glass rather than behind a transparent hole. */
.cabinet {
  position: relative;
  width: 100%;
  max-width: 305px;
  margin: 0 auto;
  aspect-ratio: 529 / 688;
}
.cabinet-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.cabinet-timer {
  position: absolute;
  left: 63%;
  width: 20%;
  top: 5.7%;
  height: 7%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: "Baloo 2", Inter, ui-sans-serif, system-ui, sans-serif;
  font-weight: 800;
  line-height: 1;
  color: #eaf6ff;
  font-size: 30px;
  text-shadow:
    0 0 10px rgba(120, 210, 255, 0.8),
    0 2px 4px rgba(0, 0, 0, 0.5);
  font-variant-numeric: tabular-nums;
}
.cabinet-timer.danger {
  color: #ff8a94;
  animation: dangerPulse 0.55s ease-in-out infinite alternate;
}

.cabinet-chamber {
  position: absolute;
  left: 6%;
  width: 92%;
  top: 24.5%;
  height: 61%;
  z-index: 2;
  overflow: hidden;
}

.shake-pill {
  position: relative;
  width: 100%;
  max-width: 320px;
  margin: -22px auto 0;
}
.shake-pill-bg {
  width: 100%;
  height: auto;
  display: block;
}
.shake-pill-text {
  position: absolute;
  left: 21%;
  width: 74%;
  top: 0;
  height: 100%;
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  color: #eaf6ff;
  font-size: 11.5px;
  font-weight: 700;
  line-height: 1.25;
  text-align: left;
  text-shadow: 0 0 8px rgba(60, 190, 255, 0.5);
}
.shake-pill.shake-gate {
  cursor: pointer;
}
.shake-pill.shake-gate .shake-pill-bg {
  animation: shakeGateGlow 1s ease-in-out infinite;
}
@keyframes shakeGateGlow {
  0%, 100% { filter: none; }
  50% { filter: drop-shadow(0 0 10px rgba(120, 210, 255, 0.9)); }
}

.ticket-row {
  position: relative;
  width: 100%;
  max-width: 340px;
  margin: 2px auto 0;
}
.ticket-row-bg {
  width: 100%;
  height: auto;
  display: block;
}
.ticket-row-remain {
  position: absolute;
  left: 19.8%;
  width: 17%;
  top: 38.8%;
  height: 46.2%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: "Baloo 2", Inter, ui-sans-serif, system-ui, sans-serif;
  font-weight: 800;
  line-height: 1;
  color: #fff;
  font-size: 22px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
  font-variant-numeric: tabular-nums;
}
.ticket-row-qty {
  position: absolute;
  left: 53.5%;
  width: 10.3%;
  top: 46.5%;
  height: 30.8%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: "Baloo 2", Inter, ui-sans-serif, system-ui, sans-serif;
  font-weight: 800;
  line-height: 1;
  color: #3a2c1e;
  font-size: 19px;
  font-variant-numeric: tabular-nums;
}
.ticket-row-hit {
  position: absolute;
  top: 3%;
  height: 94%;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}
.ticket-row-hit:disabled {
  cursor: not-allowed;
}
.ticket-row-minus {
  left: 41%;
  width: 11%;
}
.ticket-row-plus {
  left: 67%;
  width: 13%;
}
.ticket-row-all {
  left: 81%;
  width: 18%;
}

.control-dock {
  width: 100%;
  max-width: 320px;
  margin-left: auto;
  margin-right: auto;
  display: grid;
  grid-template-columns: 0.72fr 1.55fr 0.72fr;
  gap: 18px;
  align-items: center;
  margin-top: 10px;
}
.arrow-btn {
  width: 100%;
  touch-action: none;
}
/* arrow-right.png has a brighter glow baked into its left edge (facing the
   grab button) than arrow-left.png has on its matching right edge, so an
   equal grid `gap` still reads as a smaller visual gap on this side —
   nudge it over to compensate. */
.control-dock > .arrow-btn:last-child {
  margin-left: 10px;
}
.grab-btn {
  width: 100%;
  touch-action: none;
}

@keyframes dangerPulse {
  to {
    transform: scale(1.08);
  }
}
</style>
