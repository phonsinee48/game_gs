<script setup>
import { computed, ref } from "vue";
import btnHome from "../assets/ui/common/btn-home-blue.png";
import titleBanner from "../assets/ui/point-exchange/title.png";
import panelBg from "../assets/ui/point-exchange/panel.png";
import btnMinus from "../assets/ui/point-exchange/btn-minus.png";
import btnPlus from "../assets/ui/point-exchange/btn-plus.png";
import chipTicket from "../assets/ui/point-exchange/chip-ticket.png";
import btnConfirm from "../assets/ui/point-exchange/btn-confirm.png";
import summaryCard from "../assets/ui/point-exchange/summary-card.png";
import btnCancel from "../assets/ui/point-exchange/btn-cancel.png";
import btnConfirmSummary from "../assets/ui/point-exchange/btn-confirm-summary.png";

const RATE = 10;
const MAX_AMOUNT = 100;

const props = defineProps({
  points: { type: Number, required: true },
});

const emit = defineEmits(["back", "confirm"]);

const maxAffordable = computed(() =>
  Math.min(MAX_AMOUNT, Math.floor(props.points / RATE) * RATE),
);
const amount = ref(Math.min(RATE, Math.max(0, maxAffordable.value)));

function ticketsFor(amt) {
  const base = Math.floor(amt / RATE);
  const bonus = amt >= MAX_AMOUNT ? 1 : 0;
  return { base, bonus, total: base + bonus };
}

const preview = computed(() => ticketsFor(amount.value));
const canConfirm = computed(
  () => amount.value >= RATE && amount.value <= props.points,
);
const pointsAfter = computed(() => props.points - amount.value);

const showSummary = ref(false);

function step(delta) {
  const next = amount.value + delta;
  amount.value = Math.max(RATE, Math.min(maxAffordable.value, next));
}

function pick(v) {
  amount.value = Math.min(v, maxAffordable.value);
}

function openSummary() {
  if (!canConfirm.value) return;
  showSummary.value = true;
}

function confirm() {
  showSummary.value = false;
  emit("confirm", amount.value);
}
</script>

<template>
  <section class="screen scene point-exchange-screen">
    <img
      class="point-title"
      :src="titleBanner"
      alt="แลก Point เป็นสิทธิ์เล่น อัตราแลก 10 Point = 1 สิทธิ์ แลกสูงสุดครั้งละ 100 Point (10 สิทธิ์)"
    />

    <div class="point-panel">
      <img class="point-panel-bg" :src="panelBg" alt="" />
      <span class="panel-balance-num">{{ points.toLocaleString() }}</span>

      <button
        class="img-btn stepper-btn-img stepper-minus"
        :disabled="amount <= RATE"
        @click="step(-RATE)"
      >
        <img :src="btnMinus" alt="ลด" />
      </button>
      <span class="panel-big-num">{{ amount }}</span>
      <button
        class="img-btn stepper-btn-img stepper-plus"
        :disabled="amount >= maxAffordable"
        @click="step(RATE)"
      >
        <img :src="btnPlus" alt="เพิ่ม" />
      </button>
      <span class="panel-point-label">Point</span>

      <div class="quick-picks">
        <button
          v-for="v in [10, 50, 100]"
          :key="v"
          class="quick-pick"
          :class="{ active: amount === v }"
          :disabled="v > maxAffordable"
          @click="pick(v)"
        >
          {{ v }}
        </button>
      </div>

      <div class="ticket-chip">
        <img class="ticket-chip-bg" :src="chipTicket" alt="" />
        <span class="ticket-chip-num">{{ preview.total }}</span>
      </div>

      <p v-if="preview.bonus" class="bonus-note">
        (รวมโบนัส +{{ preview.bonus }})
      </p>

      <button
        class="img-btn confirm-btn"
        :disabled="!canConfirm"
        @click="openSummary"
      >
        <img :src="btnConfirm" alt="ยืนยันแลก" />
      </button>
    </div>
    <p v-if="points < RATE" class="rule-note warn">
      Point ไม่พอสำหรับแลกสิทธิ์
    </p>

    <button class="img-btn back-btn" @click="emit('back')">
      <img :src="btnHome" alt="กลับหน้าหลัก" />
    </button>

    <div
      v-if="showSummary"
      class="modal-backdrop"
      @click.self="showSummary = false"
    >
      <div class="summary-card">
        <div class="summary-art">
          <img class="summary-bg" :src="summaryCard" alt="สรุปการแลกสิทธิ์" />
          <span class="summary-use">{{ amount }} <small>Point</small></span>
          <span class="summary-get"
            >{{ preview.total }} <small>สิทธิ์เล่น</small></span
          >
          <span class="summary-remain"
            >{{ pointsAfter.toLocaleString() }} <small>Point</small></span
          >

          <div class="summary-actions">
            <button class="img-btn" @click="showSummary = false">
              <img :src="btnCancel" alt="ยกเลิก" />
            </button>
            <button class="img-btn" @click="confirm">
              <img :src="btnConfirmSummary" alt="ยืนยันแลก" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.point-exchange-screen {
  justify-content: flex-start;
}
.point-title {
  width: min(400px, 90vw);
  height: auto;
  margin: 2px 0 16px;
}

.rule-note {
  margin: 8px 0 0;
  color: #8fbede;
  font-size: 11.5px;
  text-align: center;
}
.rule-note.warn {
  color: #ff9aa4;
}

/* The panel art (panel.png) is stretched taller than its natural ratio so
   the quick-picks/ticket-chip/confirm button can sit inside its border too.
   object-fit:fill stretches every row by the same vertical factor, so a
   percentage-of-height position within the original art (e.g. the baked
   "Point คงเหลือ" label) still lands at that same percentage after the
   stretch. The container's aspect-ratio height (760) is set so 100% lands
   right where the border art + confirm button actually end — all child
   percentages below are scaled by the same 1.25x factor from an earlier
   950-tall version so the visual layout is pixel-identical, just with the
   leftover empty space beneath the border cropped off. Keep every child's
   percentage in that same ratio to each other if you resize this again. */
.point-panel {
  position: relative;
  width: min(400px, 94vw);
  aspect-ratio: 569 / 760;
}
.point-panel-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 97.5%;
  object-fit: fill;
}
.panel-balance-num {
  position: absolute;
  left: 60%;
  width: 32%;
  top: 10.6%;
  height: 11.25%;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  font-weight: 900;
  color: #ffd739;
  font-size: 25px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
  font-variant-numeric: tabular-nums;
}
.panel-big-num {
  position: absolute;
  left: 0;
  width: 100%;
  top: 18.75%;
  height: 17.5%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  color: #fff;
  font-size: clamp(36px, 11vw, 52px);
  text-shadow:
    0 0 14px rgba(60, 190, 255, 0.6),
    0 3px 4px rgba(0, 0, 0, 0.4);
  font-variant-numeric: tabular-nums;
  pointer-events: none;
}
.panel-point-label {
  position: absolute;
  left: 0;
  width: 100%;
  top: 35%;
  height: 7.5%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9fd8ff;
  font-size: 25px;
  font-weight: 600;
  pointer-events: none;
}
.stepper-btn-img {
  position: absolute;
  top: 22.5%;
  width: 20%;
}
.stepper-minus {
  left: 15%;
}
.stepper-plus {
  right: 15%;
}

.quick-picks {
  position: absolute;
  left: 15%;
  width: 70%;
  top: 45%;
  display: flex;
  justify-content: space-between;
  gap: 8px;
}
.quick-pick {
  flex: 1;
  min-width: 0;
  padding: 10px 4px;
  border-radius: 999px;
  border: 1px solid rgba(101, 197, 255, 0.5);
  background: linear-gradient(
    180deg,
    rgba(20, 60, 110, 0.5),
    rgba(6, 20, 42, 0.7)
  );
  color: #cfeaff;
  cursor: pointer;
  font-weight: 800;
  font-size: 16px;
}
.quick-pick.active {
  background: linear-gradient(180deg, #2bb9ff, #0872db);
  border-color: #9fe8ff;
  color: #fff;
  box-shadow:
    0 0 18px rgba(60, 190, 255, 0.65),
    inset 0 0 12px rgba(255, 255, 255, 0.25);
}

.ticket-chip {
  position: absolute;
  left: 27%;
  width: 45%;
  top: 56.25%;
}
.ticket-chip-bg {
  width: 100%;
  height: auto;
  display: block;
}
.ticket-chip-num {
  position: absolute;
  left: 57%;
  width: 14%;
  top: 0;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  color: #fff;
  font-size: clamp(16px, 5vw, 22px);
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
}

.img-btn img {
  width: 90%;
  height: auto;
  display: block;
  margin: 0 auto;
  filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.35));
  transition:
    transform 0.14s ease,
    filter 0.14s ease;
}

.bonus-note {
  position: absolute;
  left: 0;
  width: 100%;
  top: 67.5%;
  margin: 0;
  text-align: center;
  color: #8fbede;
  font-size: 11.5px;
  pointer-events: none;
}
.confirm-btn {
  position: absolute;
  left: 11%;
  width: 78%;
  top: 70.75%;
  margin: 0;
}
.back-btn {
  width: min(300px, 80vw);
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
  background: rgba(2, 8, 20, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.summary-card {
  width: min(420px, 92vw);
  display: flex;
  flex-direction: column;
  align-items: center;
}
.summary-art {
  position: relative;
  width: 100%;
}
.summary-bg {
  width: 100%;
  height: auto;
  display: block;
}
/* Percentages measured against the 1040x669 source art (summary-card.png).
   The baked "Point" / "สิทธิ์เล่น" suffix words were erased too (not just
   the numbers) so these boxes can span the whole rest of the row — that
   way a 1-digit or a 3-digit value never crowds into fixed-position baked
   text, regardless of how wide the number ends up being. */
.summary-use {
  position: absolute;
  left: 48%;
  width: 46%;
  top: 23.9%;
  height: 9%;
  display: flex;
  align-items: center;
  color: #ffd739;
  font-weight: 900;
  font-size: clamp(13px, 3.6vw, 18px);
}
.summary-get {
  position: absolute;
  left: 52.5%;
  width: 42%;
  top: 34.4%;
  height: 9%;
  display: flex;
  align-items: center;
  color: #ffd739;
  font-weight: 900;
  font-size: clamp(13px, 3.6vw, 18px);
}
.summary-remain {
  position: absolute;
  left: 56%;
  width: 38%;
  top: 44.8%;
  height: 9%;
  display: flex;
  align-items: center;
  color: #ffd739;
  font-weight: 900;
  font-size: clamp(13px, 3.6vw, 18px);
  font-variant-numeric: tabular-nums;
}
.summary-use small,
.summary-get small,
.summary-remain small {
  color: #eaf6ff;
  font-weight: 600;
  margin-left: 5px;
  font-size: 0.75em;
}
/* The card art has a large empty panel below the 3 text rows (before its
   own bottom border) — the Cancel/Confirm buttons sit inside that space
   rather than below the card, positioned absolute like the text overlays. */
.summary-actions {
  position: absolute;
  left: 6%;
  width: 88%;
  top: 63%;
  display: flex;
  gap: 14px;
}
.summary-actions .img-btn {
  flex: 1;
  min-width: 0;
}
</style>
