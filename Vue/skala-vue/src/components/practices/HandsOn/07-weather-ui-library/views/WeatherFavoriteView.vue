<script setup>
/**
 * 작성자: 장현진
 * 작성일: 2026-08-27
 * 프로그램 설명: 메인 화면에서 선택한 즐겨찾기 도시를 별도 View에 출력
 */
import { computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import WeatherCard from '../components/WeatherCard.vue'
import { favoriteCityIds, toggleFavorite, weatherList } from '../data/weatherData'

const router = useRouter()

const favoriteWeatherList = computed(() => {
  return weatherList.value.filter((weather) => favoriteCityIds.value.includes(weather.id))
})

const showDetail = (weather) => router.push(`/weather/${weather.id}`)

</script>

<template>
  <main class="favorite-view">
    <section class="favorite-hero">
      <div><span>MY WEATHER</span><h2>즐겨찾기 도시</h2></div>
      <p>자주 확인하는 도시의 날씨를 한곳에서 빠르게 확인하세요.</p>
    </section>

    <ul v-if="favoriteWeatherList.length" class="favorite-grid">
      <WeatherCard
        v-for="weather in favoriteWeatherList"
        :key="weather.id"
        :weather="weather"
        is-favorite
        @click-detail="showDetail"
        @toggle-favorite="toggleFavorite"
      />
    </ul>
    <section v-else class="empty-favorite">
      <div class="empty-star">☆</div>
      <h3>아직 즐겨찾기한 도시가 없습니다</h3>
      <p>날씨 화면에서 노란색 별을 눌러 자주 보는 도시를 추가해 보세요.</p>
    </section>

    <RouterLink class="home-link" to="/">← 전체 도시 날씨 보기</RouterLink>
  </main>
</template>

<style scoped>
.favorite-view { display: grid; gap: 18px; }
.favorite-hero { display: flex; align-items: end; justify-content: space-between; padding: 28px; border: 1px solid rgba(255,255,255,.75); border-radius: 20px; background: linear-gradient(120deg, rgba(255,255,255,.92), rgba(225,245,253,.82)); box-shadow: 0 16px 38px rgba(38,105,146,.12); backdrop-filter: blur(12px); }
.favorite-hero span { color: #1687c0; font-size: 12px; font-weight: 800; letter-spacing: 1px; }
.favorite-hero h2 { margin: 4px 0 0; color: #173f57; font-size: 30px; }
.favorite-hero p { margin: 0; color: #678391; }
.favorite-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin: 0; padding: 0; list-style: none; }
.empty-favorite { padding: 55px 24px; border: 1px solid rgba(255,255,255,.8); border-radius: 20px; background: rgba(255,255,255,.86); text-align: center; backdrop-filter: blur(10px); }
.empty-star { color: #f2bb18; font-size: 58px; line-height: 1; }
.empty-favorite h3 { margin: 12px 0 6px; color: #234b61; }
.empty-favorite p { margin: 0; color: #728b97; }
.home-link { justify-self: start; padding: 10px 16px; border-radius: 999px; color: #fff; background: #1488c8; font-weight: 700; text-decoration: none; }
@media (max-width: 760px) { .favorite-grid { grid-template-columns: 1fr; } .favorite-hero { align-items: flex-start; flex-direction: column; gap: 10px; } }
</style>
