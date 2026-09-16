<script setup>
import { computed, ref } from "vue";
import tapIcon from "../assets/ui/egg-open/tap-icon.webp";

const FRAMES = 2;
// Held after the last crack just long enough for the finalFlash pop to
// read, before the parent actually swaps this out for the revealed reward.
const CRACK_FINISH_PAUSE_MS = 550;

defineProps({
  // The color-matched egg image to crack open — whichever egg the claw
  // actually gripped (see App.vue's collectedEggs).
  eggSrc: { type: String, required: true },
});

const emit = defineEmits(["crack", "open"]);

const crackCount = ref(0);
const justCompleted = ref(false);

const glow = computed(
  () => 0.3 + (Math.min(crackCount.value, FRAMES) / FRAMES) * 0.95,
);
// The crack artwork always has 7 progressive stages; scale them against
// FRAMES so the egg still reaches "fully cracked" exactly on the last tap.
function at(stage) {
  return crackCount.value / FRAMES >= stage / 7;
}

async function advanceCrack() {
  crackCount.value += 1;
  emit("crack", crackCount.value);
  if (crackCount.value >= FRAMES) {
    justCompleted.value = true;
    await new Promise((resolve) => setTimeout(resolve, CRACK_FINISH_PAUSE_MS));
    // Left true rather than reset — this instance is about to be swapped
    // out by the parent (see its own "opened" tracking, driven by this
    // "open" emit) for the revealed reward, not reused for another egg.
    emit("open");
  }
}

async function tap() {
  if (justCompleted.value || crackCount.value >= FRAMES) return;
  await advanceCrack();
}

// Called by the parent's "เปิดทั้งหมด" instead of a real tap — plays the
// exact same crack-by-crack sequence (still emits every "crack"/"open"
// along the way, so sound/celebrate fire normally) rather than just
// snapping straight to opened, timed like a steady round of taps.
const AUTO_TAP_INTERVAL_MS = 220;
async function autoOpen() {
  if (justCompleted.value || crackCount.value >= FRAMES) return;
  while (crackCount.value < FRAMES) {
    await new Promise((resolve) => setTimeout(resolve, AUTO_TAP_INTERVAL_MS));
    await advanceCrack();
  }
}

defineExpose({ autoOpen });
</script>

<template>
  <div class="crackable-egg">
    <button
      class="egg-tap"
      :class="{ complete: justCompleted }"
      @click="tap"
    >
      <span class="egg-glow" :style="{ opacity: glow }"></span>

      <img class="egg-photo" :src="eggSrc" alt="" />

      <img v-if="crackCount === 0" class="tap-hint-icon" :src="tapIcon" alt="" />

      <svg
        class="crack-overlay"
        viewBox="0 0 200 168"
        fill="none"
        preserveAspectRatio="xMidYMid meet"
      >
        <g class="crack-lines">
          <path pathLength="1" class="crack-line" :class="{ revealed: at(1) }" d="M100 18 L92 40 L104 56" />
          <path pathLength="1" class="crack-line" :class="{ revealed: at(2) }" d="M96 46 L80 54" />
          <path pathLength="1" class="crack-line" :class="{ revealed: at(3) }" d="M104 56 L98 78 L114 90" />
          <path pathLength="1" class="crack-line" :class="{ revealed: at(4) }" d="M98 78 L82 88" />
          <path pathLength="1" class="crack-line" :class="{ revealed: at(5) }" d="M114 90 L128 104" />
          <path pathLength="1" class="crack-line" :class="{ revealed: at(6) }" d="M92 40 L84 26" />
          <path pathLength="1" class="crack-line" :class="{ revealed: at(7) }" d="M104 96 L110 122" />
        </g>
        <g class="crack-fills">
          <path class="crack-chip" :class="{ revealed: at(4) }" d="M120 76 L133 82 L124 92 Z" />
          <path class="crack-chip" :class="{ revealed: at(5) }" d="M68 96 L81 103 L70 113 Z" />
          <path class="crack-hole" :class="{ revealed: at(6) }"
            d="M90 112 C79 121 79 140 92 149 C105 157 124 151 128 137 C132 122 117 110 100 110 C96 110 92 111 90 112 Z" />
          <path class="crack-chip" :class="{ revealed: at(7) }" d="M132 116 L146 123 L136 132 Z" />
          <path class="crack-chip" :class="{ revealed: at(7) }" d="M62 124 L76 130 L66 140 Z" />
        </g>
      </svg>

      <span v-if="justCompleted" class="shockwave" aria-hidden="true"></span>
      <span v-if="justCompleted" class="shockwave shockwave-delay" aria-hidden="true"></span>
      <span v-if="justCompleted" class="burst" aria-hidden="true">
        <i v-for="n in 14" :key="n" :class="{ gold: n % 3 === 0 }" :style="{ '--n': n }"></i>
      </span>
    </button>

    <div class="crack-progress">
      <span :style="{ width: (Math.min(crackCount, FRAMES) / FRAMES) * 100 + '%' }"></span>
    </div>
  </div>
</template>

<style scoped>
.crackable-egg {
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* Percentages/coordinates below are tuned against this box's own 200x168
   aspect ratio (matching the crack SVG's viewBox). */
.egg-tap {
  position: relative;
  width: 100%;
  aspect-ratio: 200 / 168;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  touch-action: manipulation;
}
.egg-glow {
  position: absolute;
  inset: -18%;
  z-index: 0;
  background: radial-gradient(circle, rgba(120, 210, 255, 0.55), transparent 68%);
  filter: blur(16px);
  transition: opacity 0.18s ease;
}
.egg-photo {
  position: relative;
  z-index: 1;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.4));
  animation: tapPulse 0.28s cubic-bezier(0.32, 0.72, 0.32, 1) both;
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.egg-tap.complete .egg-photo {
  animation: finalFlash 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.tap-hint-icon {
  position: absolute;
  z-index: 2;
  left: 50%;
  top: 34%;
  width: 34%;
  height: auto;
  transform: translate(-50%, -50%);
  animation: tapHintPulse 1.3s ease-in-out infinite;
  pointer-events: none;
}
@keyframes tapHintPulse {
  0%, 100% { opacity: .55; transform: translate(-50%, -50%) scale(1); }
  50% { opacity: 1; transform: translate(-50%, -50%) scale(1.12); }
}
@keyframes tapPulse {
  0% { transform: scale(0.93) rotate(-2deg); }
  55% { transform: scale(1.06) rotate(2deg); }
  75% { transform: scale(0.98) translateX(-2px); }
  100% { transform: scale(1) rotate(0deg); }
}
@keyframes finalFlash {
  0% { filter: drop-shadow(0 10px 20px rgba(0,0,0,.4)) brightness(1); transform: scale(1) rotate(0deg); }
  30% { filter: drop-shadow(0 0 50px rgba(255, 244, 190, 1)) brightness(1.85); transform: scale(1.2) rotate(-4deg); }
  55% { filter: drop-shadow(0 0 42px rgba(255, 244, 190, .85)) brightness(1.5); transform: scale(1.11) rotate(3deg); }
  100% { filter: drop-shadow(0 0 8px rgba(255, 244, 190, 0)) brightness(1.1); opacity: 0; transform: scale(1.3) rotate(0deg); }
}

.crack-overlay {
  position: absolute;
  left: 0;
  top: 0;
  z-index: 2;
  width: 100%;
  height: 72%;
  filter: drop-shadow(0 0 1.5px rgba(0, 0, 0, 0.85)) drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5));
  pointer-events: none;
}
.egg-tap.complete .crack-overlay {
  animation: crackFadeOut 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
}
@keyframes crackFadeOut {
  0%, 45% { opacity: 1; }
  100% { opacity: 0; }
}
.crack-line {
  stroke: #fff8e6;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  opacity: 0;
  paint-order: stroke;
  transition: stroke-dashoffset 0.32s ease, opacity 0.1s ease;
}
.crack-line.revealed { stroke-dashoffset: 0; opacity: 1; }

.crack-chip {
  fill: #fffdf5;
  stroke: #3a2c1e;
  stroke-width: 1.4;
  opacity: 0;
  transform: scale(0.5);
  transform-box: fill-box;
  transform-origin: center;
  transition: opacity 0.26s ease, transform 0.26s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.crack-chip.revealed { opacity: 1; transform: scale(1); }

.crack-hole {
  fill: #17110b;
  stroke: #ffdca0;
  stroke-width: 1.6;
  opacity: 0;
  transform: scale(0.6);
  transform-box: fill-box;
  transform-origin: center;
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.crack-hole.revealed { opacity: 0.95; transform: scale(1); }

.shockwave {
  position: absolute;
  left: 50%;
  top: 46%;
  width: 46%;
  height: 46%;
  z-index: 2;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  border: 4px solid rgba(255, 244, 190, .9);
  pointer-events: none;
  animation: shockwaveExpand .65s cubic-bezier(0.16, 1, 0.3, 1) both;
}
.shockwave-delay { animation-delay: .1s; border-width: 2px; }
@keyframes shockwaveExpand {
  0% { transform: translate(-50%, -50%) scale(.3); opacity: .9; }
  100% { transform: translate(-50%, -50%) scale(2.6); opacity: 0; }
}

.burst { position: absolute; inset: 0; z-index: 3; pointer-events: none; }
.burst i {
  position: absolute; left: 50%; top: 40%; width: 7px; height: 7px; border-radius: 1px;
  background: linear-gradient(#fff6d0, #f4d26b);
  transform-origin: center;
  animation: shardFly .7s cubic-bezier(0.22, 0.61, 0.36, 1) both;
  animation-delay: calc(var(--n) * 8ms);
  transform: rotate(calc(var(--n) * 25.7deg)) translateY(0);
}
.burst i.gold {
  width: 9px; height: 9px;
  background: linear-gradient(#ffe37a, #f5a400);
  box-shadow: 0 0 6px rgba(255, 200, 60, .8);
}
@keyframes shardFly {
  0% { opacity: 1; transform: rotate(calc(var(--n) * 25.7deg)) translateY(0) scale(1); }
  100% { opacity: 0; transform: rotate(calc(var(--n) * 25.7deg)) translateY(-96px) scale(0.3); }
}

.crack-progress { width: 72%; height: 6px; margin-top: 10px; overflow: hidden; border-radius: 99px; background: #071b37; border: 1px solid rgba(91, 180, 242, 0.18); }
.crack-progress span { display: block; height: 100%; background: linear-gradient(90deg, #20a5ff, #84e5ff); box-shadow: 0 0 12px #2bb8ff; transition: width 0.16s ease; }
</style>
