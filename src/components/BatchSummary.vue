<script setup>
import { computed } from "vue";
import coinIcon from "../assets/coin-icon.png";
import title from "../assets/ui/receive-prize/title.png";
import totalsBg from "../assets/ui/receive-prize/GS Game (60).png";
import detailHeaderBg from "../assets/ui/receive-prize/GS Game (62).png";
import detailPanelBg from "../assets/ui/receive-prize/GS Game (63).png";
import rowBg from "../assets/ui/receive-prize/GS Game (61).png";
import btnClaim from "../assets/ui/receive-prize/btn-claim.png";
import btnAgain from "../assets/ui/receive-prize/btn-again.png";

const props = defineProps({
  rewards: { type: Array, required: true },
  tickets: { type: Number, required: true },
  confetti: { type: Boolean, default: false },
});

defineEmits(["play-more", "go-home"]);

const coinTotal = computed(() =>
  props.rewards
    .filter((r) => r.type === "coin")
    .reduce((s, r) => s + r.value, 0),
);
</script>

<template>
  <section class="screen scene summary-screen">
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

    <img
      class="scene-title"
      :src="title"
      alt="ยินดีด้วย! คุณได้รับรางวัลจาก GS CLAW EGG"
    />

    <div class="totals-panel">
      <img class="totals-bg" :src="totalsBg" alt="ผลการคีบทั้งหมด" />
      <span class="totals-times-num">{{ rewards.length }}</span>
      <div class="totals-coin-row">
        <img class="totals-coin-icon" :src="coinIcon" alt="" />
        <span class="totals-coin-num">{{ coinTotal.toLocaleString() }}</span>
      </div>
    </div>

    <img class="detail-header" :src="detailHeaderBg" alt="รายละเอียดรางวัล" />

    <div class="detail-panel">
      <img class="detail-panel-bg" :src="detailPanelBg" alt="" />
      <ul class="reward-rows">
        <li v-for="(r, i) in rewards" :key="i" class="reward-row">
          <img class="row-bg" :src="rowBg" alt="" />
          <span class="row-index">{{ i + 1 }}</span>
          <span class="row-content">
            <img
              v-if="r.type === 'coin'"
              class="row-coin-icon"
              :src="coinIcon"
              alt=""
            />
            <span class="row-value">{{
              r.type === "coin" ? r.value : r.label
            }}</span>
            <span v-if="r.type === 'coin'" class="row-unit">Coin</span>
          </span>
        </li>
      </ul>
    </div>

    <div class="summary-actions">
      <button class="img-btn" @click="$emit('go-home')">
        <img :src="btnClaim" alt="รับรางวัล" />
      </button>
      <button
        class="img-btn"
        :disabled="tickets < 1"
        @click="$emit('play-more')"
      >
        <img :src="btnAgain" alt="เล่นอีกครั้ง" />
      </button>
    </div>
  </section>
</template>

<style scoped>
.summary-screen {
  text-align: center;
}

/* Percentages measured against the 930x476 totals-panel background
   (GS Game (60).png) — its title, "คุณได้ใช้สิทธิ์คีบทั้งหมด ... ครั้ง" and
   "รวมทั้งหมด" / "Coin" copy are baked in; only the tap-count and the coin
   total are live overlays. */
.totals-panel {
  position: relative;
  width: 100%;
  max-width: 380px;
  margin: 0 0 14px;
  aspect-ratio: 930 / 476;
}
.totals-bg {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}
.totals-times-num {
  position: absolute;
  left: 58%;
  width: 8%;
  top: 23%;
  height: 13%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: "Baloo 2", Inter, ui-sans-serif, system-ui, sans-serif;
  font-weight: 800;
  color: #fff;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
  font-size: 20px;
  font-variant-numeric: tabular-nums;
}
.totals-coin-row {
  position: absolute;
  left: 38%;
  width: 47%;
  top: 56%;
  height: 27%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}
.totals-coin-icon {
  width: 27%;
  height: auto;
  object-fit: contain;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.35));
}
.totals-coin-num {
  font-family: "Baloo 2", Inter, ui-sans-serif, system-ui, sans-serif;
  font-weight: 800;
  color: #ffd739;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
  font-size: 40px;
  font-variant-numeric: tabular-nums;
}

.detail-header {
  width: min(280px, 72vw);
  height: auto;
  margin: 0px 0 -27px;
  position: relative;
  z-index: 1;
}

/* Container height is driven by however many rows there are (capped by
   .reward-rows' own max-height + scroll) — the frame art stretches to
   match via object-fit:fill, same trick CoinRewards uses for its rows. */
.detail-panel {
  position: relative;
  width: 100%;
  max-width: 380px;
  padding: 30px 7% 22px;
  margin-bottom: 16px;
}
.detail-panel-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: fill;
  z-index: 0;
}

.reward-rows {
  position: relative;
  z-index: 1;
  list-style: none;
  margin: 0;
  padding: 2px 4px 2px 0;
  max-height: 230px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.reward-row {
  position: relative;
  width: 100%;
  aspect-ratio: 1489 / 190;
}
.row-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: fill;
  display: block;
}
.row-index {
  position: absolute;
  left: 1.5%;
  width: 13%;
  top: 2%;
  height: 92%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #7fd0ff;
  font-weight: 800;
  font-size: clamp(12px, 3.6vw, 16px);
}
.row-content {
  position: absolute;
  left: 16%;
  width: 78%;
  top: 0;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 6px;
  overflow: hidden;
}
.row-coin-icon {
  width: 22px;
  height: 22px;
  object-fit: contain;
  flex-shrink: 0;
}
.row-value {
  color: #fff;
  font-weight: 800;
  font-size: clamp(13px, 3.8vw, 17px);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.row-unit {
  color: #ffb84d;
  font-weight: 700;
  font-size: clamp(11px, 3.2vw, 14px);
  flex-shrink: 0;
}

.summary-actions {
  width: min(380px, 92vw);
  display: flex;
  flex-direction: row;
  justify-content: center;
  gap: 12px;
}
.summary-actions .img-btn {
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
.confetti i {
  position: absolute;
  left: calc(var(--x) * 1%);
  top: -12px;
  width: 8px;
  height: 14px;
  border-radius: 2px;
  background: linear-gradient(180deg, #ffe37a, #f5a400);
  animation: confettiFall calc(var(--dur) * 1s) ease-in forwards;
  transform: rotate(calc(var(--i) * 29deg));
}
.confetti i:nth-child(3n) {
  background: linear-gradient(180deg, #9fe0ff, #1f9bff);
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
