<script setup>
import { computed, ref } from 'vue'
import GameIcon from './GameIcon.vue'
import btnHome from '../assets/ui/common/btn-home-blue.png'

const RATE = 10
const MAX_AMOUNT = 100

const props = defineProps({
  points: { type: Number, required: true },
})

const emit = defineEmits(['back', 'confirm'])

const maxAffordable = computed(() => Math.min(MAX_AMOUNT, Math.floor(props.points / RATE) * RATE))
const amount = ref(Math.min(RATE, Math.max(0, maxAffordable.value)))

function ticketsFor(amt) {
  const base = Math.floor(amt / RATE)
  const bonus = amt >= MAX_AMOUNT ? 1 : 0
  return { base, bonus, total: base + bonus }
}

const preview = computed(() => ticketsFor(amount.value))
const canConfirm = computed(() => amount.value >= RATE && amount.value <= props.points)

function step(delta) {
  const next = amount.value + delta
  amount.value = Math.max(RATE, Math.min(maxAffordable.value, next))
}

function pick(v) {
  amount.value = Math.min(v, maxAffordable.value)
}

function confirm() {
  if (!canConfirm.value) return
  emit('confirm', amount.value)
}
</script>

<template>
  <section class="screen sub-screen">
    <h2 class="brand-heading">แลก Point เป็นสิทธิ์เล่น</h2>

    <p class="rule-note">อัตราแลก 10 Point = 1 สิทธิ์ · แลกสูงสุดครั้งละ {{ MAX_AMOUNT }} Point (แถม 1 สิทธิ์)</p>

    <div class="exchange-card hud-panel">
      <p class="exchange-balance">Point คงเหลือ <strong>{{ points.toLocaleString() }}</strong></p>

      <div class="stepper">
        <button class="stepper-btn" :disabled="amount <= RATE" @click="step(-RATE)">−</button>
        <div class="stepper-value">
          <strong>{{ amount }}</strong>
          <small>Point</small>
        </div>
        <button class="stepper-btn" :disabled="amount >= maxAffordable" @click="step(RATE)">+</button>
      </div>

      <div class="quick-picks">
        <button
          v-for="v in [10, 50, 100]"
          :key="v"
          class="quick-pick"
          :class="{ active: amount === v }"
          :disabled="v > maxAffordable"
          @click="pick(v)"
        >{{ v }}</button>
      </div>

      <div class="exchange-preview">
        <GameIcon name="ticket" />
        <span>จะได้รับ <strong>{{ preview.total }}</strong> สิทธิ์</span>
        <small v-if="preview.bonus">(รวมโบนัส +{{ preview.bonus }})</small>
      </div>

      <button class="cta compact" :disabled="!canConfirm" @click="confirm">
        <strong>ยืนยันแลก</strong>
      </button>
      <p v-if="points < RATE" class="rule-note warn">Point ไม่พอสำหรับแลกสิทธิ์</p>
    </div>
    <button class="img-btn back-btn" @click="emit('back')"><img :src="btnHome" alt="กลับหน้าหลัก" /></button>
  </section>
</template>

<style scoped>
.sub-screen { padding-top: 16px; }

.back-btn { width: min(300px, 80vw); margin-top: auto; }

.rule-note { margin: 6px 0 18px; color: #8fbede; font-size: 11.5px; text-align: center; }
.rule-note.warn { color: #ff9aa4; margin-top: 14px; }

.exchange-balance { margin: 0 0 18px; color: #bcdcfa; font-size: 13px; }
.exchange-balance strong { color: #ffd739; font-size: 16px; }

.stepper { display: flex; align-items: center; gap: 20px; margin-bottom: 16px; }
.stepper-btn {
  width: 46px; height: 46px; border-radius: 14px; border: 1px solid #398fd0; color: #eaf6ff;
  background: linear-gradient(#0c3a6f, #082b53); font-size: 22px; line-height: 1; cursor: pointer;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12), 0 0 10px rgba(40, 150, 255, .18);
}
.stepper-btn:active:not(:disabled) { filter: brightness(1.2); }
.stepper-value { text-align: center; min-width: 80px; }
.stepper-value strong { display: block; font-size: 30px; color: #fff; text-shadow: 0 0 12px rgba(60, 190, 255, .5); }
.stepper-value small { color: #82ccff; font-size: 11px; }

.quick-picks { display: flex; gap: 10px; margin-bottom: 20px; }
.quick-pick {
  min-width: 56px; padding: 8px 14px; border-radius: 999px; border: 1px solid rgba(101, 197, 255, .4);
  background: linear-gradient(180deg, rgba(20, 60, 110, 0.5), rgba(6, 20, 42, 0.7));
  color: #cfeaff; cursor: pointer; font-weight: 700; font-size: 13px;
}
.quick-pick.active {
  background: linear-gradient(180deg, #2bb9ff, #0872db); border-color: #65caff; color: #fff;
  box-shadow: 0 0 14px rgba(60, 190, 255, .55);
}

.exchange-preview {
  display: flex; align-items: center; gap: 8px; margin-bottom: 18px;
  padding: 10px 16px; border-radius: 12px; background: rgba(255, 215, 57, 0.08);
  border: 1px solid rgba(255, 215, 57, 0.3); color: #ffe9a8; font-size: 13.5px;
}
.exchange-preview .g-icon { width: 18px; height: 18px; color: #ffd739; }
.exchange-preview small { color: #ffd739; }
</style>
