<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <main class="about-view">
    <section class="about-hero">
      <span>ABOUT TODAY'S WEATHER</span>
      <h2>하루에 필요한 날씨를<br />한눈에 전해드려요</h2>
      <p>복잡한 숫자보다 지금 필요한 정보를 쉽고 빠르게 확인할 수 있는 도시 날씨 서비스입니다.</p>
      <RouterLink to="/">오늘의 날씨 확인하기 →</RouterLink>
    </section>

    <section class="service-section">
      <div class="section-title"><span>WHAT WE OFFER</span><h3>오늘의 날씨가 제공하는 기능</h3></div>
      <div class="service-grid">
        <article><b>01</b><div class="service-icon">🌤️</div><h4>실시간 도시 날씨</h4><p>서울부터 제주까지 주요 8개 도시의 현재 기온과 날씨 상태를 보여드립니다.</p></article>
        <article><b>02</b><div class="service-icon">🕒</div><h4>3시간 단기 예보</h4><p>선택한 도시의 가까운 시간대별 기온과 날씨 변화를 미리 확인할 수 있습니다.</p></article>
        <article><b>03</b><div class="service-icon">🌿</div><h4>대기질 정보</h4><p>미세먼지와 초미세먼지, 대기질 지수를 함께 제공해 외출 준비를 도와드립니다.</p></article>
        <article><b>04</b><div class="service-icon">⭐</div><h4>나만의 즐겨찾기</h4><p>자주 보는 도시를 저장하고 원하는 도시의 날씨만 모아서 확인할 수 있습니다.</p></article>
      </div>
    </section>

  </main>
</template>

<style scoped>
.about-view { display: grid; gap: 18px; }
.about-hero { padding: clamp(32px, 6vw, 64px); border: 1px solid rgba(255,255,255,.75); border-radius: 24px; color: #fff; background: linear-gradient(120deg, rgba(10,121,191,.94), rgba(71,177,223,.74)); box-shadow: 0 18px 42px rgba(23,108,161,.2); }
.about-hero > span, .section-title span { font-size: 12px; font-weight: 800; letter-spacing: 1px; }
.about-hero h2 { margin: 12px 0; font-size: clamp(32px, 5vw, 52px); line-height: 1.18; }
.about-hero p { max-width: 620px; margin: 0 0 24px; color: rgba(255,255,255,.84); font-size: 16px; }
.about-hero a { display: inline-block; padding: 11px 17px; border-radius: 999px; color: #0876b8; background: #fff; font-weight: 800; text-decoration: none; }
.service-section { padding: clamp(24px, 4vw, 38px); border: 1px solid rgba(255,255,255,.75); border-radius: 22px; background: rgba(255,255,255,.88); backdrop-filter: blur(12px); }
.section-title span { color: #1688c1; }
.section-title h3 { margin: 4px 0 20px; color: #173f57; font-size: 25px; }
.service-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
.service-grid article { position: relative; padding: 24px; overflow: hidden; border: 1px solid #cfe3ed; border-radius: 18px; background: linear-gradient(145deg, #fff, #eaf6fb); box-shadow: 0 8px 20px rgba(31,94,129,.11); }
.service-grid article > b { position: absolute; top: 14px; right: 17px; color: #d4eaf4; font-size: 28px; }
.service-icon { font-size: 30px; }
.service-grid h4 { margin: 12px 0 6px; color: #204b61; font-size: 18px; }
.service-grid p { margin: 0; color: #6a8491; line-height: 1.7; }
@media (max-width: 700px) { .service-grid { grid-template-columns: 1fr; } }
</style>
