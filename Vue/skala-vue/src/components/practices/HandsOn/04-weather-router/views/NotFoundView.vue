<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <main class="not-found">
    <p class="icon">🌞❓</p>
    <h2>페이지를 찾을 수 없습니다.</h2>
    <p>요청하신 주소가 존재하지 않거나 아직 개발되지 않았습니다.</p>
    <RouterLink to="/">날씨 메인으로 이동</RouterLink>
  </main>
</template>

<style scoped>
.not-found {
  margin: 70px auto;
  padding: 36px 20px;
  border: 1px solid #e1e7eb;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(38, 55, 70, 0.12);
}

.icon {
  margin: 0;
  font-size: 54px;
}

.not-found > p:not(.icon) {
  color: #73818b;
}

a {
  display: inline-block;
  margin-top: 14px;
  padding: 9px 15px;
  border-radius: 20px;
  color: #ffffff;
  background: #168ee2;
  text-decoration: none;
}
</style>
