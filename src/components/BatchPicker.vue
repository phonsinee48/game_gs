<script setup>
import { computed, ref } from "vue";
import titleArt from "../assets/ui/use-ticket/title.png";
import stepperPanel from "../assets/ui/use-ticket/stepper-panel.png";
import labelRemain from "../assets/ui/use-ticket/label-remain.png";
import labelUse from "../assets/ui/use-ticket/label-use.png";
import btnMinus from "../assets/ui/use-ticket/btn-minus.png";
import btnPlus from "../assets/ui/use-ticket/btn-plus.png";
import pillActive from "../assets/ui/use-ticket/pill-active.png";
import pillInactive from "../assets/ui/use-ticket/pill-inactive.png";
import previewPanel from "../assets/ui/use-ticket/preview-panel.png";
import btnStartGame from "../assets/ui/redeemed/btn-start-game.png";
import btnExchangeMore from "../assets/ui/redeemed/btn-exchange-more.png";
import btnHome from "../assets/ui/redeemed/btn-home.png";

const props = defineProps({
  tickets: { type: Number, required: true },
});

const emit = defineEmits(["back", "confirm", "exchange-more"]);

// Mirrors the exchange screen's own cap: 100 points max per exchange = 10
// tickets + 1 bonus = 11. A round can't use more than that many at once,
// same as the exchange screen won't sell more than that in one go.
const MAX_BATCH = 11;

const count = ref(1);
const maxUsable = computed(() => Math.min(MAX_BATCH, props.tickets));
const quickPicks = computed(() => {
  const opts = new Set([1, Math.min(5, maxUsable.value), maxUsable.value]);
  return [...opts].filter((v) => v >= 1).sort((a, b) => a - b);
});
const remainAfter = computed(() => props.tickets - count.value);

function step(delta) {
  count.value = Math.max(1, Math.min(maxUsable.value, count.value + delta));
}

function pick(v) {
  count.value = Math.min(v, maxUsable.value);
}

function confirm() {
  emit("confirm", count.value);
}

function pillBg(v) {
  return count.value === v ? pillActive : pillInactive;
}

// pill-active.png is a narrower crop than pill-inactive.png, so sizing each
// pill by its own image (height:100%, width:auto) made a pick visibly
// shrink the moment it became active. Fix each pill's box to its *resting*
// (inactive) aspect ratio instead, and let the active art stretch to fill
// that same box — the box never changes size on select.
const PILL_RATIO = 314 / 118;
function pillStyle() {
  return { aspectRatio: String(PILL_RATIO) };
}

const PILL_NUM_BOX = { left: "0", width: "100%", top: "0", height: "100%" };
function pillNumStyle() {
  return PILL_NUM_BOX;
}
</script>

<template>
  <section class="screen sub-screen use-ticket-screen">
    <img
      class="scene-title use-ticket-title"
      :src="titleArt"
      alt="เลือกใช้สิทธิ์เล่น เลือกจำนวนครั้งที่ต้องการใช้"
    />

    <div class="stepper-card">
      <img class="stepper-card-bg" :src="stepperPanel" alt="" />

      <div class="label-remain-wrap">
        <img class="fill-img" :src="labelRemain" alt="สิทธิ์คงเหลือ" />
        <span class="label-remain-num">{{ tickets }}</span>
      </div>

      <div class="stepper-row">
        <button
          class="img-btn stepper-minus"
          :disabled="count <= 1"
          @click="step(-1)"
          aria-label="ลดจำนวน"
        >
          <img :src="btnMinus" alt="" />
        </button>
        <div class="stepper-value-wrap">
          <img class="fill-img" :src="labelUse" alt="สิทธิ์" />
          <span class="label-use-num">{{ count }}</span>
        </div>
        <button
          class="img-btn stepper-plus"
          :disabled="count >= maxUsable"
          @click="step(1)"
          aria-label="เพิ่มจำนวน"
        >
          <img :src="btnPlus" alt="" />
        </button>
      </div>

      <div class="quick-picks">
        <button
          v-for="v in quickPicks"
          :key="v"
          class="quick-pick"
          :style="pillStyle(v)"
          @click="pick(v)"
        >
          <img class="quick-pick-bg" :src="pillBg(v)" alt="" />
          <span class="quick-pick-num" :style="pillNumStyle(v)">{{ v }}</span>
        </button>
      </div>

      <div class="use-preview-wrap">
        <img class="fill-img" :src="previewPanel" alt="" />
        <span class="use-preview-hero-num">{{ count }}</span>
        <span class="use-preview-num use-preview-num-use">{{ count }}</span>
        <span class="use-preview-num use-preview-num-play">1</span>
        <span class="use-preview-num use-preview-num-remain">{{
          remainAfter
        }}</span>
      </div>
    </div>

    <div class="use-ticket-actions">
      <button
        class="img-btn use-ticket-exchange-more-btn"
        @click="emit('exchange-more')"
      >
        <img :src="btnExchangeMore" alt="แลกเพิ่ม" />
      </button>
      <button class="img-btn" :disabled="tickets < 1" @click="confirm">
        <img :src="btnStartGame" alt="เริ่มเกม" />
      </button>
    </div>

    <button class="img-btn use-ticket-home-btn" @click="emit('back')">
      <img :src="btnHome" alt="กลับหน้าหลัก" />
    </button>
  </section>
</template>

<style scoped>
.use-ticket-screen {
  padding-top: 10px;
  justify-content: flex-start;
}
.use-ticket-title {
  width: 100%;
  margin: 0 0 8px;
}

.fill-img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: contain;
}

/* Percentages measured against the 574x710 source art (stepper-panel.png),
   which now holds the whole card — label, stepper, quick-picks and the
   ticket-preview row all sit inside its one border. Each composited piece
   (label-remain.png, label-use.png, the 3 pill states, preview-panel.png)
   is wrapped in its own aspect-ratio box so its *own* internal percentages
   (where its baked number was erased) stay independent of the outer card's
   scale. */
.stepper-card {
  position: relative;
  aspect-ratio: 574 / 710;
  margin: 0 0 8px;
}
.stepper-card-bg {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.label-remain-wrap {
  position: absolute;
  left: 22.5%;
  width: 55%;
  top: 8%;
  aspect-ratio: 440 / 89;
}
.label-remain-num {
  position: absolute;
  left: 88.1%;
  width: 14.5%;
  top: 35%;
  height: 55%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: "Baloo 2", Inter, ui-sans-serif, system-ui, sans-serif;
  font-weight: 800;
  line-height: 1;
  color: #ffd739;
  font-size: 36px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
  font-variant-numeric: tabular-nums;
}

.stepper-row {
  position: absolute;
  left: 12%;
  width: 76%;
  top: 20%;
  height: 13%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.stepper-minus,
.stepper-plus {
  height: 100%;
  width: auto;
  flex-shrink: 0;
}
.stepper-minus img,
.stepper-plus img {
  height: 100%;
  width: auto;
  display: block;
}
.stepper-value-wrap {
  position: relative;
  height: 90%;
  aspect-ratio: 135 / 141;
  top: 26px;
}
.label-use-num {
  position: absolute;
  left: 0;
  width: 100%;
  top: -35%;
  height: 38%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: "Baloo 2", Inter, ui-sans-serif, system-ui, sans-serif;
  font-weight: 800;
  line-height: 1;
  color: #fff;
  font-size: 48px;
  text-shadow:
    0 0 10px rgba(60, 190, 255, 0.6),
    0 2px 4px rgba(0, 0, 0, 0.4);
  font-variant-numeric: tabular-nums;
}

.quick-picks {
  position: absolute;
  left: 10%;
  width: 80%;
  top: 37%;
  height: 8%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
}
.quick-pick {
  position: relative;
  height: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}
.quick-pick-bg {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: fill;
}
.quick-pick-num {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: "Baloo 2", Inter, ui-sans-serif, system-ui, sans-serif;
  font-weight: 800;
  line-height: 1;
  color: #fff;
  font-size: clamp(13px, 4.2vw, 18px);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
  font-variant-numeric: tabular-nums;
}

.use-preview-wrap {
  position: absolute;
  left: 6%;
  width: 85%;
  top: 45%;
  aspect-ratio: 486 / 220;
}
.use-preview-hero-num {
  position: absolute;
  left: 19.5%;
  width: 8.4%;
  top: 39.1%;
  height: 31.8%;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: rotate(3deg);
  font-family: "Baloo 2", Inter, ui-sans-serif, system-ui, sans-serif;
  font-weight: 800;
  line-height: 1;
  color: #ffd739;
  font-size: 45px;
  text-shadow:
    0 0 10px rgba(255, 200, 60, 0.6),
    0 2px 4px rgba(0, 0, 0, 0.4);
  font-variant-numeric: tabular-nums;
}
.use-preview-num {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: "Baloo 2", Inter, ui-sans-serif, system-ui, sans-serif;
  font-weight: 800;
  line-height: 1;
  color: #ffd739;
  font-size: 16px;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
  font-variant-numeric: tabular-nums;
}
.use-preview-num-use {
  left: 67.2%;
  width: 11%;
  top: 18%;
  height: 14.5%;
}
.use-preview-num-play {
  left: 72.7%;
  width: 6%;
  top: 44.4%;
  height: 14.1%;
}
.use-preview-num-remain {
  left: 82%;
  width: 17%;
  top: 70.8%;
  height: 14.1%;
  justify-content: flex-end;
}

.use-ticket-actions {
  position: relative;
  z-index: 2;
  width: min(280px, 76vw);
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: -118px 0 8px;
}
.use-ticket-exchange-more-btn {
  width: 70%;
  align-self: center;
}
.use-ticket-home-btn {
  width: min(270px, 67vw);
  margin: 4px auto 0;
}
</style>
