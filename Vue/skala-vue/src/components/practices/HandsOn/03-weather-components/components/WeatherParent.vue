<script setup>
/**
 * 작성자: 장현진
 * 작성일: 2026-08-27
 * 변경사항: 과제 2 기능을 유지하면서 화면을 역할별 컴포넌트로 분리
 * 프로그램 설명: 날씨 반응형 상태를 관리하고 자식 컴포넌트와 props/emits로 통신
 * 실행 방법: npm run dev 실행 후 과제 3 화면 확인
 */
import { computed, ref, watch, watchEffect } from 'vue'
import BaseDashboardCard from './BaseDashboardCard.vue'
import FavoriteCityList from './FavoriteCityList.vue'
import SearchBar from './SearchBar.vue'
import WeatherCard from './WeatherCard.vue'

// 모든 반응형 원본 데이터는 부모 컴포넌트에서 관리
const weatherList = ref([
  { id: 'city_01', name: '서울', temp: 28, status: '맑음' },
  { id: 'city_02', name: '부산', temp: 24, status: '비' },
  { id: 'city_03', name: '수원', temp: 26, status: '구름' },
  { id: 'city_04', name: '인천', temp: 22, status: '흐림' },
  { id: 'city_05', name: '대구', temp: 30, status: '맑음' },
  { id: 'city_06', name: '대전', temp: 23, status: '구름' },
  { id: 'city_07', name: '광주', temp: 27, status: '맑음' },
  { id: 'city_08', name: '제주', temp: 21, status: '비' },
])
const searchQuery = ref('')
const selectedCityInfo = ref(null)
const favoriteCityIds = ref([])

const filteredWeatherList = computed(() => {
  if (searchQuery.value === '') {
    return weatherList.value
  }

  return weatherList.value.filter((weather) => weather.name.includes(searchQuery.value))
})

const favoriteWeatherList = computed(() => {
  return weatherList.value.filter((weather) => favoriteCityIds.value.includes(weather.id))
})

// SearchBar의 update-query 이벤트로 전달된 검색어 반영
const updateSearchQuery = (query) => {
  searchQuery.value = query
}

// WeatherCard의 select-card 이벤트로 전달된 객체를 얕은 복사
const selectCity = (weather) => {
  selectedCityInfo.value = { ...weather }
}

const showDetail = (weather) => {
  window.alert(`${weather.name}의 현재 날씨는 [${weather.status}] 상태입니다.`)
}

const toggleFavorite = (weather) => {
  const isFavorite = favoriteCityIds.value.includes(weather.id)

  if (isFavorite) {
    favoriteCityIds.value = favoriteCityIds.value.filter((cityId) => cityId !== weather.id)
    return
  }

  favoriteCityIds.value = [...favoriteCityIds.value, weather.id]
}

watch(selectedCityInfo, (newCity, oldCity) => {
  const oldCityName = oldCity?.name ?? '선택 없음'
  console.log(`[watch 감지] 선택 도시 변경: ${oldCityName} → ${newCity.name}`)
})

watchEffect(() => {
  const cityNames = filteredWeatherList.value.map((weather) => weather.name).join(', ')
  console.log(
    `[watchEffect 자동 호출] 검색어 "${searchQuery.value}": ${filteredWeatherList.value.length}개 (${cityNames || '검색 결과 없음'})`,
  )
})

watch(favoriteCityIds, (newIds, oldIds) => {
  console.log(`[즐겨찾기 watch] ${oldIds.length}개 → ${newIds.length}개`)
})
</script>

<template>
  <main class="weather-parent">
    <h2>과제 3: 날씨 (컴포넌트)</h2>

    <BaseDashboardCard icon="🔍" title="도시 검색 (한글 즉시 동기화)">
      <SearchBar :query="searchQuery" @update-query="updateSearchQuery" />
    </BaseDashboardCard>

    <BaseDashboardCard icon="🗺️" title="지역별 날씨 현황">
      <ul v-if="filteredWeatherList.length > 0" class="weather-list">
        <WeatherCard
          v-for="weather in filteredWeatherList"
          :key="weather.id"
          :weather="weather"
          :is-favorite="favoriteCityIds.includes(weather.id)"
          @select-card="selectCity"
          @click-detail="showDetail"
          @toggle-favorite="toggleFavorite"
        />
      </ul>
      <p v-else class="no-result-message">검색 결과와 일치하는 도시가 없습니다.</p>
    </BaseDashboardCard>

    <p v-if="selectedCityInfo" class="selected-message">
      {{ selectedCityInfo.name }}이 선택되었습니다.
    </p>
    <p v-else class="selected-message">카드를 클릭하거나 검색해 보세요.</p>

    <BaseDashboardCard icon="⭐" :title="`즐겨찾기 도시 (${favoriteWeatherList.length})`">
      <FavoriteCityList
        :weather-list="favoriteWeatherList"
        @toggle-favorite="toggleFavorite"
      />
    </BaseDashboardCard>
  </main>
</template>

<style scoped>
.weather-parent {
  width: 100%;
  max-width: 1200px;
  margin: clamp(12px, 3vh, 30px) auto;
  padding: clamp(18px, 3vw, 36px);
  color: #263746;
  background: #f4f8fb;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(38, 55, 70, 0.1);
}

h2 {
  margin: 0 0 12px;
  color: #263746;
  font-size: clamp(20px, 2.2vw, 28px);
  font-weight: 700;
}

.weather-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 0;
  list-style: none;
}

.selected-message {
  display: block;
  width: 100%;
  margin: 18px 0 0;
  padding: 11px 16px;
  border: 1px solid #bfe6c7;
  border-radius: 6px;
  color: #25823b;
  background: #e1f5e5;
  font-size: clamp(16px, 1.5vw, 19px);
  font-weight: 700;
  text-align: center;
}

.no-result-message {
  margin: 0;
  padding: 18px;
  border: 1px dashed #c7d1d8;
  border-radius: 8px;
  color: #657783;
  background: #ffffff;
  text-align: center;
}

@media (max-width: 640px) {
  .weather-parent {
    margin: 12px auto;
    padding: 16px;
  }
}
</style>
