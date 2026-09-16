<script setup>
import title from "../assets/ui/how-to-play/title.webp";
import step1 from "../assets/ui/how-to-play/step1.webp";
import step2 from "../assets/ui/how-to-play/step2.webp";
import step3 from "../assets/ui/how-to-play/step3.webp";
import stepAuto from "../assets/ui/how-to-play/step-auto.webp";
import step4 from "../assets/ui/how-to-play/step4.webp";
import step5 from "../assets/ui/how-to-play/step5.webp";
import btnConfirm from "../assets/ui/how-to-play/btn-confirm.webp";

defineEmits(["close"]);
</script>

<template>
  <section class="screen scene how-to-play-screen">
    <img class="scene-title" :src="title" alt="วิธีเล่น GS CLAW EGG" />

    <div class="steps">
      <img
        :src="step1"
        alt="1. ใช้ 10 Point เพื่อคีบไข่ 1 ฟอง แลก 10 ฟอง ได้โบนัส +1 ฟอง"
      />
      <img
        :src="step2"
        alt="2. เขย่ามือถือก่อนเริ่มคีบ เขย่าเพื่อกวนไข่ สลับตำแหน่งก่อนเริ่มเล่นทุกรอบ"
      />
      <img
        :src="stepAuto"
        alt="หรือ กดปุ่ม AUTO ให้ระบบเล่นให้อัตโนมัติ คีบ-เปิดไข่-รับรางวัลต่อเนื่องให้เองจนกว่าจะกดปิดหรือสิทธิ์หมด"
      />
      <img
        :src="step3"
        alt="3. เลื่อนเครื่องคีบไปทางซ้าย-ขวา เพื่อเลือกตำแหน่งก่อนปล่อยคีบจับไข่"
      />
      <img
        :src="step4"
        alt="4. กดปุ่มคีบ เพื่อคีบไข่ ถ้าเลือกไข่มากกว่า 1 ฟอง ระบบจะคีบฟองที่เหลือให้ต่อเนื่อง"
      />
      <img :src="step5" alt="5. แตะเพื่อเปิดไข่ ลุ้นรับ Coin หรือรางวัล" />
    </div>

    <div class="how-to-play-actions">
      <button class="img-btn" @click="$emit('close')">
        <img :src="btnConfirm" alt="เข้าใจแล้ว" />
      </button>
    </div>
  </section>
</template>

<style scoped>
.how-to-play-screen {
  justify-content: flex-start;
}
.steps {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin-bottom: 10px;
}
.steps img {
  width: 100%;
  height: auto;
  display: block;
}
.how-to-play-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 15px;
}

/* @container, not @media — see the .game-phone comment in style.css: this
   keys off the phone frame's own rendered width instead of the raw browser
   viewport, which stays reliable in landscape or on a wide unfolded
   foldable where the two would otherwise disagree. */
@container (max-width: 399px) {
  .scene-title {
    width: 90%;
    margin-bottom: 5px;
  }
  .steps {
    gap: 3px;
    align-items: center;
    margin-bottom: 0px;
  }
  .steps img {
    width: 95%;
  }
  .img-btn img {
    width: 85%;
  }
}
</style>
