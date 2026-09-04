<script setup>
import { computed } from 'vue'
import Claw from './Claw.vue'
import EggPile from './EggPile.vue'
import GameIcon from './GameIcon.vue'
import titleGsClawEgg from '../assets/ui/common/title-gs-claw-egg.png'
import cabinetShell from '../assets/ui/gameplay/cabinet-shell.png'
import arrowLeft from '../assets/ui/gameplay/arrow-left.png'
import arrowRight from '../assets/ui/gameplay/arrow-right.png'
import btnGrab from '../assets/ui/gameplay/btn-grab.png'

const props = defineProps({
  eggs: { type: Array, required: true },
  clawX: { type: Number, required: true },
  clawAnim: { type: String, required: true },
  targetId: { type: [Number, null], default: null },
  timer: { type: Number, required: true },
  motionEnabled: { type: Boolean, default: false },
  controlsEnabled: { type: Boolean, default: false },
  message: { type: String, default: '' },
  stirTrigger: { type: Number, default: 0 },
})

const emit = defineEmits(['back', 'toggle-motion', 'move-start', 'move-end', 'grab', 'stir'])

const DESCEND_Y = 214

const clawY = computed(() => (props.clawAnim === 'descend' || props.clawAnim === 'grip' ? DESCEND_Y : 0))
const holding = computed(() => ['grip', 'ascend', 'settle'].includes(props.clawAnim))
const grabbing = computed(() => props.clawAnim !== 'idle')
</script>

<template>
  <section class="screen play-screen">
    <div class="play-toolbar">
      <button class="icon-btn" @click="emit('back')" aria-label="กลับ">
        <GameIcon name="back" />
      </button>
      <div class="countdown" :class="{ danger: timer <= 5 }">{{ timer }}</div>
      <button class="icon-btn" :class="{ active: motionEnabled }" @click="emit('toggle-motion')" aria-label="เปิดเซนเซอร์เขย่า">
        <GameIcon name="vibrate" />
      </button>
    </div>

    <img class="play-title" :src="titleGsClawEgg" alt="GS Claw Egg" />

    <div class="stage">
      <div class="stage-window">
        <div class="chamber-glow"></div>
        <EggPile :eggs="eggs" :target-id="targetId" :stir-trigger="stirTrigger" />
        <Claw :x="clawX" :y="clawY" :phase="clawAnim" :holding="holding" />
      </div>
      <img class="stage-shell" :src="cabinetShell" alt="" />
      <div class="chamber-glass"></div>
    </div>

    <p class="play-instruction">เลื่อนซ้าย-ขวา แล้วกดคีบ</p>

    <div class="control-dock">
      <button
        class="img-btn arrow-btn"
        :disabled="!controlsEnabled"
        @pointerdown="emit('move-start', -1)"
        @pointerup="emit('move-end')"
        @pointerleave="emit('move-end')"
        @pointercancel="emit('move-end')"
        aria-label="เลื่อนซ้าย"
      ><img :src="arrowLeft" alt="" /></button>
      <button class="img-btn grab-btn" :disabled="!controlsEnabled || grabbing" @click="emit('grab')">
        <img :src="btnGrab" alt="คีบ" />
      </button>
      <button
        class="img-btn arrow-btn"
        :disabled="!controlsEnabled"
        @pointerdown="emit('move-start', 1)"
        @pointerup="emit('move-end')"
        @pointerleave="emit('move-end')"
        @pointercancel="emit('move-end')"
        aria-label="เลื่อนขวา"
      ><img :src="arrowRight" alt="" /></button>
    </div>
    <button class="shake-button" :disabled="!controlsEnabled" @click="emit('stir')">
      <GameIcon name="vibrate" />
      <span>กวนไข่</span>
    </button>
    <p class="message">{{ message }}</p>
  </section>
</template>

<style scoped>
.play-screen { padding-top: 14px; }
.play-toolbar { width: 100%; display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.icon-btn {
  width: 42px; height: 42px; border-radius: 13px; border: 1px solid #2e79ba;
  color: #cfeaff; background: linear-gradient(#0c3768, #08254b); cursor: pointer;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
  display: grid; place-items: center; font-size: 19px;
}
.icon-btn.active { color: #061428; background: linear-gradient(#7fe0ff, #23a8ff); border-color: #9fe8ff; box-shadow: 0 0 14px rgba(60, 190, 255, 0.7); }
.countdown {
  width: 64px; height: 42px; display: grid; place-items: center; border-radius: 999px;
  font-weight: 1000; font-size: 20px; background: #061d3d; border: 1px solid #277dc4;
  box-shadow: inset 0 0 18px rgba(39, 136, 220, 0.18);
  font-variant-numeric: tabular-nums;
}
.countdown.danger { animation: dangerPulse 0.55s ease-in-out infinite alternate; }

.play-title { width: min(280px, 70vw); height: auto; margin: 4px 0 10px; }

.stage {
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
  position: relative;
  aspect-ratio: 1122 / 1402;
}

/* The cabinet render (cabinet-shell.png) has its glass interior cut fully
   transparent (see gameplay asset notes) so the live egg pile + claw can
   render behind it in the exact same window, while the header/pillars/
   joystick/button frame stays the real illustrated asset. */
.stage-window {
  position: absolute;
  left: 13.4%; top: 16.8%; width: 73.1%; height: 49.9%;
  z-index: 1;
  overflow: hidden;
  border-radius: 4px;
  background: linear-gradient(180deg, #0b356a 0%, #061a39 60%, #020a18 100%);
}
.stage-shell {
  position: absolute; inset: 0; z-index: 3;
  width: 100%; height: 100%;
  pointer-events: none;
  filter: drop-shadow(0 10px 24px rgba(0, 0, 0, 0.35));
}
.chamber-glow {
  position: absolute; inset: 0; z-index: 1; pointer-events: none;
  background:
    radial-gradient(circle at 50% 10%, rgba(45, 168, 255, 0.28), transparent 40%),
    radial-gradient(circle at 15% 85%, rgba(60, 190, 255, 0.14), transparent 55%),
    radial-gradient(circle at 85% 85%, rgba(60, 190, 255, 0.14), transparent 55%);
}

.chamber-glass {
  position: absolute;
  left: 13.4%; top: 16.8%; width: 73.1%; height: 49.9%;
  z-index: 4; pointer-events: none;
  background: linear-gradient(115deg, rgba(255, 255, 255, 0.1), transparent 20% 76%, rgba(255, 255, 255, 0.05));
}
.chamber-glass::after {
  content: "";
  position: absolute; left: -20%; top: 0; bottom: 0; width: 30%;
  background: linear-gradient(100deg, transparent, rgba(255, 255, 255, 0.16), transparent);
  transform: skewX(-14deg);
}

.play-instruction {
  margin: 10px 0 6px; padding: 8px 18px; border-radius: 999px;
  background: linear-gradient(180deg, rgba(20, 60, 110, .55), rgba(6, 20, 42, .7));
  border: 1px solid rgba(101, 197, 255, .35);
  color: #eaf6ff; font-size: 13px; font-weight: 700; text-align: center;
  text-shadow: 0 0 10px rgba(60, 190, 255, .5);
}

.control-dock { width: 100%; display: grid; grid-template-columns: 1fr 1.15fr 1fr; gap: 12px; align-items: center; margin-top: 4px; }
.arrow-btn { width: 100%; }
.grab-btn { width: 100%; touch-action: none; }

.shake-button {
  margin-top: 10px; border: 1px solid #366e9f; color: #aee1ff; background: #071d3b; border-radius: 12px;
  padding: 9px 18px; cursor: pointer; font-size: 13px; font-weight: 700;
  display: inline-flex; align-items: center; gap: 8px;
}

.message { min-height: 20px; margin: 12px 0 0; color: #b9dcf6; text-align: center; font-size: 12px; }

@keyframes dangerPulse { to { transform: scale(1.08); background: #76202a; border-color: #ff6f7e; } }
</style>
