<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <main class="not-found">
    <span class="error-code">404 ERROR</span>
    <p class="icon">⛈️</p>
    <h2>페이지를 찾을 수 없습니다.</h2>
    <p>요청하신 주소가 존재하지 않거나 아직 개발되지 않았습니다.</p>
    <RouterLink to="/">오늘의 날씨로 돌아가기</RouterLink>
  </main>
</template>

<style scoped>
.not-found {
  position: relative;
  min-height: 520px;
  display: flex;
  margin: 0 auto;
  padding: 50px 24px;
  overflow: hidden;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  border: 1px solid rgba(255,255,255,.24);
  border-radius: 22px;
  color: #fff;
  background:
    radial-gradient(circle at 72% 22%, rgba(255,255,255,.13), transparent 24%),
    linear-gradient(145deg, #183d5c, #246f98 58%, #3d91b4);
  text-align: center;
  box-shadow: 0 22px 50px rgba(24,61,92,.32);
}

.not-found::before {
  position: absolute;
  inset: 0;
  content: '';
  opacity: .16;
  background: repeating-linear-gradient(115deg, transparent 0 28px, #fff 29px 30px, transparent 31px 54px);
  transform: skewX(-12deg);
}

.not-found > * {
  position: relative;
  z-index: 1;
}

.error-code {
  padding: 6px 12px;
  border: 1px solid rgba(255,255,255,.45);
  border-radius: 999px;
  color: rgba(255,255,255,.88);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 2px;
}

.icon {
  margin: 0;
  font-size: 72px;
  filter: drop-shadow(0 10px 18px rgba(0,0,0,.2));
}

.not-found h2 { margin: 10px 0 6px; color: #fff; font-size: clamp(28px, 5vw, 42px); font-weight: 800; }
.not-found > p:not(.icon) {
  margin: 0;
  color: rgba(255,255,255,.78);
}

a {
  display: inline-block;
  margin-top: 24px;
  padding: 11px 18px;
  border-radius: 999px;
  color: #1b5d83;
  background: #fff;
  box-shadow: 0 8px 20px rgba(9,48,74,.22);
  font-weight: 800;
  text-decoration: none;
}
</style>
