<script setup>
import panelBg from "../assets/ui/All-eggs-caught/panel-bg.webp";
import mascotEggs from "../assets/ui/All-eggs-caught/mascot-eggs.webp";
import titleAllCaught from "../assets/ui/All-eggs-caught/title-all-caught.webp";
import subtitleGoRedeem from "../assets/ui/All-eggs-caught/subtitle-go-redeem.webp";
import btnGoRedeem from "../assets/ui/All-eggs-caught/btn-go-redeem.webp";

defineProps({
  // Set when resolveSessionBatch's one real play_claw call for this session
  // failed or ran into a stock shortage — this popup otherwise shows the
  // exact same "ครบแล้ว!" art either way, so without this a failure here is
  // completely invisible (the ticket count underneath can be left showing
  // its last pre-spend value too — see App.vue's resolveSessionBatch catch).
  note: { type: String, default: "" },
});

defineEmits(["confirm"]);
</script>

<template>
  <div class="popup-backdrop">
    <div class="popup-panel">
      <img class="popup-panel-bg" :src="panelBg" alt="" />
      <div class="popup-content">
        <img class="popup-mascot" :src="mascotEggs" alt="" />
        <img
          class="popup-title"
          :src="titleAllCaught"
          alt="คุณคีบไข่ครบแล้ว!"
        />
        <img
          class="popup-subtitle"
          :src="subtitleGoRedeem"
          alt="กดที่ปุ่ม เพื่อไปหน้าแลกของรางวัล"
        />
        <button class="img-btn popup-btn" @click="$emit('confirm')">
          <img :src="btnGoRedeem" alt="ไปหน้าแลกของรางวัล" />
        </button>
        <p v-if="note" class="stock-note">{{ note }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.popup-backdrop {
  position: absolute;
  inset: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(2, 8, 20, 0.72);
}
.popup-panel {
  position: relative;
  width: min(340px, 100%);
  aspect-ratio: 583 / 679;
}
.popup-panel-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: fill;
}
.popup-content {
  position: relative;
  z-index: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 9% 10%;
  text-align: center;
}
.popup-mascot {
  width: 100%;
  height: auto;
}
.popup-title {
  width: 100%;
  height: auto;
  margin-top: -4%;
}
.popup-subtitle {
  width: 87%;
  height: auto;
  margin-top: -3%;
}
.popup-btn {
  width: 90%;
  margin-top: 4%;
}
.stock-note {
  margin: 8px 0 0;
  padding: 6px 10px;
  color: #ffcf8f;
  background: rgba(255, 169, 0, 0.12);
  border: 1px solid rgba(255, 169, 0, 0.4);
  border-radius: 10px;
  font-size: 10.5px;
  line-height: 1.4;
}

.img-btn img {
  width: 100%;
  height: auto;
  display: block;
  margin-bottom: 5%;
  filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.35));
  transition:
    transform 0.14s ease,
    filter 0.14s ease;
}
</style>
