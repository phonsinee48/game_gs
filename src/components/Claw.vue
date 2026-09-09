<script setup>
import { computed } from 'vue'
import clawOpen from '../assets/ui/gameplay/claw-open.png'
import clawHoldingBlue from '../assets/ui/gameplay/claw-holding-blue.png'
import clawHoldingWhite from '../assets/ui/gameplay/claw-holding-white.png'
import clawHoldingBlack from '../assets/ui/gameplay/claw-holding-black.png'
import clawHoldingSilver from '../assets/ui/gameplay/claw-holding-silver.png'

const holdingByColor = {
  blue: clawHoldingBlue,
  white: clawHoldingWhite,
  black: clawHoldingBlack,
  silver: clawHoldingSilver,
}

const props = defineProps({
  x: { type: Number, required: true }, // % across the track
  y: { type: Number, required: true }, // px drop offset
  phase: { type: String, default: 'idle' }, // idle|pause|descend|grip|ascend|settle
  holding: { type: Boolean, default: false },
  heldColor: { type: String, default: 'blue' }, // which egg color the claw is gripping
})

const cableHeight = computed(() => 8 + props.y)
const clawSrc = computed(() => (props.holding ? (holdingByColor[props.heldColor] || clawHoldingBlue) : clawOpen))
</script>

<template>
  <div
    class="claw-rig"
    :class="`phase-${phase}`"
    :style="{ left: x + '%', transform: 'translateX(-50%)' }"
  >
    <div class="rail-mount"></div>
    <div class="cable" :style="{ height: cableHeight + 'px' }"></div>
    <img class="claw-img" :src="clawSrc" alt="" />
    <div class="claw-shadow"></div>
  </div>
</template>

<style scoped>
.claw-rig {
  position: absolute;
  top: 0;
  width: 128px;
  height: 190px;
  z-index: 5;
  text-align: center;
  transition: transform 0.5s cubic-bezier(0.32, 0.72, 0.32, 1);
  will-change: transform;
  pointer-events: none;
}
.rail-mount {
  width: 22px;
  height: 10px;
  margin: 0 auto;
  border-radius: 3px;
  background: linear-gradient(180deg, #cfeeff, #4fa9e0);
  box-shadow: 0 0 10px rgba(90, 200, 255, 0.8);
}
.cable {
  width: 5px;
  margin: 0 auto;
  background: linear-gradient(#f1fbff, #69b9eb);
  box-shadow: 0 0 10px rgba(100, 201, 255, 0.75);
  transition: height 0.5s cubic-bezier(0.32, 0.72, 0.32, 1);
}
.claw-img {
  width: 108px;
  height: 108px;
  object-fit: contain;
  margin-top: -4px;
  filter: drop-shadow(0 10px 14px rgba(0, 0, 0, 0.35));
  transform-origin: 50% 12%;
  transition: transform 0.18s ease;
}
.claw-shadow {
  position: absolute;
  left: 50%;
  bottom: -14px;
  width: 46px;
  height: 10px;
  transform: translateX(-50%);
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(0, 0, 0, 0.4), transparent 75%);
  opacity: 0.5;
}

.phase-pause .claw-img { animation: anticipate 0.24s ease both; }
.phase-descend .claw-img { animation: none; }
.phase-grip .claw-img { animation: grip 0.32s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
.phase-ascend .claw-img { animation: none; }
.phase-settle .claw-img { animation: settle 0.34s ease both; }

@keyframes anticipate {
  0% { transform: translateY(0) scale(1); }
  100% { transform: translateY(-3px) scale(1.03); }
}
@keyframes grip {
  0% { transform: scale(1); }
  45% { transform: scale(0.86, 1.1); }
  100% { transform: scale(1); }
}
@keyframes settle {
  0% { transform: translateY(0); }
  40% { transform: translateY(6px); }
  100% { transform: translateY(0); }
}
</style>
