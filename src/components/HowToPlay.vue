<script setup>
import title from "../assets/ui/how-to-play/title.webp";
import step1 from "../assets/ui/how-to-play/step1.webp";
import step2 from "../assets/ui/how-to-play/step2.webp";
import step3 from "../assets/ui/how-to-play/step3.webp";
import step4 from "../assets/ui/how-to-play/step4.webp";
import step5 from "../assets/ui/how-to-play/step5.webp";
import step6 from "../assets/ui/how-to-play/step6.webp";
import btnConfirm from "../assets/ui/how-to-play/btn-confirm.webp";

defineEmits(["close"]);
</script>

<template>
  <section class="screen scene how-to-play-screen">
    <img class="scene-title" :src="title" alt="วิธีเล่น GS CLAW EGG" />

    <div class="steps">
      <img
        :src="step1"
        alt="1. ใช้ 10 Points เพื่อเล่น 1 ครั้ง แลก Point เป็นสิทธิ์เล่น (10 Point = 1 สิทธิ์)"
      />
      <img
        :src="step2"
        alt="2. เขย่ามือถือก่อนเริ่มคีบ เขย่าเพื่อกวนไข่ สลับตำแหน่งก่อนเริ่มเล่นทุกรอบ"
      />
      <img
        :src="step3"
        alt="3. เลือกจำนวนไข่ที่จะคีบ กด +/- หรือ ทั้งหมด เพื่อเลือกจำนวนสิทธิ์ที่จะใช้คีบพร้อมกัน สูงสุด 11 ฟอง/รอบ"
      />
      <img
        :src="step4"
        alt="4. เลื่อนเครื่องคีบไปทางซ้าย-ขวา เพื่อเลือกตำแหน่งก่อนปล่อยคีบจับไข่"
      />
      <img
        :src="step5"
        alt="5. กดปุ่มคีบ เพื่อคีบไข่ ถ้าเลือกไว้มากกว่า 1 ฟอง ระบบจะคีบฟองที่เหลือให้อัตโนมัติต่อเนื่อง"
      />
      <img :src="step6" alt="6. แตะเพื่อเปิดไข่ ลุ้นรับ Coin หรือรางวัล" />
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
</style>
