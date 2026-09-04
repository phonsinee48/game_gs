<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  eggs: { type: Array, required: true },
  targetId: { type: [Number, null], default: null },
  stirTrigger: { type: Number, default: 0 },
})

function rand(min, max) {
  return +(min + Math.random() * (max - min)).toFixed(2)
}

const wiggleMap = ref({})

// Each stir generates a fresh, independent temporary offset per egg so the
// pile feels alive without ever teleporting an egg's resting x/y state.
watch(
  () => props.stirTrigger,
  () => {
    const map = {}
    for (const egg of props.eggs) {
      map[egg.id] = {
        '--dx': rand(-15, 15) + 'px',
        '--dy': rand(-11, 5) + 'px',
        '--drot': rand(-22, 22) + 'deg',
        '--dur': rand(0.46, 0.78) + 's',
        '--delay': rand(0, 0.1) + 's',
      }
    }
    wiggleMap.value = map
  },
  { immediate: true },
)
</script>

<template>
  <div class="egg-pile">
    <div
      v-for="egg in eggs"
      :key="egg.id"
      class="pile-egg"
      :class="{ hidden: egg.hidden, targeted: egg.id === targetId && !egg.hidden }"
      :style="{ left: egg.x + '%', top: egg.y + '%', '--base-rot': egg.rot + 'deg' }"
    >
      <div class="egg-wiggle" :key="stirTrigger" :style="wiggleMap[egg.id]">
        <img :src="egg.src" alt="" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.egg-pile {
  position: absolute;
  inset: 0;
  z-index: 3;
}
.pile-egg {
  position: absolute;
  width: 58px;
  height: 78px;
  transform: translate(-50%, -50%) rotate(var(--base-rot));
  transition: opacity 0.2s ease, transform 0.3s ease;
}
.pile-egg.hidden {
  opacity: 0;
  transform: translate(-50%, -50%) rotate(var(--base-rot)) scale(0.4);
}
.pile-egg.targeted .egg-wiggle {
  animation: targetPulse 0.62s ease-in-out infinite;
}
.egg-wiggle {
  width: 100%;
  height: 100%;
  animation: eggStir var(--dur, 0.6s) var(--delay, 0s) cubic-bezier(0.34, 1.4, 0.4, 1) both;
}
.egg-wiggle img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 8px 9px rgba(0, 0, 0, 0.28));
}
.pile-egg.targeted .egg-wiggle img {
  filter: drop-shadow(0 8px 9px rgba(0, 0, 0, 0.28)) drop-shadow(0 0 14px rgba(120, 210, 255, 0.95));
}

@keyframes eggStir {
  0% { transform: translate3d(0, 0, 0) rotate(0deg); }
  35% { transform: translate3d(var(--dx), var(--dy), 0) rotate(var(--drot)); }
  70% { transform: translate3d(calc(var(--dx) * -0.35), calc(var(--dy) * -0.3), 0) rotate(calc(var(--drot) * -0.4)); }
  100% { transform: translate3d(0, 0, 0) rotate(0deg); }
}
@keyframes targetPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}
</style>
