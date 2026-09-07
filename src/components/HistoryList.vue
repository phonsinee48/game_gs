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

function formatDate(ts) {
  const d = new Date(ts)
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}
function formatClock(ts) {
  const d = new Date(ts)
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
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
        <span class="history-date">{{ formatDate(e.ts) }}</span>
        <span class="history-clock">{{ formatClock(e.ts) }}</span>
        <span class="history-value" :class="{ coin: e.coinValue }">
          <template v-if="e.coinValue">
            <img class="coin-inline" :src="coinIcon" alt="" />
            <span>
              <span class="value-prefix" v-if="e.kind !== 'redeem'">ได้ </span><template v-else>-</template><span class="value-num">{{ e.coinValue.toLocaleString() }}</span> Coin
            </span>
          </template>
          <template v-else>
            <img class="coin-inline" :src="coinIcon" alt="" />
            <span>{{ e.label }}</span>
          </template>
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

.history-list { list-style: none;  padding: 0; display: flex; flex-direction: column; }
.history-row { position: relative; width: 100%; }
.row-bg { width: 100%; height: auto; display: block; }

/* row.png (1334x344) has a calendar icon at ~31% height and a clock icon
   at ~63% height, both on the left edge, plus a vertical divider at ~49%
   width splitting the row into a date/time half and a reward-info half. */
.history-date {
  position: absolute; left: 17%; width: 32%; top: 26%; height: 22%;
  display: flex; align-items: center;
  font-size: 17px; color: #eaf6ff; font-weight: 700;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.history-clock {
  position: absolute; left: 17%; width: 32%; top: 55%; height: 22%;
  display: flex; align-items: center;
  font-size: 17px; color: #9fc3e6;  font-weight: 650;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.history-value {
  position: absolute; left: 52%; width: 44%; top: 0; height: 100%;
  display: flex; align-items: center; justify-content: center; gap: 6px;
  font-size: clamp(10px, 3vw, 13px); font-weight: 800; color: #7fd0ff;
}
.history-value.coin { color: #ffd739; }
.value-prefix { color: #fff; }
.value-num { font-size: 1.4em; }
.coin-inline { width: 22px; height: 22px; object-fit: contain; flex-shrink: 0; }

.back-btn { width: min(300px, 80vw); margin-top: auto; align-self: center; }
.scene-title {
    width: min(380px, 88vw);
    height: auto;
      filter: drop-shadow(0 6px 14px rgba(0, 0, 0, .45)); }
      
</style>
