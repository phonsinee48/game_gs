<script setup>
import title from '../assets/ui/claw-success/title.png'
import cabinetHolding from '../assets/ui/claw-success/cabinet-holding.png'
import tracker from '../assets/ui/claw-success/tracker.png'
import btnClaim from '../assets/ui/claw-success/btn-claim.png'

defineEmits(['continue'])
</script>

<template>
  <section class="screen scene claw-success-screen">
    <img class="scene-title" :src="title" alt="คีบสำเร็จ! ยินดีด้วย! คุณได้รับไข่รางวัล" />
    <img class="success-cabinet" :src="cabinetHolding" alt="" />
    <img class="success-tracker" :src="tracker" alt="คีบสำเร็จ → กำลังนำส่ง → พร้อมรับรางวัล" />
    <button class="img-btn success-btn" @click="$emit('continue')"><img :src="btnClaim" alt="รับรางวัล" /></button>
  </section>
</template>

<style scoped>
.claw-success-screen { justify-content: flex-start; }
.success-cabinet { width: min(360px, 88vw); height: auto; margin: 4px 0 10px; }
.success-tracker { width: min(380px, 90vw); height: auto; margin: 0 0 18px; }
.success-btn { width: min(280px, 76vw); margin-top: auto; }
</style>
