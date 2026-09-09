<script setup>
import { computed } from 'vue'
import title from '../assets/ui/egg-open/title.png'
import subtitle from '../assets/ui/egg-open/subtitle.png'
import tapIcon from '../assets/ui/egg-open/tap-icon.png'
import eggMascot from '../assets/ui/egg-open/egg-mascot.png'

const props = defineProps({
  crackCount: { type: Number, required: true },
  frames: { type: Number, default: 8 },
  singleTap: { type: Boolean, default: false },
  message: { type: String, default: '' },
  justCompleted: { type: Boolean, default: false },
})

defineEmits(['tap'])

const glow = computed(() => 0.3 + (Math.min(props.crackCount, props.frames) / props.frames) * 0.95)
// The crack artwork always has 7 progressive stages; scale them against
// however many taps (frames) this round actually requires, so the egg
// still reaches "fully cracked" exactly on the last tap regardless of FRAMES.
const at = (stage) => props.crackCount / props.frames >= stage / 7
</script>

<template>
  <section class="screen scene crack-screen">
    <img class="scene-title crack-title" :src="title" alt="คุณได้ไข่แล้ว!" />
    <img class="crack-subtitle" :src="subtitle" alt="แตะเพื่อเปิดไข่" />

    <button class="egg-tap" :class="{ complete: justCompleted }" @click="$emit('tap')">
      <span class="egg-glow" :style="{ opacity: glow }"></span>

      <img class="egg-photo" :src="eggMascot" alt="" />

      <img v-if="crackCount === 0" class="tap-hint" :src="tapIcon" alt="" />

      <svg class="crack-overlay" viewBox="0 0 200 168" fill="none" preserveAspectRatio="xMidYMid meet">
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

    <div v-if="!singleTap" class="progress"><span :style="{ width: (Math.min(crackCount, frames) / frames * 100) + '%' }"></span></div>
    <p class="message">{{ message }}<template v-if="!singleTap"> {{ Math.min(crackCount, frames) }}/{{ frames }}</template></p>
  </section>
</template>

<style scoped>
.crack-title { width: min(340px, 82vw); margin: 0 0 2px; }
.crack-subtitle { width: min(260px, 66vw); height: auto; margin: 0 0 20px; }

.egg-tap {
  position: relative; width: min(240px, 62vw); aspect-ratio: 200 / 168; padding: 0; border: 0; background: transparent; cursor: pointer;
  touch-action: manipulation;
}
.egg-glow {
  position: absolute; inset: -18%; z-index: 0;
  background: radial-gradient(circle, rgba(120, 210, 255, 0.55), transparent 68%);
  filter: blur(16px);
  transition: opacity 0.18s ease;
}
.egg-photo {
  position: relative; z-index: 1;
  display: block; width: 100%; height: 100%; object-fit: contain;
  filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.4));
  animation: tapPulse 0.28s cubic-bezier(0.32, 0.72, 0.32, 1) both;
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.egg-tap.complete .egg-photo {
  animation: finalFlash 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.tap-hint {
  position: absolute; z-index: 2; left: 50%; top: 34%; width: 34%; height: auto;
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
  position: absolute; left: 0; top: 0; z-index: 2; width: 100%; height: 72%;
  filter: drop-shadow(0 0 1.5px rgba(0, 0, 0, 0.85)) drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5));
  pointer-events: none;
}
/* Without this, the egg photo fades out on its own (finalFlash ends at
   opacity 0) while these crack lines/chips stay fully opaque, leaving them
   floating alone on the background for the rest of the completion pause. */
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
  position: absolute; left: 50%; top: 46%; width: 46%; height: 46%; z-index: 2;
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

.progress { width: 72%; height: 8px; margin-top: 22px; overflow: hidden; border-radius: 99px; background: #071b37; border: 1px solid rgba(91, 180, 242, 0.18); }
.progress span { display: block; height: 100%; background: linear-gradient(90deg, #20a5ff, #84e5ff); box-shadow: 0 0 12px #2bb8ff; transition: width 0.16s ease; }
.message { min-height: 20px; margin: 12px 0 0; color: #b9dcf6; text-align: center; font-size: 12px; }
</style>
