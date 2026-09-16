<script setup>
import { ref } from "vue";
import title from "../assets/ui/receive-prize/title.webp";
import coinStack from "../assets/ui/receive-prize/coin-stack.webp";
import labelYouGot from "../assets/ui/receive-prize/label-you-got.webp";
import coinWord from "../assets/ui/receive-prize/coin-word.webp";
import coinIcon from "../assets/coin-icon.webp";
import btnHome from "../assets/ui/common/btn-home-blue.webp";
import noteCoin from "../assets/ui/receive-prize/note-coin.webp";
import crackTitle from "../assets/ui/egg-open/title.webp";
import crackSubtitle from "../assets/ui/egg-open/subtitle.webp";
import CrackableEgg from "./CrackableEgg.vue";

const props = defineProps({
  reward: { type: Object, default: null },
  rewardImage: { type: String, required: true },
  confetti: { type: Boolean, default: false },
  // Set when play_claw stopped short of a grab because a reward ran out of
  // stock mid-draw — explains why that grab yielded nothing.
  note: { type: String, default: "" },
  // The color-matched egg image to crack open before the reward shows (see
  // CrackableEgg) — same interaction BatchSummary's list uses per row, just
  // for the lone-egg case. Reveals immediately (no cracking) for older
  // resumed sessions where the original color isn't known (see App.vue's
  // resumePendingBatch).
  eggSrc: { type: String, default: null },
});

const emit = defineEmits(["go-home", "open", "crack"]);

// RewardResult only ever mounts fresh per session (its gameState branch is
// unmounted and remounted between rounds, never reused in place), so a
// plain setup-time default is enough — no watch needed to reset it later.
const opened = ref(!props.eggSrc);

function onOpen() {
  opened.value = true;
  emit("open");
}
</script>

<template>
  <section class="screen scene result-screen">
    <div v-if="confetti" class="confetti" aria-hidden="true">
      <i
        v-for="i in 18"
        :key="i"
        :style="{
          '--i': i,
          '--x': (i * 23) % 100,
          '--dur': 0.9 + (i % 5) * 0.12,
        }"
      ></i>
    </div>

    <template v-if="!opened">
      <img class="scene-title" :src="crackTitle" alt="คุณได้ไข่แล้ว!" />
      <img class="crack-subtitle" :src="crackSubtitle" alt="แตะเพื่อเปิดไข่" />

      <div class="egg-wrap">
        <CrackableEgg
          :egg-src="eggSrc"
          @crack="$emit('crack', $event)"
          @open="onOpen"
        />
      </div>
    </template>

    <template v-else-if="!reward">
      <img
        class="scene-title"
        :src="title"
        alt="ยินดีด้วย! คุณได้รับรางวัลจาก GS CLAW EGG"
      />
      <!-- The crack animation finished but the session's one batch call
           (see App.vue's resolveSessionBatch) hasn't come back yet — can
           happen if the network is unusually slow, since even a 2-tap
           crack usually outlasts that wait. Nothing to reveal until it
           resolves. -->
      <div class="reveal-loading">
        <span class="preloader-spinner"></span>
        <p class="reveal-loading-label">กำลังเปิดไข่...</p>
      </div>
    </template>

    <template v-else>
      <img
        class="scene-title"
        :src="title"
        alt="ยินดีด้วย! คุณได้รับรางวัลจาก GS CLAW EGG"
      />

      <div class="reward-hero">
        <!-- coinStack is a coin-pile pedestal — showing it behind an actual
             prize photo reads as "coins + prize" overlapping, not just one
             reward. Only ever shown for an actual coin win; a prize gets
             its own backend photo standing alone instead. -->
        <img v-if="reward?.type === 'coin'" class="hero-bg" :src="coinStack" alt="" />
        <img
          v-else
          class="hero-prize-standalone"
          :src="rewardImage"
          :alt="reward?.label"
        />
      </div>

      <div v-if="reward?.type === 'coin'" class="amount-wrap">
        <img class="label-you-got" :src="labelYouGot" alt="คุณได้รับ" />
        <div class="amount-row">
          <img class="amount-coin-icon" :src="coinIcon" alt="" />
          <span class="amount-num">{{ reward?.value }}</span>
          <img class="amount-coin-word" :src="coinWord" alt="Coin" />
        </div>
      </div>
      <h1 v-else class="prize-label">{{ reward?.label }}</h1>

      <p v-if="note" class="stock-note">{{ note }}</p>

      <div class="result-actions">
        <button class="img-btn" @click="$emit('go-home')">
          <img :src="btnHome" alt="กลับหน้าหลัก" />
        </button>
      </div>

      <img
        v-if="reward?.type === 'coin'"
        class="scene-note reward-note-img"
        :src="noteCoin"
        alt="Coin จะถูกเพิ่มเข้าบัญชีของคุณทันที"
      />
      <p v-else class="reward-note">ของรางวัลจะถูกบันทึกในประวัติรางวัล</p>
    </template>
  </section>
</template>

<style scoped>
.result-screen {
  justify-content: flex-start;
  text-align: center;
  overflow: hidden;
}

.crack-subtitle {
  width: min(260px, 66vw);
  height: auto;
  margin: 0 0 20px;
}

.egg-wrap {
  width: min(240px, 62vw);
}

.reveal-loading {
  margin-top: 30px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.reveal-loading-label {
  margin: 0;
  color: #9fd3ff;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.3px;
}

.reward-hero {
  position: relative;
  width: min(260px, 66vw);
  aspect-ratio: 1;
  margin: 4px 0 6px;
  display: grid;
  place-items: center;
  animation: rewardPop 0.6s cubic-bezier(0.2, 0.9, 0.25, 1.25) both;
}
.hero-bg {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.hero-prize-standalone {
  width: 84%;
  height: 84%;
  object-fit: contain;
  filter: drop-shadow(0 14px 22px rgba(0, 0, 0, 0.4));
}

.amount-wrap {
  position: relative;
  width: min(320px, 84vw);
  margin: -85px 0 5px;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.label-you-got {
  width: min(220px, 58vw);
  height: auto;
  display: block;
}
.amount-row {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 10px 24px;
  border-radius: 999px;
  animation: rewardPop 0.6s 0.1s cubic-bezier(0.2, 0.9, 0.25, 1.25) both;
}
.amount-coin-icon {
  width: 45px;
  height: 45px;
  object-fit: contain;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.35));
}
.amount-coin-word {
  width: 62px;
  aspect-ratio: 425 / 220;
  height: auto;
  object-fit: contain;
}
.amount-num {
  font-family: "Baloo 2", Inter, ui-sans-serif, system-ui, sans-serif;
  font-size: 60px;
  font-weight: 800;
  line-height: 1;
  color: #ffd739;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
  font-variant-numeric: tabular-nums;
}
.prize-label {
  margin: 8px 0 6px;
  font-size: 22px;
  max-width: 90%;
  color: #ffd739;
}
.reward-note {
  margin: 0;
  color: #a9cbe4;
  font-size: 12px;
}
.stock-note {
  margin: 0 0 8px;
  padding: 6px 14px;
  max-width: 90%;
  color: #ffcf8f;
  background: rgba(255, 169, 0, 0.12);
  border: 1px solid rgba(255, 169, 0, 0.4);
  border-radius: 10px;
  font-size: 11.5px;
  line-height: 1.4;
}
.reward-note-img {
  width: min(375px, 100vw);
  margin: 15px 0 0;
}

.result-actions {
  width: min(280px, 80vw);
  display: flex;
  flex-direction: row;
  justify-content: center;
}
.result-actions .img-btn {
  flex: 1;
  min-width: 0;
}

.confetti {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 20;
  overflow: hidden;
}

.scene-title {
  width: min(380px, 88vw);
  height: auto;
  filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.45));
}

.confetti i {
  position: absolute;
  left: calc(var(--x) * 1%);
  top: -12px;
  width: 8px;
  height: 14px;
  border-radius: 2px;
  background: linear-gradient(180deg, #ffe37a, #f5a400);
}
.confetti i:nth-child(3n) {
  background: linear-gradient(180deg, #9fe0ff, #1f9bff);
}
.confetti i {
  animation: confettiFall calc(var(--dur) * 1s) ease-in forwards;
  transform: rotate(calc(var(--i) * 29deg));
}

@keyframes rewardPop {
  0% {
    opacity: 0;
    transform: scale(0.62) rotate(-4deg);
  }
  70% {
    transform: scale(1.05);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}
@keyframes confettiFall {
  0% {
    opacity: 1;
    transform: translateY(-10px) rotate(0);
  }
  100% {
    opacity: 0;
    transform: translateY(730px) rotate(620deg);
  }
}
</style>
