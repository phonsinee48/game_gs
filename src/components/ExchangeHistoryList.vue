<script setup>
import { ref, watch, computed } from "vue";
import coinIcon from "../assets/coin-icon.webp";
import title from "../assets/ui/exchange-history/title.webp";
// Expanded header has an open bottom edge, meant to visually flow into the
// panel below it (see .exchange-panel-bg) — same open-bottom/closed-pill
// pairing HistoryList.vue uses for GS Game (73) vs date-header-collapsed-bg.
import headerOpenBg from "../assets/ui/exchange-history/header-open-bg.webp";
import headerClosedBg from "../assets/ui/exchange-history/header-closed-bg.webp";
import rowBg from "../assets/ui/exchange-history/row-bg.webp";
import successBadge from "../assets/ui/exchange-history/success-badge.webp";
import pendingBadge from "../assets/ui/exchange-history/pending-badge.webp";
// Reused from play-history rather than re-exported here — same accordion
// chevrons, home button, empty-state art, and 3-slice panel background
// (top cap / stretchable middle / bottom cap) the other history screen uses.
import chevronUp from "../assets/ui/play-history/GS Game (71).webp";
import chevronDown from "../assets/ui/play-history/GS Game (72).webp";
import btnHome from "../assets/ui/common/btn-home-blue.webp";
import emptyIcon from "../assets/ui/play-history/empty-icon.webp";
import emptyTitle from "../assets/ui/play-history/empty-title.webp";
import emptySubtitle from "../assets/ui/play-history/empty-subtitle.webp";
import panelCapTop from "../assets/ui/play-history/entries-panel-cap-top.webp";
import panelCapBottom from "../assets/ui/play-history/entries-panel-cap-bottom.webp";

const props = defineProps({
  // Each entry: { id, ts, label, image, cost, claimStatus }. `image` and
  // `claimStatus` come straight off get_redeem_history's reward_img /
  // claim_status (0 = not yet fulfilled, 1 = done); `cost` is the Coin
  // amount that redemption spent.
  entries: { type: Array, required: true },
  // True while App.vue's openExchangeHistory fetch is still in flight —
  // same reasoning as HistoryList.vue's own loading prop: without this the
  // empty-state art would flash "ยังไม่มีประวัติการแลก" for however long
  // that request takes before real rows replace it.
  loading: { type: Boolean, default: false },
});

defineEmits(["back"]);

const THAI_MONTHS = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];
function formatThaiDate(ts) {
  const d = new Date(ts);
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
}
function formatClock(ts) {
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())} น.`;
}

// Same grouping/default-open behavior as HistoryList.vue: entries arrive
// newest-first, grouped by calendar day, with the most recent day open by
// default the first time real data lands.
const groups = computed(() => {
  const byDate = new Map();
  for (const e of props.entries) {
    const key = formatThaiDate(e.ts);
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key).push(e);
  }
  return [...byDate.entries()].map(([date, rows]) => ({ date, rows }));
});

const expanded = ref(new Set());
let defaultOpened = false;
watch(
  groups,
  (gs) => {
    if (!defaultOpened && gs.length) {
      expanded.value = new Set([gs[0].date]);
      defaultOpened = true;
    }
  },
  { immediate: true },
);

function toggle(date) {
  const next = new Set(expanded.value);
  if (next.has(date)) next.delete(date);
  else next.add(date);
  expanded.value = next;
}
</script>

<template>
  <section class="screen scene exchange-history-screen">
    <img class="scene-title" :src="title" alt="ประวัติการแลกรางวัล" />

    <div v-if="loading" class="loading-state">
      <span class="preloader-spinner"></span>
    </div>

    <div v-else-if="!entries.length" class="empty-state">
      <img class="empty-icon" :src="emptyIcon" alt="" />
      <img class="empty-title" :src="emptyTitle" alt="ยังไม่มีประวัติการแลก" />
      <img
        class="empty-subtitle"
        :src="emptySubtitle"
        alt="เมื่อคุณแลกของรางวัล รายการจะแสดงที่นี่"
      />
    </div>

    <ul v-else class="history-groups">
      <li v-for="g in groups" :key="g.date" class="history-group">
        <button
          class="date-header"
          :class="{ 'is-collapsed': !expanded.has(g.date) }"
          :aria-expanded="expanded.has(g.date)"
          @click="toggle(g.date)"
        >
          <img
            class="date-header-bg"
            :src="expanded.has(g.date) ? headerOpenBg : headerClosedBg"
            alt=""
          />
          <span class="header-date">{{ g.date }}</span>
          <span class="header-count">({{ g.rows.length }} รายการ)</span>
          <img
            class="header-chevron"
            :src="expanded.has(g.date) ? chevronUp : chevronDown"
            alt=""
          />
        </button>

        <div v-if="expanded.has(g.date)" class="exchange-panel">
          <div class="exchange-panel-bg">
            <img class="panel-cap-top" :src="panelCapTop" alt="" />
            <div class="panel-mid"></div>
            <img class="panel-cap-bottom" :src="panelCapBottom" alt="" />
          </div>
          <ul class="exchange-rows">
            <li v-for="e in g.rows" :key="e.id" class="exchange-row">
              <img class="row-bg" :src="rowBg" alt="" />
              <span class="row-thumb">
                <img :src="e.image" :alt="e.label" />
              </span>
              <div class="row-info">
                <p class="row-name">{{ e.label }}</p>
                <p class="row-qty">จำนวน 1 ชิ้น</p>
                <div class="row-cost-status">
                  <span class="row-cost">
                    <span class="row-cost-prefix">ใช้</span>
                    <img class="coin-inline" :src="coinIcon" alt="" />
                    <span class="row-cost-num">{{
                      e.cost.toLocaleString()
                    }}</span>
                    <span class="row-cost-unit">Coin</span>
                  </span>
                  <img
                    class="row-status-badge"
                    :src="e.claimStatus === 1 ? successBadge : pendingBadge"
                    :alt="e.claimStatus === 1 ? 'แลกสำเร็จ' : 'รอจัดส่ง'"
                  />
                </div>
                <p class="row-datetime">
                  {{ formatThaiDate(e.ts) }} {{ formatClock(e.ts) }}
                </p>
              </div>
            </li>
          </ul>
        </div>
      </li>
    </ul>

    <button class="img-btn back-btn" @click="$emit('back')">
      <img :src="btnHome" alt="กลับหน้าหลัก" />
    </button>
  </section>
</template>

<style scoped>
/* Reserves room for the fixed back-btn below (both branches — list and
   empty-state), same reasoning as HistoryList.vue's own back-btn. */
.exchange-history-screen {
  align-items: stretch;
  justify-content: flex-start;
  padding-bottom: 100px;
}

.empty-state,
.loading-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 40px 0;
}
.empty-icon {
  width: min(220px, 56vw);
  height: auto;
  margin-bottom: 6px;
}
.empty-title {
  width: min(320px, 80vw);
  height: auto;
}
.empty-subtitle {
  width: min(300px, 76vw);
  height: auto;
}

.history-groups {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* An earlier export of header-closed-bg.png had sample date/count/chevron
   text baked into the art itself, which doubled visibly under every group's
   own live text — this is the corrected blank template, so it's safe to use
   as a plain stretched background again with our own overlays on top. */
/* header-open-bg.png (open bottom, flows into .exchange-panel-bg below) and
   header-closed-bg.png (fully closed pill) are near-identical aspect ratios
   (1374x233 vs 1374x236), so one shared ratio covers both without
   needing HistoryList.vue's separate is-collapsed override. */
.date-header {
  position: relative;
  width: 100%;
  aspect-ratio: 1374 / 235;
  display: block;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.date-header-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: fill;
  z-index: 0;
}
.header-date {
  position: absolute;
  z-index: 1;
  left: 6%;
  top: 50%;
  transform: translateY(-50%);
  font-size: clamp(15px, 4.5vw, 19px);
  font-weight: 800;
  color: #fff;
  white-space: nowrap;
}
.header-count {
  position: absolute;
  z-index: 1;
  left: 46%;
  top: 50%;
  transform: translateY(-50%);
  font-size: clamp(11px, 3.3vw, 14px);
  font-weight: 600;
  color: #8fc3e6;
  white-space: nowrap;
}
.header-chevron {
  position: absolute;
  z-index: 1;
  right: 6%;
  top: 50%;
  transform: translateY(-50%);
  width: 5.5%;
  height: auto;
}

/* An expanded date's rows sat directly on the app's own bright hex/glow
   backdrop with nothing behind them — every other "expanded group" screen
   in the app (see HistoryList.vue's .entries-panel) backs its rows with an
   enclosing panel instead, so the gaps between cards read as part of one
   contained list rather than gaps of loose background. Same 3-slice
   growable panel HistoryList.vue built for this (top cap flowing from
   header-open-bg.png's open bottom, a plain stretchable middle, a bottom
   cap with the closing border) rather than new art — .exchange-panel's own height
   is driven purely by .exchange-rows' content (see the .entries-panel
   comment there for exactly how the grid-stack + flex-column combination
   makes that work), so it grows to fit any number of redeemed items. */
.exchange-panel {
  position: relative;
  width: 100%;
  display: grid;
}
.exchange-panel-bg,
.exchange-rows {
  grid-area: 1 / 1;
}
.exchange-panel-bg {
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.panel-cap-top,
.panel-cap-bottom {
  width: 100%;
  height: auto;
  flex-shrink: 0;
  display: block;
}
.panel-cap-top {
  aspect-ratio: 936 / 60;
}
.panel-cap-bottom {
  aspect-ratio: 936 / 150;
}
.panel-mid {
  flex: 1;
  min-height: 0;
  background-image: url("../assets/ui/play-history/entries-panel-mid.webp");
  background-size: 100% 100%;
  background-repeat: no-repeat;
}
.exchange-rows {
  position: relative;
  z-index: 1;
  list-style: none;
  margin: 0;
  padding: 14px 4% 18px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Same "grow with content" technique as HistoryList.vue's own rows:
   aspect-ratio is a baseline a normal single-line item still matches, but
   a long reward name wrapping to 2 lines pushes the row (and its
   background, stretched via object-fit:fill) taller instead of
   overflowing the card. */
.exchange-row {
  position: relative;
  width: 100%;
  aspect-ratio: 1287 / 350;
}
.row-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: fill;
  z-index: 0;
}

/* Percentages measured against the 1287x350 source art: the thumbnail
   frame sits at x 3-28%, y 8-82%. */
.row-thumb {
  position: absolute;
  z-index: 1;
  left: 3%;
  width: 25%;
  top: 8%;
  height: 74%;
  display: grid;
  place-items: center;
  overflow: hidden;
}
.row-thumb img {
  width: 86%;
  height: 86%;
  object-fit: contain;
}

.row-info {
  position: relative;
  z-index: 1;
  margin-left: 31%;
  width: 65%;
  padding: 10px 3% 10px 0;
  box-sizing: border-box;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  /* .scene (the screen-level wrapper) sets text-align:center — harmless for
     screens that are mostly single centered lines, but it centers each of
     these lines independently within the column instead of keeping them
     flush with .row-cost-status's flex-pinned-left "ใช้" text, reading as
     misaligned. Same fix as HistoryList.vue's .entry-value. */
  text-align: left;
}
.row-name {
  margin: 0;
  color: #fff;
  font-weight: 800;
  font-size: clamp(13px, 3.8vw, 16px);
  line-height: 1.25;
}
.row-qty {
  margin: 0;
  color: #8fc3e6;
  font-weight: 600;
  font-size: clamp(11px, 3.2vw, 13px);
}
.row-cost-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 2px;
}
.row-cost {
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 800;
  font-size: clamp(11px, 3.2vw, 13px);
}
.row-cost-prefix {
  color: #fff;
}
.coin-inline {
  width: 16px;
  height: 16px;
  object-fit: contain;
  flex-shrink: 0;
}
.row-cost-num {
  font-family: "Baloo 2", Inter, ui-sans-serif, system-ui, sans-serif;
  color: #ffd739;
  font-size: 1.3em;
}
.row-cost-unit {
  color: #ffd739;
}
.row-status-badge {
  height: 30px;
  width: auto;
  margin-top: -30px;
  flex-shrink: 0;
}
.row-datetime {
  margin: 2px 0 0;
  color: #7a9cc2;
  font-size: clamp(10px, 2.8vw, 11.5px);
}

/* Fixed rather than a normal-flow button — with a long redemption history
   the screen grows taller than the viewport and the page itself scrolls,
   so a flow-positioned button would end up below the fold. Pinning it to
   the viewport bottom keeps it reachable without scrolling all the way
   down, however long the list gets (same reasoning as HistoryList.vue's
   own back-btn). */
.back-btn {
  position: fixed;
  left: 50%;
  bottom: 14px;
  transform: translateX(-50%);
  width: min(300px, 80vw);
  z-index: 5;
}
.scene-title {
  width: min(380px, 88vw);
  height: auto;
  filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.45));
}
</style>
