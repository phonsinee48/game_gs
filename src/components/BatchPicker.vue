<script setup>
import { computed, ref } from 'vue'
import GameIcon from './GameIcon.vue'
import btnHome from '../assets/ui/common/btn-home-blue.png'

const props = defineProps({
  tickets: { type: Number, required: true },
})

const emit = defineEmits(['back', 'confirm'])

const count = ref(1)
const quickPicks = computed(() => {
  const opts = new Set([1, Math.min(3, props.tickets), Math.min(5, props.tickets), props.tickets])
  return [...opts].filter((v) => v >= 1).sort((a, b) => a - b)
})

function step(delta) {
  count.value = Math.max(1, Math.min(props.tickets, count.value + delta))
}

function confirm() {
  emit('confirm', count.value)
}
</script>

<template>
  <section class="screen sub-screen">
    <h2 class="brand-heading">เลือกจำนวนสิทธิ์เล่น</h2>

    <p class="rule-note">
      เลือกจำนวนที่จะคีบพร้อมกัน ระบบจะคีบครั้งเดียว แตะไข่ครั้งเดียว
      แล้วลิสต์รางวัลที่ได้ทั้งหมดให้เลย
    </p>

    <div class="exchange-card hud-panel">
      <p class="exchange-balance">สิทธิ์คงเหลือ <strong>{{ tickets }}</strong></p>

      <div class="stepper">
        <button class="stepper-btn" :disabled="count <= 1" @click="step(-1)">−</button>
        <div class="stepper-value">
          <strong>x{{ count }}</strong>
          <small>{{ count > 1 ? 'เปิดพร้อมกัน' : 'สิทธิ์' }}</small>
        </div>
        <button class="stepper-btn" :disabled="count >= tickets" @click="step(1)">+</button>
      </div>

      <div class="quick-picks">
        <button
          v-for="v in quickPicks"
          :key="v"
          class="quick-pick"
          :class="{ active: count === v }"
          @click="count = v"
        >{{ v === tickets && tickets > 1 ? `ทั้งหมด x${v}` : `x${v}` }}</button>
      </div>

      <button class="cta compact" :disabled="tickets < 1" @click="confirm">
        <strong>{{ count > 1 ? `คีบ x${count}` : 'เริ่มเล่น' }}</strong>
      </button>
    </div>
    <button class="img-btn back-btn" @click="emit('back')"><img :src="btnHome" alt="กลับหน้าหลัก" /></button>
  </section>
</template>

<style scoped>
.sub-screen { padding-top: 16px; }

.back-btn { width: min(300px, 80vw); margin-top: auto; }

.rule-note { margin: 6px 0 18px; color: #8fbede; font-size: 11.5px; text-align: center; }

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
</style>
