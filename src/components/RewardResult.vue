<script setup>
import title from '../assets/ui/receive-prize/title.png'
import coinStack from '../assets/ui/receive-prize/coin-stack.png'
import amountTemplate from '../assets/ui/receive-prize/amount-template.png'
import btnClaim from '../assets/ui/receive-prize/btn-claim.png'
import btnAgain from '../assets/ui/receive-prize/btn-again.png'

defineProps({
  reward: { type: Object, default: null },
  rewardImage: { type: String, required: true },
  canPlay: { type: Boolean, default: false },
  confetti: { type: Boolean, default: false },
})

defineEmits(['play-again', 'go-home'])
</script>

<template>
  <section class="screen scene result-screen">
    <div v-if="confetti" class="confetti" aria-hidden="true">
      <i v-for="i in 18" :key="i" :style="{ '--i': i, '--x': (i * 23) % 100, '--dur': 0.9 + (i % 5) * 0.12 }"></i>
    </div>

    <img class="scene-title" :src="title" alt="ยินดีด้วย! คุณได้รับรางวัลจาก GS CLAW EGG" />

    <div class="reward-hero">
      <img class="hero-bg" :src="coinStack" alt="" />
      <img v-if="reward?.type !== 'coin'" class="hero-prize" :src="rewardImage" :alt="reward?.label" />
    </div>

    <div v-if="reward?.type === 'coin'" class="amount-wrap">
      <img class="amount-bg" :src="amountTemplate" alt="" />
      <span class="amount-num">{{ reward?.value }}</span>
    </div>
    <h1 v-else class="prize-label">{{ reward?.label }}</h1>

    <p class="reward-note">
      {{ reward?.type === 'coin' ? 'Coin จะถูกเพิ่มเข้าบัญชีของคุณทันที' : 'ของรางวัลจะถูกบันทึกในประวัติรางวัล' }}
    </p>

    <div class="result-actions">
      <button class="img-btn" @click="$emit('go-home')"><img :src="btnClaim" alt="รับรางวัล" /></button>
      <button class="img-btn" :disabled="!canPlay" @click="$emit('play-again')"><img :src="btnAgain" alt="เล่นอีกครั้ง" /></button>
    </div>
  </section>
</template>

<style scoped>
.result-screen { justify-content: flex-start; text-align: center; overflow: hidden; }

.reward-hero {
  position: relative; width: min(260px, 66vw); aspect-ratio: 1; margin: 4px 0 6px;
  display: grid; place-items: center;
  animation: rewardPop 0.6s cubic-bezier(0.2, 0.9, 0.25, 1.25) both;
}
.hero-bg { width: 100%; height: 100%; object-fit: contain; }
.hero-prize { position: absolute; width: 46%; height: 46%; object-fit: contain; filter: drop-shadow(0 10px 16px rgba(0,0,0,.35)); }

.amount-wrap { position: relative; width: min(320px, 84vw); margin: 4px 0 10px; }
.amount-bg { width: 100%; height: auto; display: block; }
.amount-num {
  position: absolute; left: 44%; top: 62%; transform: translateY(-50%);
  font-size: clamp(20px, 6vw, 26px); font-weight: 900; color: #ffd739;
  text-shadow: 0 2px 4px rgba(0,0,0,.4);
  font-variant-numeric: tabular-nums;
}
.prize-label { margin: 8px 0 6px; font-size: 22px; max-width: 90%; color: #ffd739; }
.reward-note { margin: 0 0 6px; color: #a9cbe4; font-size: 12px; }

.result-actions { width: min(300px, 80vw); display: flex; flex-direction: column; gap: 12px; margin-top: auto; }

.confetti { position: absolute; inset: 0; pointer-events: none; z-index: 20; overflow: hidden; }
.confetti i {
  position: absolute; left: calc(var(--x) * 1%); top: -12px; width: 8px; height: 14px; border-radius: 2px;
  background: linear-gradient(180deg, #ffe37a, #f5a400);
}
.confetti i:nth-child(3n) { background: linear-gradient(180deg, #9fe0ff, #1f9bff); }
.confetti i {
  animation: confettiFall calc(var(--dur) * 1s) ease-in forwards;
  transform: rotate(calc(var(--i) * 29deg));
}

@keyframes rewardPop { 0% { opacity: 0; transform: scale(0.62) rotate(-4deg); } 70% { transform: scale(1.05); } 100% { opacity: 1; transform: scale(1); } }
@keyframes confettiFall { 0% { opacity: 1; transform: translateY(-10px) rotate(0); } 100% { opacity: 0; transform: translateY(730px) rotate(620deg); } }
</style>
