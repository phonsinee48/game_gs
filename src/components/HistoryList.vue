<script setup>
import { ref, watch, computed } from "vue";
import coinIcon from "../assets/coin-icon.png";
import title from "../assets/ui/play-history/title.png";
import btnHome from "../assets/ui/common/btn-home-blue.png";
import emptyIcon from "../assets/ui/play-history/empty-icon.png";
import emptySubtitle from "../assets/ui/play-history/empty-subtitle.png";
import emptyTitle from "../assets/ui/play-history/empty-title.png";
import rowBg from "../assets/ui/play-history/GS Game (70).png";
import clockIcon from "../assets/ui/play-history/history-clock-icon.png";
import chevronUp from "../assets/ui/play-history/GS Game (71).png";
import chevronDown from "../assets/ui/play-history/GS Game (72).png";
// Sliced from entries-panel-full.png into a top cap (has the first diamond
// stud), a plain stretchable middle band, and a bottom cap (second stud +
// the notched border corners) — see the .entries-panel-bg comment below for
// why. The middle band is referenced directly from CSS (see .entries-mid)
// rather than imported here, since it's a plain background-image, not an
// <img>.
import entriesCapTop from "../assets/ui/play-history/entries-panel-cap-top.png";
import entriesCapBottom from "../assets/ui/play-history/entries-panel-cap-bottom.png";

const props = defineProps({
  entries: { type: Array, required: true },
});

defineEmits(["back"]);

function formatDate(ts) {
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}
function formatClock(ts) {
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// `entries` already arrives newest-first (the history log is built with
// unshift), so grouping by date preserves that order both across groups
// and for the rows inside each one.
const groups = computed(() => {
  const byDate = new Map();
  for (const e of props.entries) {
    const key = formatDate(e.ts);
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key).push(e);
  }
  return [...byDate.entries()].map(([date, rows]) => ({ date, rows }));
});

const expanded = ref(new Set());
// entries loads async after mount (see openHistory in App.vue), so the
// default can't just be "expand groups[0] at setup time" — that runs
// before the real data (and its groups) exist. Open the most recent date
// the first time groups becomes non-empty, and leave it alone after that
// so it doesn't fight with the player's own taps.
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
  <section class="screen scene history-screen">
    <img class="scene-title" :src="title" alt="ประวัติการเล่น GS CLAW EGG" />

    <div v-if="!entries.length" class="empty-state">
      <img class="empty-icon" :src="emptyIcon" alt="" />
      <img class="empty-title" :src="emptyTitle" alt="ยังไม่มีประวัติการเล่น" />
      <img
        class="empty-subtitle"
        :src="emptySubtitle"
        alt="เมื่อคุณเริ่มเล่น รายการจะแสดงที่นี่"
      />
    </div>

    <ul v-else class="history-groups">
      <li v-for="g in groups" :key="g.date" class="history-group">
        <button
          class="history-date-header"
          :class="{ 'is-collapsed': !expanded.has(g.date) }"
          :aria-expanded="expanded.has(g.date)"
          @click="toggle(g.date)"
        >
          <span class="header-date">{{ g.date }}</span>
          <span class="header-count">({{ g.rows.length }} รายการ)</span>
          <img
            class="header-chevron"
            :src="expanded.has(g.date) ? chevronUp : chevronDown"
            alt=""
          />
        </button>

        <div v-if="expanded.has(g.date)" class="entries-panel">
          <div class="entries-panel-bg">
            <img class="entries-cap-top" :src="entriesCapTop" alt="" />
            <div class="entries-mid"></div>
            <img class="entries-cap-bottom" :src="entriesCapBottom" alt="" />
          </div>
          <ul class="history-entries">
            <li v-for="e in g.rows" :key="e.id" class="history-entry-row">
              <img class="entry-row-bg" :src="rowBg" alt="" />
              <!-- row.png bakes its divider at a fixed x (~49.85%), too far
                 from the time to move via CSS — cover it and draw a new
                 one closer to the time instead. -->
              <span class="entry-divider-cover"></span>
              <span class="entry-divider"></span>
              <img class="entry-clock-icon" :src="clockIcon" alt="" />
              <span class="entry-time">{{ formatClock(e.ts) }}</span>
              <span class="entry-value" :class="{ coin: e.coinValue }">
                <template v-if="e.coinValue">
                  <img class="coin-inline" :src="coinIcon" alt="" />
                  <span
                    ><span
                      v-if="e.claimStatus === 0"
                      class="claim-dot"
                      title="รอดำเนินการ"
                    ></span
                    ><span class="value-prefix" v-if="e.kind !== 'redeem'"
                      >ได้ </span
                    ><template v-else>-</template
                    ><span class="value-num">{{
                      e.coinValue.toLocaleString()
                    }}</span>
                    Coin</span
                  >
                </template>
                <template v-else>
                  <img class="coin-inline" :src="e.image || coinIcon" alt="" />
                  <span
                    ><span
                      v-if="e.claimStatus === 0"
                      class="claim-dot"
                      title="รอดำเนินการ"
                    ></span
                    >{{ e.label }}</span
                  >
                </template>
              </span>
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
   empty-state) so scrolled content never ends up hidden underneath it. */
.history-screen {
  align-items: stretch;
  justify-content: flex-start;
  padding-bottom: 100px;
}

.empty-state {
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

.history-group {
  border-radius: 0 0 16px 16px;
}
/* GS Game (73).png is now a pre-cropped, header-only slice (936x142) of the
   same notched card GS Game (76).png shows in full, so it can be sized at
   its own natural ratio with no cropping tricks. */
.history-date-header {
  width: 100%;
  aspect-ratio: 936 / 142;
  position: relative;
  display: block;
  padding: 0;
  border: 0;
  /* Buttons get a default native background-color (often light gray/white)
     that isn't cleared just by setting background-image — every other
     button in this app resets it via the shared .img-btn class, but this
     one has its own layout so it needs the same reset explicitly. Without
     it, that native background shows through the header art's transparent
     corners (most visibly the notched top-right one, right behind the
     chevron). */
  background-color: transparent;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  background-image: url("../assets/ui/play-history/GS Game (73).png");
  background-size: 100% 100%;
  background-repeat: no-repeat;
}
/* GS Game (73) is only the top slice of the full card — its bottom edge is
   deliberately left open so it visually merges into .history-entries right
   below it once expanded. Collapsed, there's no entries panel underneath to
   complete that border, so it needs the fully closed pill art instead
   (date-header-collapsed-bg.png, a different natural ratio) or the header
   reads as cut off. */
.history-date-header.is-collapsed {
  aspect-ratio: 1202 / 198;
  background-image: url("../assets/ui/play-history/date-header-collapsed-bg.png");
}
.header-date {
  position: absolute;
  left: 18.5%;
  top: 2%;
  width: 34%;
  height: 100%;
  display: flex;
  align-items: center;
  font-size: clamp(14px, 4.3vw, 18px);
  font-weight: 800;
  color: #fff;
  white-space: nowrap;
}
.header-count {
  position: absolute;
  left: 52%;
  top: 2%;
  width: 28%;
  height: 100%;
  display: flex;
  align-items: center;
  font-size: clamp(11px, 3.2vw, 13.5px);
  font-weight: 600;
  color: #8fc3e6;
  white-space: nowrap;
}
.header-chevron {
  position: absolute;
  right: 7%;
  top: 2%;
  width: 5%;
  height: 100%;
  object-fit: contain;
}

/* entries-panel-full.png has its own diamond studs baked at fixed points
   along the side borders (one near the top, one near the bottom, alongside
   the notched bottom corners) — stretching the whole image to fit however
   many rows a date has would warp those studs, same problem noted for GS
   Game (76) below. Sliced into three pieces instead (see the imports above): a
   top cap and a bottom cap that each keep their own stud crisp at their own
   natural ratio, and a plain, stud-free middle band that's the only part
   allowed to stretch — so the panel can grow to fit any number of rows with
   nothing in the art ever distorting.
   The two children share a grid cell (a common CSS overlay-stack trick) so
   .entries-panel's height is driven purely by .history-entries' own content
   size; .entries-panel-bg then stretches (grid's default align/justify:
   stretch) to match that same height, and *its* flex column is what turns
   "match this height" into "keep both caps their own size, let the middle
   band absorb whatever's left." */
.entries-panel {
  position: relative;
  width: 100%;
  display: grid;
}
.entries-panel-bg,
.history-entries {
  grid-area: 1 / 1;
}
.entries-panel-bg {
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.entries-cap-top,
.entries-cap-bottom {
  width: 100%;
  height: auto;
  flex-shrink: 0;
  display: block;
}
.entries-cap-top {
  aspect-ratio: 936 / 60;
}
.entries-cap-bottom {
  aspect-ratio: 936 / 150;
}
.entries-mid {
  flex: 1;
  min-height: 0;
  background-image: url("../assets/ui/play-history/entries-panel-mid.png");
  background-size: 100% 100%;
  background-repeat: no-repeat;
}
/* Grows with content up to max-height (~6-7 rows) so a light day doesn't
   sit inside an oversized panel and a heavy one (a real account can rack up
   dozens of coin rows in a single day) doesn't turn the whole screen into
   one giant scroll — past the cap it scrolls internally instead. Since
   .entries-panel-bg matches whatever height this ends up at (capped or
   not, see .entries-panel above), the art never has to know which case
   it's in. */
.history-entries {
  position: relative;
  z-index: 1;
  list-style: none;
  margin: 0;
  padding: 14px 5% 18px;
  box-sizing: border-box;
  max-height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
/* aspect-ratio here is a *baseline*, not a fixed size: with height left
   auto, a block box still grows to fit content taller than that ratio
   implies (a 2-line wrapped prize name, say) — it only supplies the height
   for the common single-line case, where content alone would be shorter.
   .entry-row-bg is what actually used to fix this row's height before (a
   normal-flow img sized off its own aspect ratio); moving it to an
   absolutely-positioned, object-fit:fill background is what frees the row
   to grow — same technique as .entries-panel-bg above. */
.history-entry-row {
  position: relative;
  width: 100%;
  aspect-ratio: 1489 / 190;
}
.entry-row-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: fill;
  display: block;
  z-index: 0;
}

/* Covers row.png's own baked divider (a soft glowing line centred at
   x≈49.85%) so .entry-divider below can redraw it closer to the time
   instead — moving the baked line itself isn't possible, only where our
   own copy of it sits. A flat fill patch here left a visible seam because
   the row art isn't a flat colour top-to-bottom: it has its own bright
   border-glow band near the top and bottom edges (y≈3-10% and y≈90-97%,
   sampled off to the side of the divider at x=47%) with a darker flat
   band in between. This gradient reproduces that same vertical profile so
   the patch blends in instead of reading as a dark cutout. */

/* top:50%/translateY(-50%) rather than a fixed top/height %, so both stay
   correctly centered whatever height a row actually ends up at — height%
   alone assumed the old fixed single-line row height. */
.entry-divider {
  position: absolute;
  z-index: 1;
  left: 31%;
  width: 1.5px;
  top: 50%;
  height: 56%;
  transform: translateY(-50%);
  background: #bdeeff;
  box-shadow: 0 0 6px 1px rgba(120, 220, 255, 0.9);
}

/* GS Game (70)'s own baked clock icon sits at roughly this same spot
   (x 0.6-10.7%, y 19.4-89.4% of the 1338x180 source art) — this <img>
   layers the nicer icon directly on top of it rather than patching the
   baked one out first, since both are plain light clock outlines at
   basically the same size and position (same trick already used for the
   coin icon overlaying rowBg's own art elsewhere in the app). Centered via
   top:50%/translateY like .entry-time, so it still lines up once a row
   grows past its single-line baseline height. */
.entry-clock-icon {
  position: absolute;
  z-index: 1;
  left: 3.5%;
  width: 8%;
  top: 50%;
  transform: translateY(-50%);
  height: auto;
  display: block;
}
.entry-time {
  position: absolute;
  z-index: 1;
  left: 13%;
  width: 16%;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  font-size: clamp(13px, 3.8vw, 16px);
  font-weight: 700;
  color: #eaf6ff;
  white-space: nowrap;
}
/* Normal flow (not absolutely positioned like its siblings above) is what
   lets a wrapped 2-line label actually grow .history-entry-row — an
   absolutely positioned box with height:100% only ever matches whatever
   height the row already has, it can never push that height out further to
   fit taller content. The vertical padding here is tuned so a single-line
   row's total height (padding + one line) lands close to the aspect-ratio
   baseline above, so short rows still render at effectively the same
   height as before; a second wrapped line pushes past that baseline and
   the row (and its background, via object-fit:fill) grows to match. */
.entry-value {
  position: relative;
  z-index: 1;
  margin-left: 35%;
  width: 61%;
  padding: 11px 0;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 6px;
  font-size: clamp(11px, 3.2vw, 13.5px);
  font-weight: 800;
  color: #7fd0ff;
  /* .scene (the screen-level wrapper) sets text-align:center for its
     mostly-single-line screens — that inherits down here and is invisible
     for a one-line label (the box already hugs the text), but a wrapped
     2-line prize name centers its shorter second line instead of keeping
     it flush with the first, exactly the "บาท floating in the middle"
     look. Override back to left for this multi-line case. */
  text-align: left;
}
.entry-value.coin {
  color: #ffd739;
}
.value-prefix {
  color: #fff;
}
.value-num {
  font-family: "Baloo 2", Inter, ui-sans-serif, system-ui, sans-serif;
  font-size: 1.4em;
}
.coin-inline {
  width: 20%;
  height: 20%;
  object-fit: contain;
  flex-shrink: 0;
}

/* Physical prizes only (claim_status:0 from get_play_history /
   get_redeem_history) — Coin rows are credited instantly and always come
   back already claimed, so this dot never applies to them. */
.claim-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  margin-right: 5px;
  border-radius: 50%;
  background: #ffb020;
  box-shadow: 0 0 5px 1px rgba(255, 176, 32, 0.8);
  vertical-align: middle;
}

/* Fixed rather than a normal-flow "margin-top:auto" button — with a long
   history list the screen grows taller than the viewport and the page
   itself scrolls, so a flow-positioned button would end up below the
   fold. Pinning it to the viewport bottom keeps it reachable without
   scrolling all the way down, however long the list gets. */
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
