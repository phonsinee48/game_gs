<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import eggBlue from './assets/egg-blue.png'
import eggWhite from './assets/egg-white.png'
import eggBlack from './assets/egg-black.png'
import coinPile from './assets/coin-pile.png'
import rewardLotus from './assets/reward-lotus.svg'
import rewardPtt from './assets/reward-ptt.svg'
import rewardHomepod from './assets/reward-homepod.svg'
import gsBatteryBadge from './assets/ui/common/badge.png'
import hudTopbar from './assets/ui/common/topbar.png'
import hexBg from './assets/ui/common/hex-bg.png'
import homeTitleFull from './assets/ui/home/03.png'
import cabinetHero from './assets/ui/home/cabinet.png'
import btnStart from './assets/ui/home/btn-start.png'
import navHowToPlay from './assets/ui/home/nav-how-to-play.png'
import navHistory from './assets/ui/home/nav-history.png'
import navRewards from './assets/ui/home/nav-rewards.png'

import GameMachine from './components/GameMachine.vue'
import ClawSuccess from './components/ClawSuccess.vue'
import EggOpening from './components/EggOpening.vue'
import RewardResult from './components/RewardResult.vue'
import TicketExchange from './components/TicketExchange.vue'
import BatchPicker from './components/BatchPicker.vue'
import CoinRewards from './components/CoinRewards.vue'
import HistoryList from './components/HistoryList.vue'
import BatchSummary from './components/BatchSummary.vue'
import HowToPlay from './components/HowToPlay.vue'
import LimitReached from './components/LimitReached.vue'
import { useClawDrive } from './composables/useClawDrive'

const EXCHANGE_RATE = 10 // points per ticket
const EXCHANGE_MAX = 100 // max points per exchange, grants +1 bonus ticket
const ROUND_TIME = 30 // matches the timer shown in the 08_gameplay / 06_claw_success mockups
const FRAMES = 8

// gameState: idle | exchange | batchPick | howToPlay | playing | stirring
//          | grabbing | clawSuccess | opening | result | summary | rewards | history
const gameState = ref('idle')
const points = ref(120)
const coins = ref(1250)
const tickets = ref(0)
const timer = ref(ROUND_TIME)
const message = ref('')
const motionEnabled = ref(false)
const soundOn = ref(true)

const drive = useClawDrive(50)
const clawAnim = ref('idle') // idle|pause|descend|grip|ascend|settle
const heldEgg = ref(null)
const targetEggId = ref(null)
const crackCount = ref(0)
const reward = ref(null)
const sceneFlash = ref(false)
const confetti = ref(false)
const justCompleted = ref(false)
const stirTrigger = ref(0)

const batchSize = ref(1)
const batchIndex = ref(0)
const batchRewards = ref([])
const historyLog = ref([])
let historySeq = 0

let timerId
let lastShakeAt = 0
let transitionToken = 0


const eggPool = [eggBlue, eggWhite, eggBlack]
const baseEggs = [
  [16, 74, -9], [28, 71, 6], [40, 76, -4], [52, 70, 5], [64, 77, -7], [76, 72, 7], [86, 77, -4],
  [22, 86, 5], [36, 88, -7], [50, 85, 2], [64, 89, -3], [78, 86, 8],
]

function makeEggs() {
  return baseEggs.map(([x, y, rot], i) => ({
    id: i + 1,
    x,
    y,
    rot,
    src: eggPool[i % eggPool.length],
    hidden: false,
  }))
}

const eggs = ref(makeEggs())

// Weighted reward draw, synced to "GS Game.pdf" p.3's official rate table.
const rewards = [
  { type: 'prize', label: 'ทอง 50 สตางค์', weight: .02 },
  { type: 'prize', label: 'ทอง 25 สตางค์', weight: .02 },
  { type: 'prize', label: 'HomePod mini', weight: .07 },
  { type: 'prize', label: 'บัตรกำนัล ปตท. 1,000 บาท', weight: .26 },
  { type: 'prize', label: 'บัตรกำนัล ปตท. 500 บาท', weight: .34 },
  { type: 'prize', label: 'บัตรกำนัล Lotus 300 บาท', weight: .43 },
  { type: 'prize', label: 'บัตรกำนัล Lotus 200 บาท', weight: .43 },
  { type: 'prize', label: 'บัตรกำนัล Lotus 100 บาท', weight: .51 },
  { type: 'coin', label: '10 Coin', value: 10, weight: 34.07 },
  { type: 'coin', label: '20 Coin', value: 20, weight: 25.55 },
  { type: 'coin', label: '30 Coin', value: 30, weight: 21.29 },
  { type: 'coin', label: '50 Coin', value: 50, weight: 17.03 },
]

// Coin-shop catalog, synced to "GS Game.pdf" p.4-5's official prices.
const coinCatalog = [
  { id: 'lotus100', label: 'บัตรกำนัล Lotus 100 บาท', cost: 300, image: rewardLotus },
  { id: 'lotus200', label: 'บัตรกำนัล Lotus 200 บาท', cost: 600, image: rewardLotus },
  { id: 'lotus300', label: 'บัตรกำนัล Lotus 300 บาท', cost: 900, image: rewardLotus },
  { id: 'ptt500', label: 'บัตรกำนัล ปตท. 500 บาท', cost: 1500, image: rewardPtt },
  { id: 'ptt1000', label: 'บัตรกำนัล ปตท. 1,000 บาท', cost: 3000, image: rewardPtt },
  { id: 'homepod', label: 'HomePod mini', cost: 11670, image: rewardHomepod },
]

const canExchange = computed(() => points.value >= EXCHANGE_RATE)
const canPlayBatch = computed(() => tickets.value >= 1)
const isLimitReached = computed(() => !canPlayBatch.value && !canExchange.value)
const inMachine = computed(() => ['playing', 'stirring', 'grabbing'].includes(gameState.value))
const controlsEnabled = computed(() => gameState.value === 'playing' || gameState.value === 'stirring')

function imageForReward(r) {
  if (!r || r.type === 'coin') return coinPile
  if (r.label.includes('HomePod')) return rewardHomepod
  if (r.label.includes('ปตท')) return rewardPtt
  if (r.label.includes('Lotus')) return rewardLotus
  return coinPile
}

const rewardImage = computed(() => imageForReward(reward.value))

function ticketsForAmount(amount) {
  const base = Math.floor(amount / EXCHANGE_RATE)
  const bonus = amount >= EXCHANGE_MAX ? 1 : 0
  return { base, bonus, total: base + bonus }
}

function delay(ms) { return new Promise((r) => setTimeout(r, ms)) }

function confirmExchange(amount) {
  if (amount > points.value || amount < EXCHANGE_RATE) return
  const { total, bonus } = ticketsForAmount(amount)
  points.value -= amount
  tickets.value += total
  message.value = bonus
    ? `แลกสำเร็จ! ได้รับ ${total} สิทธิ์ (รวมโบนัส +${bonus})`
    : `แลกสำเร็จ! ได้รับ ${total} สิทธิ์`
  gameState.value = 'idle'
}

function openBatchPick() {
  if (canPlayBatch.value) {
    gameState.value = 'batchPick'
  } else if (canExchange.value) {
    gameState.value = 'exchange'
  }
  // otherwise isLimitReached is true and the home screen already shows
  // the LimitReached screen instead of this button.
}

function confirmBatch(size) {
  const n = Math.max(1, Math.min(size, tickets.value))
  batchIndex.value = 0
  batchRewards.value = []
  if (n === 1) {
    batchSize.value = 1
    startRound()
  } else {
    startBatchRound(n)
  }
}

// Batch mode (n > 1): the claw grabs once and the egg is tapped open once,
// then every ticket's reward is resolved together and shown as a list —
// the player never repeats the grab/crack animation per ticket.
function startBatchRound(n) {
  if (n < 1 || tickets.value < n) { goHome(); return }
  stopTimer()
  transitionToken++
  tickets.value -= n
  batchSize.value = n
  eggs.value = makeEggs()
  drive.setX(50)
  clawAnim.value = 'idle'
  heldEgg.value = null
  targetEggId.value = null
  crackCount.value = 0
  reward.value = null
  sceneFlash.value = false
  timer.value = ROUND_TIME
  gameState.value = 'playing'
  message.value = `เลือกตำแหน่งแล้วกดคีบ — จะเปิดพร้อมกันทั้งหมด ${n} ฟอง`
  timerId = setInterval(() => {
    timer.value--
    if (timer.value <= 0) {
      stopTimer()
      grabEgg(true)
    }
  }, 1000)
}

function redeemCoinReward(item) {
  if (coins.value < item.cost) return
  coins.value -= item.cost
  historyLog.value.unshift({
    id: ++historySeq,
    ts: Date.now(),
    label: item.label,
    image: item.image,
    kind: 'redeem',
    coinValue: item.cost,
  })
  message.value = `แลก ${item.label} สำเร็จ!`
}

function startRound() {
  if (tickets.value < 1) {
    goHome()
    return
  }
  stopTimer()
  transitionToken++
  tickets.value--
  batchIndex.value++
  eggs.value = makeEggs()
  drive.setX(50)
  clawAnim.value = 'idle'
  heldEgg.value = null
  targetEggId.value = null
  crackCount.value = 0
  reward.value = null
  sceneFlash.value = false
  timer.value = ROUND_TIME
  gameState.value = 'playing'
  message.value = batchSize.value > 1
    ? `รอบ ${batchIndex.value}/${batchSize.value} — เขย่ามือถือเพื่อกวนไข่ แล้วเลื่อนคีมไปตำแหน่งที่ต้องการ`
    : 'เขย่ามือถือเพื่อกวนไข่ แล้วเลื่อนคีมไปตำแหน่งที่ต้องการ'
  timerId = setInterval(() => {
    timer.value--
    if (timer.value <= 0) {
      stopTimer()
      grabEgg(true)
    }
  }, 1000)
}

function stirEggs() {
  if (gameState.value !== 'playing') return
  const token = transitionToken
  gameState.value = 'stirring'
  stirTrigger.value++
  message.value = 'กวนไข่แล้ว! เลื่อนคีมไปตำแหน่งที่ต้องการแล้วกดคีบ'
  beep(150, .07)
  delay(620).then(() => {
    if (token !== transitionToken) return
    if (gameState.value === 'stirring') gameState.value = 'playing'
  })
}

async function grabEgg(auto = false) {
  if (!['playing', 'stirring'].includes(gameState.value)) return
  stopTimer()
  const token = ++transitionToken
  const live = eggs.value.filter((e) => !e.hidden)
  if (!live.length) return
  const target = [...live].sort((a, b) => Math.abs(a.x - drive.x.value) - Math.abs(b.x - drive.x.value))[0]
  targetEggId.value = target.id
  gameState.value = 'grabbing'
  message.value = auto ? 'หมดเวลา ระบบกำลังคีบให้อัตโนมัติ' : 'กำลังคีบ...'

  clawAnim.value = 'pause'
  beep(220, .05)
  await delay(140)
  if (token !== transitionToken) return

  clawAnim.value = 'descend'
  beep(180, .08)
  await delay(500)
  if (token !== transitionToken) return

  target.hidden = true
  heldEgg.value = target
  clawAnim.value = 'grip'
  beep(420, .07)
  await delay(200)
  if (token !== transitionToken) return

  gameState.value = 'clawSuccess'
  clawAnim.value = 'ascend'
  await delay(500)
  if (token !== transitionToken) return

  clawAnim.value = 'settle'
  await delay(160)
  if (token !== transitionToken) return

  // Give the player a beat to see the claw-success screen (and a chance to
  // tap through it early) before auto-continuing to the egg-crack screen.
  setTimeout(() => {
    if (token !== transitionToken) return
    proceedToOpening()
  }, 1800)
}

async function proceedToOpening() {
  if (gameState.value !== 'clawSuccess') return
  const token = transitionToken
  sceneFlash.value = true
  await delay(240)
  if (token !== transitionToken) return

  gameState.value = 'opening'
  sceneFlash.value = false
  clawAnim.value = 'idle'
  crackCount.value = 0
  message.value = batchSize.value > 1
    ? `แตะที่ไข่เพื่อเปิดพร้อมกันทั้งหมด ${batchSize.value} ฟอง`
    : 'แตะที่ไข่ย้ำ ๆ ให้แตกครบ 8 ครั้ง'
}

async function tapEgg() {
  if (gameState.value !== 'opening' || crackCount.value >= FRAMES) return
  const batchMode = batchSize.value > 1
  crackCount.value = batchMode ? FRAMES : crackCount.value + 1
  beep(320 + crackCount.value * 35, .035)
  if (navigator.vibrate) navigator.vibrate(18)
  if (crackCount.value >= FRAMES) {
    const token = transitionToken
    justCompleted.value = true
    message.value = 'กำลังเปิดไข่...'
    beep(760, .1)
    await delay(420)
    if (token !== transitionToken) return
    justCompleted.value = false
    if (batchMode) resolveBatchAll()
    else revealReward()
  }
}

function logReward(r, kind = 'grab') {
  historyLog.value.unshift({
    id: ++historySeq,
    ts: Date.now(),
    label: r.label,
    image: imageForReward(r),
    kind,
    coinValue: r.type === 'coin' ? r.value : null,
  })
}

function revealReward() {
  reward.value = drawReward()
  if (reward.value.type === 'coin') coins.value += reward.value.value
  batchRewards.value.push(reward.value)
  logReward(reward.value)
  gameState.value = 'result'
  confetti.value = true
  beep(660, .12)
  setTimeout(() => beep(880, .16), 120)
  setTimeout(() => { confetti.value = false }, 1600)
}

function resolveBatchAll() {
  const n = batchSize.value
  for (let i = 0; i < n; i++) {
    const r = drawReward()
    if (r.type === 'coin') coins.value += r.value
    batchRewards.value.push(r)
    logReward(r)
  }
  gameState.value = 'summary'
  confetti.value = true
  beep(660, .12)
  setTimeout(() => beep(880, .16), 120)
  setTimeout(() => { confetti.value = false }, 1600)
}

function drawReward() {
  const total = rewards.reduce((s, r) => s + r.weight, 0)
  let n = Math.random() * total
  for (const r of rewards) {
    n -= r.weight
    if (n <= 0) return r
  }
  return rewards.at(-1)
}

function playAgain() {
  if (!canPlayBatch.value) { goHome(); return }
  batchSize.value = 1
  batchIndex.value = 0
  batchRewards.value = []
  startRound()
}

function playMoreFromSummary() {
  if (!canPlayBatch.value) { goHome(); return }
  gameState.value = 'batchPick'
}

function goHome() {
  transitionToken++
  stopTimer()
  drive.stop()
  gameState.value = 'idle'
  message.value = ''
}

async function enableMotion() {
  try {
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      const result = await DeviceMotionEvent.requestPermission()
      if (result !== 'granted') return
    }
    window.addEventListener('devicemotion', onMotion, { passive: true })
    motionEnabled.value = true
    message.value = 'เปิด Motion แล้ว — เขย่ามือถือเพื่อกวนไข่ได้เลย'
  } catch {
    message.value = 'อุปกรณ์นี้ไม่รองรับ Motion ใช้ปุ่ม "กวนไข่" แทนได้'
  }
}

function onMotion(e) {
  if (gameState.value !== 'playing') return
  const a = e.accelerationIncludingGravity
  if (!a) return
  const force = Math.abs(a.x || 0) + Math.abs(a.y || 0) + Math.abs(a.z || 0)
  const now = Date.now()
  if (force > 28 && now - lastShakeAt > 850) {
    lastShakeAt = now
    stirEggs()
  }
}

function beep(freq = 320, duration = .05) {
  if (!soundOn.value) return
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = freq
    gain.gain.setValueAtTime(.025, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + duration)
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + duration)
  } catch { /* audio unsupported */ }
}

function stopTimer() { clearInterval(timerId) }

// Home-screen art loads as a handful of large PNGs; show a spinner until
// they're actually ready instead of letting the page pop in piece by piece.
const appReady = ref(false)
const homeScreenImages = [
  gsBatteryBadge, hudTopbar, hexBg, homeTitleFull, cabinetHero,
  btnStart, navHowToPlay, navHistory, navRewards, coinNoteBanner,
]

function preloadImage(src) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = resolve
    img.onerror = resolve
    img.src = src
  })
}

onMounted(() => {
  Promise.all(homeScreenImages.map(preloadImage)).then(() => {
    appReady.value = true
  })
})

onBeforeUnmount(() => {
  transitionToken++
  stopTimer()
  window.removeEventListener('devicemotion', onMotion)
})
</script>

<template>
  <main class="app-shell">
    <section class="game-phone" :class="{ flash: sceneFlash }" :style="{ backgroundImage: `url(${hexBg})` }">
      <transition name="preloader-fade">
        <div v-if="!appReady" class="preloader">
          <span class="preloader-spinner"></span>
          <p class="preloader-label">กำลังโหลด...</p>
        </div>
      </transition>

      <header class="hud">
        <img class="gs-badge" :src="gsBatteryBadge" alt="GS Battery" />
        <div class="hud-topbar">
          <img class="hud-topbar-bg" :src="hudTopbar" alt="" />
          <span class="hud-num hud-num-points">{{ points.toLocaleString() }}</span>
          <span class="hud-num hud-num-coin">{{ coins.toLocaleString() }}</span>
          <button
            class="hud-speaker-hit"
            :class="{ muted: !soundOn }"
            @click="soundOn = !soundOn"
            aria-label="เสียง"
          ></button>
        </div>
      </header>

      <transition name="screen" mode="out-in">
        <LimitReached
          v-if="gameState === 'idle' && isLimitReached"
          key="limit"
          @go-home="goHome"
        />

        <section v-else-if="gameState === 'idle'" key="home" class="screen home-screen">
          <img class="home-title" :src="homeTitleFull" alt="GS Claw Egg คีบไข่ลุ้นรางวัล เกมคีบไข่ลุ้นรางวัลจาก GS BATTERY" />
          <img class="home-cabinet" :src="cabinetHero" alt="" />
          <button class="img-btn home-start-btn" @click="openBatchPick">
            <img :src="btnStart" alt="เริ่มเล่น ใช้ 10 Points" />
          </button>

          <div class="home-nav-row">
            <button class="img-btn" @click="gameState = 'howToPlay'"><img :src="navHowToPlay" alt="วิธีเล่น" /></button>
            <button class="img-btn" @click="gameState = 'history'"><img :src="navHistory" alt="ประวัติการเล่น" /></button>
            <button class="img-btn" @click="gameState = 'rewards'"><img :src="navRewards" alt="แลกรางวัล" /></button>
          </div>
          <p class="home-footer-note">Coin ไม่มีวันหมดอายุ</p>
          <p v-if="message" class="message">{{ message }}</p>
        </section>

        <TicketExchange
          v-else-if="gameState === 'exchange'"
          key="exchange"
          :points="points"
          @back="goHome"
          @confirm="confirmExchange"
        />

        <BatchPicker
          v-else-if="gameState === 'batchPick'"
          key="batchPick"
          :tickets="tickets"
          @back="goHome"
          @confirm="confirmBatch"
        />

        <HowToPlay
          v-else-if="gameState === 'howToPlay'"
          key="howToPlay"
          @close="goHome"
        />

        <CoinRewards
          v-else-if="gameState === 'rewards'"
          key="rewards"
          :coins="coins"
          :catalog="coinCatalog"
          @back="goHome"
          @redeem="redeemCoinReward"
        />

        <HistoryList
          v-else-if="gameState === 'history'"
          key="history"
          :entries="historyLog"
          @back="goHome"
        />

        <GameMachine
          v-else-if="inMachine"
          key="machine"
          :eggs="eggs"
          :claw-x="drive.x.value"
          :claw-anim="clawAnim"
          :target-id="targetEggId"
          :timer="timer"
          :motion-enabled="motionEnabled"
          :controls-enabled="controlsEnabled"
          :message="message"
          :stir-trigger="stirTrigger"
          @back="goHome"
          @toggle-motion="enableMotion"
          @move-start="drive.press"
          @move-end="drive.release"
          @grab="grabEgg(false)"
          @stir="stirEggs"
        />

        <ClawSuccess
          v-else-if="gameState === 'clawSuccess'"
          key="clawSuccess"
          @continue="proceedToOpening"
        />

        <EggOpening
          v-else-if="gameState === 'opening'"
          key="opening"
          :crack-count="crackCount"
          :frames="FRAMES"
          :single-tap="batchSize > 1"
          :message="message"
          :just-completed="justCompleted"
          @tap="tapEgg"
        />

        <BatchSummary
          v-else-if="gameState === 'summary'"
          key="summary"
          :rewards="batchRewards"
          :tickets="tickets"
          @play-more="playMoreFromSummary"
          @go-home="goHome"
        />

        <RewardResult
          v-else
          key="result"
          :reward="reward"
          :reward-image="rewardImage"
          :can-play="canPlayBatch"
          :confetti="confetti"
          @play-again="playAgain"
          @go-home="goHome"
        />
      </transition>
    </section>
  </main>
</template>
