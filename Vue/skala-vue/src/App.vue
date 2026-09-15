<script setup>
/**
 * 작성자: 장현진
 * 작성일: 2026-08-27 (목)
 * 변경사항: Element Plus 기반의 과제 7 대시보드 레이아웃 적용
 * 프로그램 설명: 날씨 서비스의 공통 헤더·메뉴·단위 설정과 현재 View를 출력
 */
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="weather-app">
    <header class="app-header">
      <div class="brand">
        <span class="brand-icon">🌤️</span>
        <div>
          <h1>오늘의 날씨</h1>
          <p>실시간 날씨와 대기질을 한눈에</p>
        </div>
      </div>

      <div class="header-actions">
        <nav aria-label="주요 메뉴">
          <RouterLink to="/">날씨</RouterLink>
          <RouterLink to="/favorites">즐겨찾기</RouterLink>
          <RouterLink to="/about">서비스 소개</RouterLink>
        </nav>
      </div>
    </header>

    <div class="view-area"><RouterView /></div>
  </div>
</template>

<style scoped>
.weather-app {
  width: min(100% - 40px, 1180px);
  margin: 22px auto 40px;
  color: #263746;
}
.app-header {
  display: flex;
  gap: 24px;
  align-items: center;
  justify-content: space-between;
  padding: 20px 28px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 18px;
  background: linear-gradient(110deg, #168bd0, #0874bd);
  box-shadow: 0 14px 34px rgba(13, 104, 164, 0.25);
}
.brand {
  display: flex;
  gap: 12px;
  align-items: center;
}
.brand-icon {
  font-size: 34px;
}
.brand h1 {
  margin: 0;
  color: #fff;
  font-size: clamp(21px, 3vw, 28px);
  font-weight: 800;
}
.brand p {
  margin: 3px 0 0;
  color: rgba(255, 255, 255, 0.76);
  font-size: 13px;
}
.header-actions,
nav {
  display: flex;
  gap: 8px;
  align-items: center;
}
nav a {
  padding: 9px 13px;
  border-radius: 999px;
  color: rgba(255, 255, 255, 0.82);
  font-weight: 700;
  text-decoration: none;
}
nav a:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.12);
}
nav a.router-link-exact-active {
  color: #0874bd;
  background: #fff;
}
.view-area {
  margin-top: 22px;
}
@media (max-width: 800px) {
  .weather-app {
    width: min(100% - 20px, 1180px);
    margin: 10px auto;
  }
  .app-header,
  .header-actions {
    align-items: stretch;
    flex-direction: column;
  }
  nav {
    flex-wrap: wrap;
    font-size: 13px;
  }
}
</style>
