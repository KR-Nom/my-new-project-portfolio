<script setup>
/**
 * 작성자: 장현진
 * 작성일: 2026-08-27
 * 프로그램 설명: 메인 화면에서 선택한 즐겨찾기 도시를 별도 View에 출력
 */
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import FavoriteCityList from '../../03-weather-components/components/FavoriteCityList.vue'
import { favoriteCityIds, toggleFavorite, weatherList } from '../data/weatherData'

const favoriteWeatherList = computed(() => {
  return weatherList.value.filter((weather) => favoriteCityIds.value.includes(weather.id))
})
</script>

<template>
  <main class="favorite-view">
    <h2>⭐ 즐겨찾기 도시</h2>
    <FavoriteCityList
      :weather-list="favoriteWeatherList"
      @toggle-favorite="toggleFavorite"
    />
    <RouterLink to="/">날씨 대시보드로 돌아가기</RouterLink>
  </main>
</template>

<style scoped>
.favorite-view {
  padding: 18px;
  border: 1px solid #e1e7eb;
  border-radius: 6px;
}

h2 {
  margin: 0 0 18px;
  padding-bottom: 12px;
  border-bottom: 1px solid #dbe3e8;
  font-size: 19px;
}

a {
  display: inline-block;
  margin-top: 18px;
}
</style>
