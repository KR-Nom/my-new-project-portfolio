<script setup>
/**
 * 작성자: 장현진
 * 작성일: 2026-08-27
 * 프로그램 설명: 제목과 slot 영역을 제공하는 날씨 대시보드 공통 카드
 */
defineProps({
  icon: {
    type: String,
    default: '',
  },
  title: {
    type: String,
    required: true,
  },
})
</script>

<template>
  <section class="dashboard-card">
    <h3><span aria-hidden="true">{{ icon }}</span> {{ title }}</h3>
    <slot />
  </section>
</template>

<style scoped>
.dashboard-card {
  margin-top: 18px;
  padding: clamp(16px, 2vw, 22px);
  border: 1px solid #dbe3e8;
  border-radius: 10px;
  background: #f8fafb;
}

h3 {
  margin: 0 0 12px;
  color: #486276;
  font-size: clamp(15px, 1.5vw, 18px);
  font-weight: 700;
}
</style>
