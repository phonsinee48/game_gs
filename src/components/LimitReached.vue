<script setup>
import titleGsClawEgg from '../assets/ui/common/title-gs-claw-egg.png'
import btnHome from '../assets/ui/common/btn-home-blue.png'
import message from '../assets/ui/limit-reached/message.png'
import eggSad from '../assets/ui/limit-reached/egg-sad.png'
import pedestal from '../assets/ui/limit-reached/pedestal.png'
import btnOk from '../assets/ui/limit-reached/btn-ok.png'

defineEmits(['go-home'])
</script>

<template>
  <section class="screen scene limit-screen">
    <img class="scene-title" :src="titleGsClawEgg" alt="GS Claw Egg" />
    <img class="limit-message" :src="message" alt="คุณใช้สิทธิ์ครบแล้ว กลับมาเล่นใหม่พรุ่งนี้นะ!" />

    <div class="mascot-stack">
      <img class="mascot-egg" :src="eggSad" alt="" />
      <img class="mascot-pedestal" :src="pedestal" alt="" />
    </div>

    <div class="limit-actions">
      <button class="img-btn" @click="$emit('go-home')"><img :src="btnOk" alt="ตกลง" /></button>
      <button class="img-btn" @click="$emit('go-home')"><img :src="btnHome" alt="กลับหน้าหลัก" /></button>
    </div>
  </section>
</template>

<style scoped>
.limit-screen { justify-content: flex-start; }
.limit-message { width: min(360px, 90vw); height: auto; margin: 4px 0 16px; }
.mascot-stack {
  position: relative; width: min(260px, 68vw); margin: 6px auto 18px;
  display: flex; flex-direction: column; align-items: center;
}
.mascot-egg { width: 76%; margin-bottom: -16%; z-index: 2; filter: drop-shadow(0 14px 18px rgba(0,0,0,.4)); }
.mascot-pedestal { width: 100%; z-index: 1; }
.limit-actions { width: min(320px, 84vw); display: flex; flex-direction: column; gap: 12px; margin-top: auto; }
</style>
