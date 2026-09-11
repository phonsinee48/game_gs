<script setup>
import title from '../assets/ui/how-to-play/title.png'
import step1 from '../assets/ui/how-to-play/step1.png'
import step2 from '../assets/ui/how-to-play/step2.png'
import step3 from '../assets/ui/how-to-play/step3.png'
import step4 from '../assets/ui/how-to-play/step4.png'
import btnConfirm from '../assets/ui/how-to-play/btn-confirm.png'

defineEmits(['close'])
</script>

<template>
  <section class="screen scene how-to-play-screen">
    <img class="scene-title" :src="title" alt="วิธีเล่น GS CLAW EGG" />

    <div class="steps">
      <img :src="step1" alt="1. ใช้ 10 Points เพื่อเล่น 1 ครั้ง" />
      <img :src="step2" alt="2. เลื่อนเครื่องคีบไปทางซ้าย-ขวา" />
      <img :src="step3" alt="3. กดปุ่มคีบ เพื่อคีบไข่ 1 ฟอง" />
      <img :src="step4" alt="4. แตะเพื่อเปิดไข่ ลุ้นรับ Coin หรือรางวัล" />
    </div>

    <div class="how-to-play-actions">
      <button class="img-btn" @click="$emit('close')"><img :src="btnConfirm" alt="เข้าใจแล้ว" /></button>
    </div>
  </section>
</template>

<style scoped>
.how-to-play-screen { justify-content: flex-start; }
.steps { width: 100%; display: flex; flex-direction: column; gap: 5px; margin-bottom: 10px; }
.steps img { width: 100%; height: auto; display: block; }
.how-to-play-actions {  display: flex; flex-direction: column; gap: 12px; margin-top: 15px; }
</style>
