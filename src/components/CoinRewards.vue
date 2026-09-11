<script setup>
import { computed, ref } from "vue";
import coinIcon from "../assets/coin-icon.png";
import title from "../assets/ui/reward-exchange/title.png";
import coinBalanceBanner from "../assets/ui/reward-exchange/coin.png";
import rowActive from "../assets/ui/reward-exchange/row-active.png";
import rowDisabled from "../assets/ui/reward-exchange/row-disabled.png";
import btnHome from "../assets/ui/common/btn-home-blue.png";
import confirmFrame from "../assets/ui/reward-redeemed/frame.png";
import confirmTitle from "../assets/ui/reward-redeemed/title.png";
import confirmItemPanel from "../assets/ui/reward-redeemed/item-panel.png";
import confirmNote from "../assets/ui/reward-redeemed/note.png";
import confirmBtnCancel from "../assets/ui/reward-redeemed/btn-cancel.png";
import confirmBtnConfirm from "../assets/ui/reward-redeemed/btn-confirm.png";

const props = defineProps({
  coins: { type: Number, required: true },
  catalog: { type: Array, required: true },
});

const emit = defineEmits(["back", "redeem"]);

const confirmItem = ref(null);
const remainAfter = computed(
  () => props.coins - (confirmItem.value?.cost ?? 0),
);

function isDisabled(item) {
  return props.coins < item.cost || item.qty <= 0;
}

function openConfirm(item) {
  if (isDisabled(item)) return;
  confirmItem.value = item;
}

function cancelConfirm() {
  confirmItem.value = null;
}

function confirmRedeem() {
  emit("redeem", confirmItem.value);
  confirmItem.value = null;
}
</script>

<template>
  <section class="screen scene rewards-screen">
    <img class="scene-title" :src="title" alt="แลกรางวัล" />

    <div class="coin-balance">
      <img class="coin-balance-bg" :src="coinBalanceBanner" alt="Coin ของคุณ" />
      <span class="coin-balance-num">{{ coins.toLocaleString() }}</span>
    </div>

    <ul class="reward-list">
      <li v-for="item in catalog" :key="item.id">
        <button
          class="reward-row"
          :class="{ disabled: isDisabled(item) }"
          :disabled="isDisabled(item)"
          @click="openConfirm(item)"
        >
          <img
            class="row-bg"
            :src="isDisabled(item) ? rowDisabled : rowActive"
            alt=""
          />
          <span class="row-thumb"
            ><img :src="item.image" :alt="item.label"
          /></span>
          <span class="row-text">
            <span class="row-label">{{ item.label }}</span>
            <span class="row-cost">
              <img class="coin-inline" :src="coinIcon" alt="" />
              <span class="row-cost-num">{{ item.cost.toLocaleString() }}</span>
              <span class="row-cost-label">Coin</span>
            </span>
          </span>
        </button>
      </li>
    </ul>

    <button class="img-btn back-btn" @click="emit('back')">
      <img :src="btnHome" alt="กลับหน้าหลัก" />
    </button>

    <div v-if="confirmItem" class="modal-backdrop" @click.self="cancelConfirm">
      <div class="confirm-card">
        <img class="confirm-frame-bg" :src="confirmFrame" alt="" />
        <img
          class="confirm-title"
          :src="confirmTitle"
          alt="ยืนยันการแลกของรางวัล"
        />

        <div class="confirm-item-wrap">
          <img class="confirm-item-bg" :src="confirmItemPanel" alt="" />
          <span class="confirm-item-thumb"
            ><img :src="confirmItem.image" :alt="confirmItem.label"
          /></span>
          <span class="confirm-item-label">{{ confirmItem.label }}</span>
          <span class="confirm-item-cost-icon">
            <img class="coin-inline" :src="coinIcon" alt="" />
          </span>
          <span class="confirm-item-cost-num">{{
            confirmItem.cost.toLocaleString()
          }}</span>
          <span class="confirm-item-cost-unit">Coin</span>
          <span class="confirm-item-remain-num">{{
            remainAfter.toLocaleString()
          }}</span>
        </div>

        <img
          class="confirm-note"
          :src="confirmNote"
          alt="กรุณาตรวจสอบก่อนยืนยันการแลก"
        />

        <div class="confirm-actions">
          <button class="img-btn" @click="cancelConfirm">
            <img :src="confirmBtnCancel" alt="ยกเลิก" />
          </button>
          <button class="img-btn" @click="confirmRedeem">
            <img :src="confirmBtnConfirm" alt="ยืนยันแลก" />
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.rewards-screen {
  align-items: stretch;
  justify-content: flex-start;
}
.coin-inline {
  width: 15px;
  height: 15px;
  object-fit: contain;
}

.coin-balance {
  position: relative;
  width: min(320px, 86vw);
  margin: 4px auto 16px;
}
.coin-balance-bg {
  width: 100%;
  height: auto;
  display: block;
}
.coin-balance-num {
  position: absolute;
  left: 56.7%;
  width: 41%;
  top: 0;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  font-family: "Baloo 2", Inter, ui-sans-serif, system-ui, sans-serif;
  font-weight: 900;
  color: #ffd739;
  font-size: clamp(16px, 5.5vw, 26px);
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
  font-variant-numeric: tabular-nums;
}

.reward-list {
  list-style: none;
  margin: 0 0 18px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.reward-row {
  position: relative;
  width: 100%;
  aspect-ratio: 1285 / 375;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  display: block;
  -webkit-tap-highlight-color: transparent;
}
.reward-row:active:not(.disabled) {
  transform: scale(0.98);
}
.reward-row.disabled {
  cursor: not-allowed;
}
.row-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: fill;
  display: block;
}
.row-thumb {
  position: absolute;
  left: 3%;
  top: 5%;
  width: 23%;
  height: 90%;
  display: grid;
  place-items: center;
}
.row-thumb img {
  width: 82%;
  height: 82%;
  object-fit: contain;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.35));
}
.row-text {
  position: absolute;
  left: 30%;
  top: 50%;
  width: 40%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  text-align: left;
}
.row-label {
  font-size: clamp(13px, 4vw, 16px);
  font-weight: 800;
  color: #fff;
  line-height: 1.2;
}
.row-cost {
  font-size: clamp(13px, 4vw, 16px);
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 5px;
}
.row-cost .coin-inline {
  width: 30px;
  height: 30px;
}
.row-cost-num {
  font-family: "Baloo 2", Inter, ui-sans-serif, system-ui, sans-serif;
  color: #fff;
  font-size: 24px;
}
.row-cost-label {
  color: #ffb84d;
  font-style: italic;
  font-weight: 900;
  font-size: clamp(13px, 4vw, 16px);
}

.back-btn {
  width: min(300px, 80vw);
  margin-top: auto;
  align-self: center;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
  background: rgba(2, 8, 20, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.confirm-card {
  position: relative;
  width: min(360px, 92vw);
}
.confirm-frame-bg {
  width: 100%;
  height: auto;
  display: block;
}

/* Percentages measured against the 562x586 outer frame (frame.png). */
.confirm-title {
  position: absolute;
  left: 4%;
  width: 92%;
  top: 3%;
  height: auto;
}

/* Percentages measured against the 678x305 item panel (item-panel.png).
   The baked placeholder name ("HomePod mini") was erased so the real
   reward's name can be overlaid; the cost/remaining numbers were never
   baked in the first place. */
.confirm-item-wrap {
  position: absolute;
  left: 7%;
  width: 86%;
  top: 26%;
  aspect-ratio: 678 / 305;
}
.confirm-item-bg {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.confirm-item-thumb {
  position: absolute;
  left: 2.5%;
  width: 35.8%;
  top: 6.6%;
  height: 85.6%;
  display: grid;
  place-items: center;
}
.confirm-item-thumb img {
  width: 78%;
  height: 78%;
  object-fit: contain;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.35));
}
.confirm-item-label {
  position: absolute;
  left: 41.6%;
  width: 55%;
  top: 16.4%;
  height: 13.8%;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  color: #fff;
  font-weight: 800;
  font-size: clamp(14px, 4.4vw, 18px);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.confirm-item-cost-icon {
  position: absolute;
  left: 42%;
  width: 7%;
  top: 39.7%;
  height: 15.8%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.confirm-item-cost-icon .coin-inline {
  width: 30px;
  height: 30px;
}
.confirm-item-cost-num {
  position: absolute;
  left: 63%;
  width: 24%;
  top: 39.9%;
  height: 14.8%;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  color: #ffd739;
  font-family: "Baloo 2", Inter, ui-sans-serif, system-ui, sans-serif;
  font-weight: 900;
  font-size: clamp(18px, 5.4vw, 24px);
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
  font-variant-numeric: tabular-nums;
}
.confirm-item-cost-unit {
  position: absolute;
  left: 80%;
  width: 18%;
  top: 40.7%;
  height: 14.8%;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  color: #ffd739;
  font-weight: 700;
  font-size: clamp(12px, 3.6vw, 15px);
}
.confirm-item-remain-num {
  position: absolute;
  left: 71.8%;
  width: 25%;
  top: 67.1%;
  height: 15.4%;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  color: #ffd739;
  font-family: "Baloo 2", Inter, ui-sans-serif, system-ui, sans-serif;
  font-weight: 900;
  font-size: clamp(18px, 5.4vw, 24px);
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
  font-variant-numeric: tabular-nums;
}

.confirm-note {
  position: absolute;
  left: 14%;
  width: 70%;
  top: 65%;
  height: auto;
}

.confirm-actions {
  position: absolute;
  left: 7%;
  width: 86%;
  top: 78%;
  display: flex;
  gap: 10px;
}
.confirm-actions .img-btn {
  flex: 1;
  min-width: 0;
}
</style>
