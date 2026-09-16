<script setup>
import { computed, ref } from "vue";
import btnHome from "../assets/ui/common/btn-home-blue.webp";
import titleBanner from "../assets/ui/point-exchange/title.webp";
import panelBg from "../assets/ui/point-exchange/panel.webp";
import btnMinus from "../assets/ui/point-exchange/btn-minus.webp";
import btnPlus from "../assets/ui/point-exchange/btn-plus.webp";
import chipTicket from "../assets/ui/point-exchange/chip-ticket.webp";
import labelExchangeAmount from "../assets/ui/point-exchange/label-amount-to-exchange.webp";
import btnStartGame from "../assets/ui/point-exchange/btn-start-game.webp";
import btnStartGameDisabled from "../assets/ui/point-exchange/btn-start-game-disabled.webp";

const RATE = 10;
const MAX_AMOUNT = 100;

const props = defineProps({
  points: { type: Number, required: true },
  tickets: { type: Number, required: true },
  exchanging: { type: Boolean, default: false },
  message: { type: String, default: "" },
});

const emit = defineEmits(["back", "start"]);

// Already having tickets always wins — pressing "เริ่มเกม" just plays with
// those, whatever the stepper happens to be dialed to. Only when there's
// nothing left to play with does the selected amount actually get spent
// (see App.vue's startFromExchange), so canPressStart covers both "can
// play right now" and "can afford to buy in and then play."
const canStart = computed(() => props.tickets >= 1);

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
const canAffordAmount = computed(
  () => amount.value >= RATE && amount.value <= props.points,
);
const canPressStart = computed(() => canStart.value || canAffordAmount.value);

function step(delta) {
  const next = amount.value + delta;
  amount.value = Math.max(RATE, Math.min(maxAffordable.value, next));
}

function pick(v) {
  amount.value = Math.min(v, maxAffordable.value);
}
</script>

<template>
  <section class="screen scene point-exchange-screen">
    <img
      class="point-title"
      :src="titleBanner"
      alt="แลก Point เป็นสิทธิ์เล่น อัตราแลก 10 Point = 1 สิทธิ์ แลกสูงสุดครั้งละ 100 Point (10 สิทธิ์)"
    />
    <!-- Sits above the panel rather than below it — .point-panel has a
         negative bottom margin pulling .back-btn up over its own dead
         space, which swallowed this when it lived down there (either
         squashed to nothing or painted over, depending on the exact
         margin math for the current viewport width). -->
    <p v-if="message" class="exchange-message">{{ message }}</p>
    <!-- canStart (already having a ticket banked) makes "เริ่มเกม" skip
         spending the amount dialed in below entirely (see App.vue's
         startFromExchange) — without this, a player who still has, say, 1
         leftover ticket from an earlier session dials in 5 here, presses
         start, and unknowingly plays a 1-ticket round instead (the 5 never
         even gets exchanged), with nothing on screen explaining why. -->
    <p v-if="canStart" class="existing-ticket-note">
      คุณมีสิทธิเล่นอยู่แล้ว {{ tickets }} สิทธิ กด "เริ่มเกม"
      เพื่อเล่นด้วยสิทธิที่มีอยู่ก่อน
    </p>

    <div class="point-panel-wrap">
    <div class="point-panel">
      <img class="point-panel-bg" :src="panelBg" alt="" />
      <!-- Covers panel.png's own baked "Point คงเหลือ" label so the ticket
           balance below can take over this row instead. -->
      <div class="panel-balance-cover"></div>
      <div class="panel-ticket-row">
        <img
          class="panel-ticket-label"
          :src="labelExchangeAmount"
          alt="จำนวน Point ที่ต้องการแลก"
        />
      </div>

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

      <!-- Single action now: no more separate "ยืนยันแลก" step first —
           already having tickets plays with those directly, otherwise this
           spends the amount dialed in above and plays as soon as that
           resolves (see App.vue's startFromExchange). While that call is in
           flight, App.vue swaps this whole component out for its own
           dedicated loading screen (same treatment as the out-of-tickets ->
           BatchSummary handoff) rather than anything shown here, so this
           button just needs to stop being clickable in the meantime. -->
      <button
        class="img-btn start-game-btn"
        :disabled="!canPressStart || exchanging"
        @click="emit('start', amount)"
      >
        <img
          :src="canPressStart ? btnStartGame : btnStartGameDisabled"
          :alt="canPressStart ? 'เริ่มเกม' : 'Point ไม่เพียงพอ'"
        />
      </button>
    </div>
    </div>
    <p v-if="points < RATE" class="rule-note warn">
      Point ไม่พอสำหรับแลกสิทธิ์
    </p>

    <button class="img-btn back-btn" @click="emit('back')">
      <img :src="btnHome" alt="กลับหน้าหลัก" />
    </button>
  </section>
</template>

<style scoped>
.point-exchange-screen {
  justify-content: flex-start;
}
.point-title {
  width: min(400px, 90%);
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
   every row (balance, stepper, quick-picks, ticket-chip, confirm AND the
   "เริ่มเกม" button) can sit inside its border. object-fit:fill stretches
   every row by the same vertical factor, so a percentage-of-height position
   within the original art still lands at that same percentage regardless of
   how tall the container box is made — growing the aspect-ratio's height
   only changes how far apart everything is spaced, never their alignment to
   the art. The container's aspect-ratio height (980) is set so 100% lands
   right where the border art used to end back when there were two stacked
   buttons ("ยืนยันแลก" + "เริ่มเกม") — now there's only one (see
   start-game-btn), sitting higher up where the first of those two used to
   be, so there's more dead card space below it than before. Keep every
   child's percentage in that same ratio to each other if you resize this
   again. */
/* .point-panel used to carry its own width + a negative bottom margin to
   trim the panel art's dead space (see the child-percentage comment
   above) — negative margins don't reliably shrink what a scrollable
   *ancestor* (.screen's own overflow-y:auto) counts toward its own
   scrollHeight in every browser, so .point-panel's full, un-trimmed
   height (before the negative margin pulled .back-btn up over it) was
   quietly still "there" for scroll purposes: .screen ended up
   draggable-down into 80+px of nothing, on viewports tall enough that
   nothing should have needed to scroll at all. This wrapper claims only
   the actual trimmed footprint as real, positive height and clips the
   panel's own dead space with overflow:hidden instead — a scrollable
   ancestor can't be fooled by a box that was never really there.
   % here (not vw) for the same reason as elsewhere on this screen — vw
   measures the raw viewport, ignoring .screen's own 18px-a-side padding,
   so it rendered a few px wider than the space actually available. */
.point-panel-wrap {
  --panel-w: min(400px, 94%);
  width: var(--panel-w);
  height: calc(var(--panel-w) * 980 / 569 - var(--panel-w) * 0.44);
  overflow: hidden;
  position: relative;
}
.point-panel {
  position: relative;
  width: 100%;
  aspect-ratio: 569 / 980;
}
.point-panel-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 78.5%;
  object-fit: fill;
}
/* Covers panel.png's own baked "Point คงเหลือ" label + balance number area
   (roughly x:22-94%, y:9-23% of this box) so the ticket-balance row can take
   over that whole top row instead — sampled from the flat navy background
   that fills the rest of the panel's interior. */
.panel-balance-cover {
  position: absolute;
  left: 22%;
  width: 72%;
  top: 9%;
  height: 14%;
  border-radius: 4px;
}
.panel-ticket-row {
  position: absolute;
  left: 6%;
  width: 88%;
  top: 8.2%;
  height: 6.5%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.panel-ticket-label {
  height: 93%;
  width: auto;
  display: block;
}
.panel-big-num {
  position: absolute;
  left: 0;
  width: 100%;
  top: 12.75%;
  height: 17.5%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: "Baloo 2", Inter, ui-sans-serif, system-ui, sans-serif;
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
  top: 27%;
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
  top: 17.5%;
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
  top: 36%;
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
  top: 48.25%;
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
  font-family: "Baloo 2", Inter, ui-sans-serif, system-ui, sans-serif;
  font-weight: 900;
  color: #fff;
  font-size: clamp(16px, 5vw, 22px);
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
}

.img-btn img {
  width: 100%;
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
  top: 45.5%;
  margin: 0;
  text-align: center;
  color: #8fbede;
  font-size: 11.5px;
  pointer-events: none;
}
/* Sits where the old "ยืนยันแลก" button used to (that separate confirm
   step is gone — see startFromExchange in App.vue), now the panel's only
   action button. */
.start-game-btn {
  position: absolute;
  left: 11%;
  width: 78%;
  top: 60%;
  margin: 0;
}
/* btn-start-game-disabled.png already bakes in the greyed-out button art
   plus the "Point ไม่เพียงพอ" warning line beneath it, so the default
   disabled treatment (grayscale + dim) would just muddy art that's already
   designed to read as disabled — keep this button's normal drop-shadow
   instead. */
.start-game-btn:disabled img {
  filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.35));
}
.exchange-message {
  width: min(400px, 90%);
  margin: 0 0 8px;
  color: #b9dcf6;
  text-align: center;
  font-size: 12px;
  line-height: 1.3;
}
.existing-ticket-note {
  width: min(360px, 88%);
  margin: 0 0 8px;
  padding: 6px 14px;
  border-radius: 10px;
  background: rgba(255, 215, 57, 0.12);
  border: 1px solid rgba(255, 215, 57, 0.4);
  color: #ffd739;
  text-align: center;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.4;
}

.back-btn {
  width: min(300px, 80%);
  margin-top: 12px;
}

/* @container, not @media — see the .game-phone comment in style.css: this
   keys off the phone frame's own rendered width instead of the raw browser
   viewport, which stays reliable in landscape or on a wide unfolded
   foldable where the two would otherwise disagree. */
@container (max-width: 399px) {
  .point-title {
    width: 95%;
  }
  .point-panel-bg {
    height: 70.5%;
  }
  .panel-ticket-label {
    height: 85%;
  }
  .panel-ticket-row {
    top: 5.2%;
  }
  .stepper-btn-img {
    top: 14.5%;
  }
  .panel-big-num {
    top: 11.75%;
  }
  .panel-point-label {
    top: 25%;
  }
  .ticket-chip {
    top: 44.25%;
  }
  .start-game-btn {
    top: 54%;
  }
  .quick-picks {
    top: 34%;
  }
  .back-btn {
    margin-top: -15px;
  }
}
</style>
