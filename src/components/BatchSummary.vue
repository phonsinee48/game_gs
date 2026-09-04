<script setup>
import { computed } from 'vue'
import coinIcon from '../assets/coin-icon.png'
import btnHome from '../assets/ui/common/btn-home-blue.png'

const props = defineProps({
  rewards: { type: Array, required: true },
  tickets: { type: Number, required: true },
})

defineEmits(['play-more', 'go-home'])

const coinTotal = computed(() => props.rewards.filter((r) => r.type === 'coin').reduce((s, r) => s + r.value, 0))
const prizeCount = computed(() => props.rewards.filter((r) => r.type === 'prize').length)
</script>

<template>
  <section class="screen result-screen summary-screen">
    <p class="section-kicker">เปิดพร้อมกัน x{{ rewards.length }}</p>
    <h2 class="brand-heading">รางวัลที่ได้รับทั้งหมด</h2>

    <div class="summary-totals">
      <div class="summary-chip">
        <img :src="coinIcon" alt="" />
        <span>+{{ coinTotal.toLocaleString() }}</span>
      </div>
      <div class="summary-chip" v-if="prizeCount">
        <span class="prize-dot"></span>
        <span>{{ prizeCount }} ของรางวัล</span>
      </div>
    </div>

    <ul class="summary-list">
      <li v-for="(r, i) in rewards" :key="i" class="summary-row">
        <span class="summary-index">{{ i + 1 }}</span>
        <span class="summary-label">{{ r.label }}</span>
      </li>
    </ul>

    <button class="cta compact" :disabled="tickets < 1" @click="$emit('play-more')">
      <strong>เล่นต่อ</strong>
      <small v-if="tickets >= 1">เหลือ {{ tickets }} สิทธิ์</small>
      <small v-else>สิทธิ์หมดแล้ว</small>
    </button>
    <button class="img-btn back-btn" @click="$emit('go-home')"><img :src="btnHome" alt="กลับหน้าหลัก" /></button>
  </section>
</template>

<style scoped>
.summary-screen { justify-content: center; text-align: center; }
.section-kicker { margin: 0 0 5px; color: #7fd0ff; font-size: 12px; font-weight: 900; letter-spacing: 1.5px; }
.summary-screen .brand-heading { margin-bottom: 16px; }
.back-btn { width: min(300px, 80vw); margin-top: 14px; }

.summary-totals { display: flex; gap: 10px; margin-bottom: 16px; }
.summary-chip {
  display: flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 999px;
  background: rgba(255, 215, 57, 0.1); border: 1px solid rgba(255, 215, 57, 0.35);
  color: #ffe9a8; font-weight: 800; font-size: 13px;
}
.summary-chip img { width: 16px; height: 16px; object-fit: contain; }
.prize-dot { width: 8px; height: 8px; border-radius: 50%; background: #7fd0ff; box-shadow: 0 0 8px #7fd0ff; }

.summary-list {
  width: 100%; max-height: 260px; overflow-y: auto; list-style: none; margin: 0 0 22px; padding: 4px;
  display: flex; flex-direction: column; gap: 6px;
}
.summary-row {
  display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 12px;
  background: linear-gradient(180deg, rgba(20, 60, 110, 0.32), rgba(6, 20, 42, 0.5));
  border: 1px solid rgba(101, 197, 255, 0.16); font-size: 12.5px; text-align: left;
}
.summary-index {
  width: 20px; height: 20px; border-radius: 50%; background: #08254b; color: #7fd0ff;
  display: grid; place-items: center; font-size: 10.5px; font-weight: 800; flex-shrink: 0;
}
.summary-label { color: #eaf6ff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
