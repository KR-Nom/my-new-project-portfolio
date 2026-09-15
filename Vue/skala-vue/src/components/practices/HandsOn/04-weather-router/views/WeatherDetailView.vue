<script setup>
/**
 * 작성자: 장현진
 * 작성일: 2026-08-27
 * 프로그램 설명: 주소의 cityId와 일치하는 도시 상세 날씨를 출력
 */
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

const route = useRoute()

const weatherList = [
  { id: 'city_01', region: '대한민국 서울특별시', temp: 28, status: '맑음', humidity: 55, wind: 2.5 },
  { id: 'city_02', region: '부산광역시', temp: 24, status: '비', humidity: 82, wind: 1.8 },
  { id: 'city_03', region: '경기도 수원시', temp: 26, status: '구름', humidity: 68, wind: 3.2 },
  { id: 'city_04', region: '인천광역시', temp: 22, status: '흐림', humidity: 71, wind: 3.8 },
  { id: 'city_05', region: '대구광역시', temp: 30, status: '맑음', humidity: 48, wind: 2.1 },
  { id: 'city_06', region: '대전광역시', temp: 23, status: '구름', humidity: 63, wind: 1.7 },
  { id: 'city_07', region: '광주광역시', temp: 27, status: '맑음', humidity: 57, wind: 2.3 },
  { id: 'city_08', region: '제주특별자치도', temp: 21, status: '비', humidity: 86, wind: 5.1 },
]

const selectedWeather = computed(() => {
  return weatherList.find((weather) => weather.id === route.params.cityId)
})
</script>

<template>
  <main class="detail-view">
    <h2>📊 지역별 상세 기상 관측 정보</h2>

    <div v-if="selectedWeather" class="weather-info">
      <p>📍 지정 지역: {{ selectedWeather.region }}</p>
      <p>실시간 기온: {{ selectedWeather.temp }}℃</p>
      <p>기상 현황: {{ selectedWeather.status }}</p>
      <p>대기 습도: {{ selectedWeather.humidity }}%</p>
      <p>현재 풍속: {{ selectedWeather.wind }}m/s</p>
    </div>
    <p v-else>도시 정보를 찾을 수 없습니다.</p>

    <RouterLink class="back-link" to="/">← 메인 대시보드로 돌아가기</RouterLink>
  </main>
</template>

<style scoped>
.detail-view {
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

.weather-info {
  padding: 16px;
  border-radius: 5px;
  background: #f1f3f8;
}

.weather-info p {
  margin: 5px 0;
}

.back-link {
  display: inline-block;
  margin-top: 14px;
  padding: 8px 12px;
  border-radius: 4px;
  color: #ffffff;
  background: #314f67;
  text-decoration: none;
}
</style>
