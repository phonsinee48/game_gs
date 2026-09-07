<script setup>
import titleArt from '../assets/ui/redeemed/title.png'
import contentArt from '../assets/ui/redeemed/content.png'
import btnStartGame from '../assets/ui/redeemed/btn-start-game.png'
import btnExchangeMore from '../assets/ui/redeemed/btn-exchange-more.png'
import btnHome from '../assets/ui/redeemed/btn-home.png'

defineProps({
  tickets: { type: Number, required: true },
  points: { type: Number, required: true },
})

defineEmits(['start', 'exchange-more', 'go-home'])
</script>

<template>
  <section class="screen scene redeem-success-screen">
    <img class="scene-title redeem-title" :src="titleArt" alt="แลกสำเร็จ! คุณมีสิทธิ์เล่นแล้ว" />

    <div class="redeem-content">
      <img class="redeem-content-bg" :src="contentArt" alt="" />
      <span class="redeem-tickets-num">{{ tickets }}</span>
      <span class="redeem-points-num">{{ points.toLocaleString() }}</span>
    </div>

    <div class="redeem-actions">
      <button class="img-btn" @click="$emit('start')"><img :src="btnStartGame" alt="เริ่มเกม" /></button>
      <button class="img-btn" @click="$emit('exchange-more')"><img :src="btnExchangeMore" alt="แลกเพิ่ม" /></button>
    </div>

    <button class="img-btn redeem-home-btn" @click="$emit('go-home')"><img :src="btnHome" alt="กลับหน้าหลัก" /></button>
  </section>
</template>

<style scoped>
.redeem-success-screen { justify-content: flex-start; }
.redeem-title { width: min(360px, 86vw); margin: 4px 0 6px; }

/* Percentages measured against the 527x632 source art (content.png). The
   baked "1" (tickets) and "110" (points) numbers were erased from it so
   the live values can be overlaid at the exact same spot. */
.redeem-content { position: relative; width: min(300px, 76vw); aspect-ratio: 527 / 632; margin: 0 0 6px; }
.redeem-content-bg { width: 100%; height: 100%; object-fit: contain; }
.redeem-tickets-num {
  position: absolute; left: 26%; width: 40%; top: 50%; height: 27%;
  display: flex; align-items: center; justify-content: center;
  font-family: 'Baloo 2', Inter, ui-sans-serif, system-ui, sans-serif;
  font-weight: 800; line-height: 1; color: #ffd739;
  font-size: clamp(50px, 19vw, 88px);
  text-shadow: 0 0 16px rgba(255, 200, 60, .6), 0 3px 4px rgba(0,0,0,.4);
  font-variant-numeric: tabular-nums;
}
.redeem-points-num {
  position: absolute; left: 66.8%; width: 28%; top: 79.75%; height: 8.9%;
  display: flex; align-items: center; justify-content: flex-start;
  font-family: 'Baloo 2', Inter, ui-sans-serif, system-ui, sans-serif;
  font-weight: 800; line-height: 1; color: #ffd739;
  font-size: clamp(17px, 5.6vw, 24px);
  text-shadow: 0 2px 4px rgba(0,0,0,.4);
  font-variant-numeric: tabular-nums;
}

.redeem-actions { width: min(300px, 78vw); display: flex; flex-direction: column; gap: 10px; margin: 6px 0 14px; }

.redeem-home-btn { width: min(260px, 68vw); margin-top: auto; }
</style>
