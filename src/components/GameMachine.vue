<script setup>
import { computed, ref, watch } from "vue";
import Claw from "./Claw.vue";
import EggPile from "./EggPile.vue";
import GameIcon from "./GameIcon.vue";
import cabinetBox from "../assets/ui/gameplay/cabinet-box.webp";
import shakeBanner from "../assets/ui/gameplay/shake-banner.webp";
import ticketRowBg from "../assets/ui/gameplay/ticket-row-bg.webp";
import ticketIcon from "../assets/ui/gameplay/ticket-icon.webp";
import labelTicketsRemain from "../assets/ui/gameplay/label-tickets-remain.webp";
import dividerSparkle from "../assets/ui/gameplay/divider-sparkle.webp";
import btnAutoToggle from "../assets/ui/gameplay/btn-auto-toggle.webp";
import arrowLeft from "../assets/ui/gameplay/arrow-left.webp";
import arrowRight from "../assets/ui/gameplay/arrow-right.webp";
import btnGrab from "../assets/ui/gameplay/btn-grab.webp";

const props = defineProps({
  eggs: { type: Array, required: true },
  clawX: { type: Number, required: true },
  clawAnim: { type: String, required: true },
  targetId: { type: [Number, null], default: null },
  timer: { type: Number, required: true },
  motionEnabled: { type: Boolean, default: false },
  controlsEnabled: { type: Boolean, default: false },
  message: { type: String, default: "" },
  stirTrigger: { type: Number, default: 0 },
  tickets: { type: Number, default: 0 },
  heldEggColor: { type: String, default: "blue" },
  needsStir: { type: Boolean, default: false },
  // Every egg grabbed so far this session, each { id, color, src, reward } —
  // shown here as a growing tray of small color-matched icons so the player
  // can see what they've collected without leaving the play screen, even
  // though the reward itself stays hidden until the reveal screen (see
  // App.vue's grabEgg/collectedEggs).
  collectedEggs: { type: Array, default: () => [] },
  // NOTE: only reflects/toggles AUTO while this screen itself is mounted —
  // GameMachine only renders during playing/stirring/grabbing, so once a
  // round moves on to opening/result/summary this button (and any way to
  // turn AUTO back off) disappears until the next round lands back here.
  // Known/accepted tradeoff per explicit direction, not an oversight — see
  // the ticket-auto-bar comment below.
  autoActive: { type: Boolean, default: false },
});

const emit = defineEmits([
  "back",
  "toggle-motion",
  "shake-tap",
  "move-start",
  "move-end",
  "grab",
  "stir",
  "toggle-auto",
]);

const DESCEND_Y = 46;

const clawY = computed(() =>
  props.clawAnim === "descend" || props.clawAnim === "grip" ? DESCEND_Y : 0,
);
const holding = computed(() =>
  ["grip", "ascend", "settle"].includes(props.clawAnim),
);
const grabbing = computed(() => props.clawAnim !== "idle");

// Distinguishes "never pressed this session" from "pressed and turned back
// off" — both are the same autoActive:false, but only the latter should
// dim the button. GameMachine remounts fresh every session (see its own
// autoActive prop comment), so this naturally resets to false right when
// the player lands back on this screen, without needing App.vue to track
// it at all.
const everToggledAuto = ref(false);
function handleToggleAuto() {
  everToggledAuto.value = true;
  emit("toggle-auto");
}

// Deliberately NOT using setPointerCapture here. It sounds like the right
// tool for a hold-button (guarantee the release fires on this element even
// if the finger drifts), but it repeatedly proved unreliable in practice:
// this button can go `disabled` mid-press (round timer hits 0, an auto-grab
// fires), and disabling an element that holds pointer capture does not
// reliably fire pointerup/pointercancel on it in every browser/emulator —
// leaving that capture live. While a capture is live, *every* pointer event
// for that pointerId reroutes to the capturing element no matter where on
// the page is actually tapped, which looks exactly like "the whole app
// stopped responding" (arrows, grab, even the next screen's buttons) with
// no console error, because nothing is actually throwing — events are just
// being silently misdirected.
//
// Binding the release listeners to `window` instead sidesteps the whole
// problem: they don't care whether this element is disabled, removed, or
// re-rendered, and a real pointerup/pointercancel still bubbles all the way
// to window regardless of what element it nominally targets.
let stopActivePress = null;

function handlePressStart(dir) {
  emit("move-start", dir);
  if (stopActivePress) stopActivePress();
  const onRelease = () => {
    window.removeEventListener("pointerup", onRelease);
    window.removeEventListener("pointercancel", onRelease);
    stopActivePress = null;
    emit("move-end");
  };
  window.addEventListener("pointerup", onRelease);
  window.addEventListener("pointercancel", onRelease);
  stopActivePress = onRelease;
}

watch(
  () => props.controlsEnabled,
  (enabled) => {
    if (!enabled && stopActivePress) stopActivePress();
  },
);
</script>

<template>
  <section class="screen play-screen">
    <div class="cabinet">
      <img class="cabinet-bg" :src="cabinetBox" alt="" />
      <span class="cabinet-timer" :class="{ danger: timer <= 5 }">{{
        timer
      }}</span>

      <div class="cabinet-chamber">
        <EggPile
          :eggs="eggs"
          :target-id="targetId"
          :stir-trigger="stirTrigger"
        />
        <Claw
          :x="clawX"
          :y="clawY"
          :phase="clawAnim"
          :holding="holding"
          :held-color="heldEggColor"
        />
      </div>
    </div>

    <div
      class="shake-pill"
      :class="{ 'shake-gate': needsStir }"
      :role="needsStir ? 'button' : null"
      @click="needsStir && emit('shake-tap')"
    >
      <img class="shake-pill-bg" :src="shakeBanner" alt="" />
      <p v-if="!needsStir && message" class="shake-pill-text">
        {{ message }}
      </p>
    </div>

    <!-- Always present from the moment the round starts (not conditional
         on collectedEggs actually having anything yet) — popping this whole
         box (dark background + border) into existence right as the first
         egg lands, shoving the ticket bar/controls down to make room, read
         as the screen itself hiccuping/going dark for a beat. Reserving its
         height up front means every later grab just adds an icon into an
         already-stable layout instead. -->
    <div class="collected-tray">
      <TransitionGroup name="egg-drop" tag="div" class="collected-tray-inner">
        <img
          v-for="egg in collectedEggs"
          :key="egg.id"
          class="collected-egg"
          :src="egg.src"
          alt=""
        />
      </TransitionGroup>
    </div>

    <!-- Only shown while this screen itself is mounted (playing/stirring/
         grabbing) — once a round moves on to opening/result/summary this
         disappears along with everything else here, taking the only way to
         turn AUTO back off with it. Explicit tradeoff, not an oversight
         (see the autoActive prop comment above). -->
    <div class="ticket-auto-bar">
      <img class="ticket-auto-bar-bg" :src="ticketRowBg" alt="" />
      <img class="ticket-auto-icon" :src="ticketIcon" alt="" />
      <img
        class="ticket-auto-label"
        :src="labelTicketsRemain"
        alt="สิทธิ์คงเหลือ"
      />
      <span class="ticket-auto-num">{{ tickets }}</span>
      <img class="ticket-auto-divider" :src="dividerSparkle" alt="" />
      <button
        class="ticket-auto-btn"
        :class="{ active: autoActive, dulled: !autoActive && everToggledAuto }"
        @click="handleToggleAuto"
      >
        <img :src="btnAutoToggle" alt="AUTO" />
      </button>
    </div>

    <div class="control-dock">
      <button
        class="img-btn arrow-btn"
        :disabled="!controlsEnabled"
        @pointerdown="handlePressStart(-1)"
        aria-label="เลื่อนซ้าย"
      >
        <img :src="arrowLeft" alt="" />
      </button>
      <button
        class="img-btn grab-btn"
        :disabled="!controlsEnabled || grabbing"
        @click="emit('grab')"
      >
        <img :src="btnGrab" alt="คีบ" />
      </button>
      <button
        class="img-btn arrow-btn"
        :disabled="!controlsEnabled"
        @pointerdown="handlePressStart(1)"
        aria-label="เลื่อนขวา"
      >
        <img :src="arrowRight" alt="" />
      </button>
    </div>
  </section>
</template>

<style scoped>
/* Kept deliberately tight: this screen's content is taller than most others
   (cabinet art + message pill + ticket row + controls), and if it exceeds
   the viewport height the page has to scroll to reach the arrow buttons —
   which made real touch holds get cut short as scroll and press gestures
   fought over the same drag. Every margin/padding here is trimmed to keep
   the whole screen fitting without scroll on a typical phone viewport. */
.play-screen {
  padding-top: 6px;
  padding-bottom: 8px;
}
.play-toolbar {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2px;
}
.icon-btn {
  width: 34px;
  height: 34px;
  border-radius: 11px;
  border: 1px solid #2e79ba;
  color: #cfeaff;
  background: linear-gradient(#0c3768, #08254b);
  cursor: pointer;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
  display: grid;
  place-items: center;
  font-size: 17px;
}
.icon-btn.active {
  color: #061428;
  background: linear-gradient(#7fe0ff, #23a8ff);
  border-color: #9fe8ff;
  box-shadow: 0 0 14px rgba(60, 190, 255, 0.7);
}

/* Percentages measured against the 529x688 cabinet-box.png. Its glass
   interior is fully painted (no alpha cutout), so the live egg pile + claw
   render as an overlay clipped to the chamber's visible bounds, on top of
   the (now empty) illustrated glass rather than behind a transparent hole. */
.cabinet {
  position: relative;
  width: 100%;
  margin: 0 auto;
  aspect-ratio: 529 / 688;
}
.cabinet-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.cabinet-timer {
  position: absolute;
  left: 63%;
  width: 20%;
  top: 5.7%;
  height: 7%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: "Baloo 2", Inter, ui-sans-serif, system-ui, sans-serif;
  font-weight: 800;
  line-height: 1;
  color: #eaf6ff;
  font-size: 30px;
  text-shadow:
    0 0 10px rgba(120, 210, 255, 0.8),
    0 2px 4px rgba(0, 0, 0, 0.5);
  font-variant-numeric: tabular-nums;
}
.cabinet-timer.danger {
  color: #ff8a94;
  animation: dangerPulse 0.55s ease-in-out infinite alternate;
}

.cabinet-chamber {
  position: absolute;
  left: 6%;
  width: 92%;
  top: 24.5%;
  height: 61%;
  z-index: 2;
  overflow: hidden;
}

.shake-pill {
  position: relative;
  width: 100%;
  margin: -22px auto 0;
}
.shake-pill-bg {
  width: 100%;
  height: auto;
  display: block;
}
/* shake-banner.png has its own "เขย่ามือถือก่อนเริ่ม" prompt baked into the
   artwork itself (that's what's actually showing while needsStir gates the
   round) — this pill gets reused afterward to surface live messages
   (tap-count hints, batch round captions, and now the play_claw wait) as a
   plain transparent overlay in the same spot, which used to just print
   straight on top of that baked text once both were visible at once. The
   backdrop here blocks that out so whichever message is live is what
   actually reads. */
.shake-pill-text {
  position: absolute;
  left: 21%;
  width: 74%;
  top: 0;
  height: 100%;
  margin: 0;
  padding: 0 14px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 6px;
  color: #eaf6ff;
  font-size: 11.5px;
  font-weight: 700;
  line-height: 1.25;
  text-align: left;
  text-shadow: 0 0 8px rgba(60, 190, 255, 0.5);
  background: rgba(4, 14, 32, 0.92);
  border-radius: 0 20px 20px 0;
}
.shake-pill.shake-gate {
  cursor: pointer;
}
.shake-pill.shake-gate .shake-pill-bg {
  animation: shakeGateGlow 1s ease-in-out infinite;
}
@keyframes shakeGateGlow {
  0%,
  100% {
    filter: none;
  }
  50% {
    filter: drop-shadow(0 0 10px rgba(120, 210, 255, 0.9));
  }
}

/* Grows across a whole multi-grab session (see App.vue's collectedEggs) —
   always a single row regardless of egg count or screen width: each icon
   shrinks (see .collected-egg's flex-shrink) rather than the row wrapping
   onto a second line, so the tray's own height — and everything below it —
   never has to shift as the session goes on. */
.collected-tray {
  width: 100%;
  min-height: 38px;
  margin: 4px auto 0;
  padding: 4px 8px;
  border-radius: 12px;
  background: rgba(4, 14, 32, 0.55);
  border: 1px solid rgba(101, 197, 255, 0.35);
  flex-shrink: 0;
  display: flex;
  align-items: center;
}
.collected-tray-inner {
  width: 100%;
  display: flex;
  flex-wrap: nowrap;
  justify-content: center;
  align-items: center;
  gap: 4px;
}
.collected-egg {
  width: 26px;
  height: auto;
  flex: 0 1 26px;
  min-width: 10px;
  object-fit: contain;
  filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.4));
}
/* A freshly-grabbed egg drops in from the cabinet above and settles into
   its slot, instead of just popping into the tray — the bounce (overshoot
   past 1 before settling) is what sells "landed" rather than "faded in".
   Every other already-collected egg shifts over smoothly too (TransitionGroup's
   built-in FLIP move) as the tray's flex-wrap reflows to make room. */
.egg-drop-enter-active {
  transition:
    transform 0.46s cubic-bezier(0.34, 1.56, 0.64, 1),
    opacity 0.25s ease;
}
.egg-drop-enter-from {
  opacity: 0;
  transform: translateY(-52px) scale(0.3) rotate(-25deg);
}
.egg-drop-move {
  transition: transform 0.3s ease;
}

.ticket-auto-bar {
  position: relative;
  width: 100%;
  margin: 4px auto 0;
  aspect-ratio: 1347 / 301;
  flex-shrink: 0;
}
.ticket-auto-bar-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: fill;
}
.ticket-auto-icon {
  position: absolute;
  left: 4%;
  width: 13%;
  top: 50%;
  height: auto;
  transform: translateY(-50%);
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4));
}
.ticket-auto-label {
  position: absolute;
  left: 19%;
  width: 25%;
  top: 50%;
  height: auto;
  transform: translateY(-50%);
}
.ticket-auto-num {
  position: absolute;
  left: 45%;
  width: 9%;
  top: 50%;
  height: 60%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: "Baloo 2", Inter, ui-sans-serif, system-ui, sans-serif;
  font-weight: 800;
  line-height: 1;
  color: #fff;
  font-size: clamp(16px, 4.8vw, 22px);
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
  font-variant-numeric: tabular-nums;
}
.ticket-auto-divider {
  position: absolute;
  left: 53.5%;
  width: auto;
  top: 50%;
  height: 100%;
  transform: translateY(-50%);
}
.ticket-auto-btn {
  position: absolute;
  left: 65%;
  width: 37%;
  top: 50%;
  transform: translateY(-50%);
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}
.ticket-auto-btn img {
  width: 80%;
  height: auto;
  display: block;
  /* Full color by default — this only dims once the player has actually
     turned AUTO off (see .dulled below), not just because it starts
     untouched every time this screen is (re)mounted. */
  transition: filter 0.2s ease;
}
.ticket-auto-btn.dulled img {
  filter: grayscale(0.75) brightness(0.65);
}
.ticket-auto-btn.active img {
  filter: none;
  animation: autoBtnPulse 1.1s ease-in-out infinite;
}
@keyframes autoBtnPulse {
  0%,
  100% {
    filter: drop-shadow(0 0 4px rgba(255, 60, 220, 0.6));
  }
  50% {
    filter: drop-shadow(0 0 12px rgba(255, 60, 220, 0.95));
  }
}

.control-dock {
  width: 100%;
  margin-left: auto;
  margin-right: auto;
  display: grid;
  grid-template-columns: 0.72fr 1.55fr 0.72fr;
  gap: 18px;
  align-items: center;
  margin-top: 10px;
}
.arrow-btn {
  width: 100%;
  touch-action: none;
}
/* arrow-right.png has a brighter glow baked into its left edge (facing the
   grab button) than arrow-left.png has on its matching right edge, so an
   equal grid `gap` still reads as a smaller visual gap on this side —
   nudge it over to compensate. */
.control-dock > .arrow-btn:last-child {
  margin-left: 10px;
}
.grab-btn {
  width: 100%;
  touch-action: none;
}
/* Overrides the global .img-btn:disabled dim (grayscale + darken) for just
   these three — they go disabled constantly now (every single grab's own
   ~1.15s animation, not just the once-per-round pauses this treatment was
   originally tuned for), so that flicker read as the whole screen going
   dark for a beat on every grab instead of a rare, meaningful pause. The
   `disabled` attribute itself still blocks taps either way — this only
   changes how it looks. */
.arrow-btn:disabled img,
.grab-btn:disabled img {
  filter: none;
}

@keyframes dangerPulse {
  to {
    transform: scale(1.08);
  }
}
</style>
