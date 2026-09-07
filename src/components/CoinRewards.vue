<script setup>
import GameIcon from './GameIcon.vue'
import coinIcon from '../assets/coin-icon.png'
import title from '../assets/ui/reward-exchange/title.png'
import coinBalanceBanner from '../assets/ui/reward-exchange/coin.png'
import rowActive from '../assets/ui/reward-exchange/row-active.png'
import rowDisabled from '../assets/ui/reward-exchange/row-disabled.png'
import btnHome from '../assets/ui/common/btn-home-blue.png'

const props = defineProps({
  coins: { type: Number, required: true },
  catalog: { type: Array, required: true },
})

const emit = defineEmits(['back', 'redeem'])
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
          :class="{ disabled: coins < item.cost }"
          :disabled="coins < item.cost"
          @click="emit('redeem', item)"
        >
          <img class="row-bg" :src="coins < item.cost ? rowDisabled : rowActive" alt="" />
          <span class="row-thumb"><img :src="item.image" :alt="item.label" /></span>
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

    <button class="img-btn back-btn" @click="emit('back')"><img :src="btnHome" alt="กลับหน้าหลัก" /></button>
  </section>
</template>

<style scoped>
.rewards-screen { align-items: stretch; justify-content: flex-start; }
.coin-inline { width: 15px; height: 15px; object-fit: contain; }

.coin-balance { position: relative; width: min(320px, 86vw); margin: 4px auto 16px; }
.coin-balance-bg { width: 100%; height: auto; display: block; }
.coin-balance-num {
  position: absolute; left: 56.7%; width: 41%; top: 0; height: 100%;
  display: flex; align-items: center; justify-content: flex-start;
  font-weight: 900; color: #ffd739; font-size: clamp(16px, 5.5vw, 26px);
  text-shadow: 0 2px 4px rgba(0,0,0,.4);
  font-variant-numeric: tabular-nums;
}

.reward-list { list-style: none; margin: 0 0 18px; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.reward-row {
  position: relative; width: 100%; padding: 0; border: 0; background: transparent; cursor: pointer;
  display: block; -webkit-tap-highlight-color: transparent;
}
.reward-row:active:not(.disabled) { transform: scale(.98); }
.reward-row.disabled { cursor: not-allowed; }
.row-bg { width: 100%; height: auto; display: block; }
.row-thumb {
  position: absolute; left: 3%; top: 5%; width: 23%; height: 90%;
  display: grid; place-items: center;
}
.row-thumb img { width: 82%; height: 82%; object-fit: contain; filter: drop-shadow(0 4px 8px rgba(0,0,0,.35)); }
.row-text {
  position: absolute; left: 30%; top: 50%; width: 40%; transform: translateY(-50%);
  display: flex; flex-direction: column; align-items: flex-start; gap: 3px; text-align: left;
}
.row-label { font-size: clamp(13px, 4vw, 16px); font-weight: 800; color: #fff; line-height: 1.2; }
.row-cost { font-size: clamp(13px, 4vw, 16px); font-weight: 800; display: flex; align-items: center; gap: 5px; }
.row-cost .coin-inline { width: 30px; height: 30px; }
.row-cost-num { color: #fff; font-size: 24px; }
.row-cost-label { color: #ffb84d; font-style: italic; font-weight: 900; font-size: clamp(13px, 4vw, 16px); }

.back-btn { width: min(300px, 80vw); margin-top: auto; align-self: center; }
</style>
