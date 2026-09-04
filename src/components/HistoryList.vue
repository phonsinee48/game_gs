<script setup>
import GameIcon from './GameIcon.vue'
import coinIcon from '../assets/coin-icon.png'
import title from '../assets/ui/play-history/title.png'
import rowBg from '../assets/ui/play-history/row.png'
import btnHome from '../assets/ui/play-history/btn-home-gold.png'

defineProps({
  entries: { type: Array, required: true },
})

defineEmits(['back'])

function formatTime(ts) {
  const d = new Date(ts)
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
</script>

<template>
  <section class="screen scene history-screen">
    <img class="scene-title" :src="title" alt="ประวัติการเล่น GS CLAW EGG" />

    <div v-if="!entries.length" class="empty-state">
      <GameIcon name="history" />
      <p>ยังไม่มีประวัติการคีบไข่</p>
    </div>

    <ul v-else class="history-list">
      <li v-for="e in entries" :key="e.id" class="history-row">
        <img class="row-bg" :src="rowBg" alt="" />
        <span class="row-content">
          <span class="row-main">
            <span class="history-label">{{ e.label }}</span>
            <small class="history-time">{{ formatTime(e.ts) }}</small>
          </span>
          <span class="history-value" :class="{ coin: e.coinValue }">
            <template v-if="e.coinValue">
              <img class="coin-inline" :src="coinIcon" alt="" />
              {{ e.kind === 'redeem' ? '-' : '+' }}{{ e.coinValue.toLocaleString() }}
            </template>
            <template v-else>รางวัล</template>
          </span>
        </span>
      </li>
    </ul>

    <button class="img-btn back-btn" @click="$emit('back')"><img :src="btnHome" alt="กลับหน้าหลัก" /></button>
  </section>
</template>

<style scoped>
.history-screen { align-items: stretch; justify-content: flex-start; }

.empty-state {
  flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 10px; color: #6f95b8; padding: 40px 0;
}
.empty-state .g-icon { width: 40px; height: 40px; opacity: 0.6; }
.empty-state p { margin: 0; font-size: 13px; }

.history-list { list-style: none; margin: 0 0 18px; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.history-row { position: relative; width: 100%; }
.row-bg { width: 100%; height: auto; display: block; }
.row-content {
  position: absolute; left: 20%; top: 0; right: 6%; height: 100%;
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
}
.row-main { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; text-align: left; min-width: 0; }
.history-label { font-size: clamp(11px, 3.2vw, 13px); color: #eaf6ff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 32vw; }
.history-time { color: #7fa1c2; font-size: 10.5px; }
.history-value { font-size: clamp(11px, 3.2vw, 13px); font-weight: 800; color: #7fd0ff; display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
.history-value.coin { color: #ffd739; }
.coin-inline { width: 13px; height: 13px; object-fit: contain; }

.back-btn { width: min(300px, 80vw); margin-top: auto; }
</style>
