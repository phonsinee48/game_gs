<script setup>
import { ref, watch, computed } from 'vue'
import coinIcon from '../assets/coin-icon.png'
import title from '../assets/ui/play-history/title.png'
import btnHome from '../assets/ui/play-history/btn-home-gold.png'
import emptyIcon from '../assets/ui/play-history/empty-icon.png'
import emptySubtitle from '../assets/ui/play-history/empty-subtitle.png'
import emptyTitle from '../assets/ui/play-history/empty-title.png'
import rowBg from '../assets/ui/play-history/GS Game (70).png'
import chevronUp from '../assets/ui/play-history/GS Game (71).png'
import chevronDown from '../assets/ui/play-history/GS Game (72).png'

const props = defineProps({
  entries: { type: Array, required: true },
})

defineEmits(['back'])

function formatDate(ts) {
  const d = new Date(ts)
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}
function formatClock(ts) {
  const d = new Date(ts)
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// `entries` already arrives newest-first (the history log is built with
// unshift), so grouping by date preserves that order both across groups
// and for the rows inside each one.
const groups = computed(() => {
  const byDate = new Map()
  for (const e of props.entries) {
    const key = formatDate(e.ts)
    if (!byDate.has(key)) byDate.set(key, [])
    byDate.get(key).push(e)
  }
  return [...byDate.entries()].map(([date, rows]) => ({ date, rows }))
})

const expanded = ref(new Set())
// entries loads async after mount (see openHistory in App.vue), so the
// default can't just be "expand groups[0] at setup time" — that runs
// before the real data (and its groups) exist. Open the most recent date
// the first time groups becomes non-empty, and leave it alone after that
// so it doesn't fight with the player's own taps.
let defaultOpened = false
watch(
  groups,
  (gs) => {
    if (!defaultOpened && gs.length) {
      expanded.value = new Set([gs[0].date])
      defaultOpened = true
    }
  },
  { immediate: true },
)

function toggle(date) {
  const next = new Set(expanded.value)
  if (next.has(date)) next.delete(date)
  else next.add(date)
  expanded.value = next
}
</script>

<template>
  <section class="screen scene history-screen">
    <img class="scene-title" :src="title" alt="ประวัติการเล่น GS CLAW EGG" />

    <div v-if="!entries.length" class="empty-state">
      <img class="empty-icon" :src="emptyIcon" alt="" />
      <img class="empty-title" :src="emptyTitle" alt="ยังไม่มีประวัติการเล่น" />
      <img class="empty-subtitle" :src="emptySubtitle" alt="เมื่อคุณเริ่มเล่น รายการจะแสดงที่นี่" />
    </div>

    <ul v-else class="history-groups">
      <li v-for="g in groups" :key="g.date" class="history-group">
        <button
          class="history-date-header"
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

        <ul v-if="expanded.has(g.date)" class="history-entries">
          <li v-for="e in g.rows" :key="e.id" class="history-entry-row">
            <img class="entry-row-bg" :src="rowBg" alt="" />
            <!-- row.png bakes its divider at a fixed x (~49.85%), too far
                 from the time to move via CSS — cover it and draw a new
                 one closer to the time instead. -->
            <span class="entry-divider-cover"></span>
            <span class="entry-divider"></span>
            <span class="entry-time">{{ formatClock(e.ts) }}</span>
            <span class="entry-value" :class="{ coin: e.coinValue }">
              <img class="coin-inline" :src="coinIcon" alt="" />
              <template v-if="e.coinValue">
                <span
                  ><span class="value-prefix" v-if="e.kind !== 'redeem'">ได้ </span><template v-else>-</template><span
                    class="value-num"
                    >{{ e.coinValue.toLocaleString() }}</span
                  >
                  Coin</span
                >
              </template>
              <template v-else>
                <span>{{ e.label }}</span>
              </template>
            </span>
          </li>
        </ul>
      </li>
    </ul>

    <button class="img-btn back-btn" @click="$emit('back')"><img :src="btnHome" alt="กลับหน้าหลัก" /></button>
  </section>
</template>

<style scoped>
/* Reserves room for the fixed back-btn below (both branches — list and
   empty-state) so scrolled content never ends up hidden underneath it. */
.history-screen { align-items: stretch; justify-content: flex-start; padding-bottom: 100px; }

.empty-state {
  flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 6px; padding: 40px 0;
}
.empty-icon { width: min(220px, 56vw); height: auto; margin-bottom: 6px; }
.empty-title { width: min(320px, 80vw); height: auto; }
.empty-subtitle { width: min(300px, 76vw); height: auto; }

.history-groups { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 14px; }

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
.header-date {
  position: absolute;
  left: 18.5%;
  top: 0;
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
  top: 0;
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
  right: 5%;
  top: 0;
  width: 8%;
  height: 100%;
  object-fit: contain;
}

/* Tried GS Game (76).png (the full card art) stretched to fit here, but
   object-fit:fill-style stretching only works when the art has no baked
   detail other than a flat fill (see .point-panel-bg in TicketExchange).
   This card's own header band, divider line, and the small diamond studs
   along its side border are all at fixed positions in the source art, so
   stretching it to however many rows a date has smears the divider into
   the middle of the list and warps the studs into dashes. Continuing the
   header's border colour in plain CSS avoids that — same border colour
   the rest of the app's CSS-drawn panels use (see .hud-panel), with a
   matching bottom-left notch to mirror the header's baked top-right one. */
.history-entries {
  list-style: none;
  margin: 0;
  padding: 10px 4%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border: 1.5px solid rgba(101, 197, 255, 0.55);
  border-top: none;
  background: linear-gradient(180deg, rgba(10, 40, 90, 0.55), rgba(6, 20, 42, 0.75));
  box-shadow: inset 0 0 18px rgba(40, 150, 255, 0.08);
  clip-path: polygon(0 0, 100% 0, 100% 100%, 18px 100%, 0 calc(100% - 18px));
}
.history-entry-row {
  position: relative;
  width: 100%;
}
.entry-row-bg { width: 100%; height: auto; display: block; }

/* Covers row.png's own baked divider (a soft glowing line centred at
   x≈49.85%) so .entry-divider below can redraw it closer to the time
   instead — moving the baked line itself isn't possible, only where our
   own copy of it sits. A flat fill patch here left a visible seam because
   the row art isn't a flat colour top-to-bottom: it has its own bright
   border-glow band near the top and bottom edges (y≈3-10% and y≈90-97%,
   sampled off to the side of the divider at x=47%) with a darker flat
   band in between. This gradient reproduces that same vertical profile so
   the patch blends in instead of reading as a dark cutout. */
.entry-divider-cover {
  position: absolute;
  left: 48.5%;
  width: 3%;
  top: 0;
  height: 100%;
  background: linear-gradient(
    180deg,
    rgb(0, 50, 160) 0%,
    rgb(1, 72, 254) 3%,
    rgb(0, 172, 250) 6%,
    rgb(0, 72, 237) 10%,
    rgb(0, 55, 173) 15%,
    rgb(0, 47, 147) 20%,
    rgb(0, 41, 123) 30%,
    rgb(1, 40, 115) 50%,
    rgb(1, 41, 120) 70%,
    rgb(0, 46, 139) 80%,
    rgb(0, 55, 162) 85%,
    rgb(0, 65, 199) 90%,
    rgb(0, 250, 254) 94%,
    rgb(0, 75, 253) 97%,
    rgb(0, 50, 160) 100%
  );
}
.entry-divider {
  position: absolute;
  left: 31%;
  width: 1.5px;
  top: 22%;
  height: 56%;
  background: #bdeeff;
  box-shadow: 0 0 6px 1px rgba(120, 220, 255, 0.9);
}

/* Percentages measured against the 1338x180 source art (GS Game (70).png):
   clock icon at x 0.6-10.7%, y 19.4-89.4%. */
.entry-time {
  position: absolute;
  left: 13%;
  width: 16%;
  top: 20%;
  height: 60%;
  display: flex;
  align-items: center;
  font-size: clamp(13px, 3.8vw, 16px);
  font-weight: 700;
  color: #eaf6ff;
  white-space: nowrap;
}
.entry-value {
  position: absolute;
  left: 53%;
  width: 44%;
  top: 0;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: clamp(11px, 3.2vw, 13.5px);
  font-weight: 800;
  color: #7fd0ff;
}
.entry-value.coin { color: #ffd739; }
.value-prefix { color: #fff; }
.value-num {
  font-family: "Baloo 2", Inter, ui-sans-serif, system-ui, sans-serif;
  font-size: 1.4em;
}
.coin-inline { width: 20px; height: 20px; object-fit: contain; flex-shrink: 0; }

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
      filter: drop-shadow(0 6px 14px rgba(0, 0, 0, .45)); }

</style>
