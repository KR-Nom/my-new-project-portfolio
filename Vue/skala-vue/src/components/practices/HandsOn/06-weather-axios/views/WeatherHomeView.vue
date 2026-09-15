<script setup>
/**
 * 작성자: 장현진
 * 작성일: 2026-08-27 (목)
 * 변경사항: 8개 도시 카드에 OpenWeatherMap의 실제 날씨 데이터 적용
 * 프로그램 설명: 실제 날씨를 불러와 검색·선택·즐겨찾기·상세 이동을 처리하는 메인 화면
 */
import { computed, onMounted, ref, watch, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import BaseDashboardCard from '../../03-weather-components/components/BaseDashboardCard.vue'
import SearchBar from '../../03-weather-components/components/SearchBar.vue'
import { fetchCurrentWeather } from '../api/weatherApi'
import WeatherCard from '../components/WeatherCard.vue'
import { favoriteCityIds, toggleFavorite, weatherList } from '../data/weatherData'

const router = useRouter()

const searchQuery = ref('')
const selectedCityInfo = ref(null)
const isLoading = ref(false)
const errorMessage = ref('')
const notFoundExample = { id: 'skala-view', name: '스칼라뷰', temp: null, status: '정보 없음' }

const loadWeatherList = async () => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const apiWeatherList = await Promise.all(
      weatherList.value.map((weather) => fetchCurrentWeather(weather.lat, weather.lon)),
    )

    weatherList.value = weatherList.value.map((weather, index) => ({
      ...weather,
      temp: Math.round(apiWeatherList[index].main.temp),
      status: apiWeatherList[index].weather[0].description,
    }))
  } catch (error) {
    console.error('도시 날씨 목록 요청 실패:', error)
    errorMessage.value = '실시간 날씨를 가져오지 못해 기존 데이터를 표시합니다.'
  } finally {
    isLoading.value = false
  }
}

onMounted(loadWeatherList)

const filteredWeatherList = computed(() => {
  if (searchQuery.value === '') {
    return weatherList.value
  }

  return weatherList.value.filter((weather) => weather.name.includes(searchQuery.value))
})

const updateSearchQuery = (query) => {
  searchQuery.value = query
}

const selectCity = (weather) => {
  selectedCityInfo.value = { ...weather }
}

const showDetail = (weather) => {
  if (weather.id === 'skala-view') {
    router.push('/skala-view')
    return
  }

  router.push(`/weather/${weather.id}`)
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
  <main>
    <BaseDashboardCard icon="🔍" title="도시 검색">
      <SearchBar :query="searchQuery" @update-query="updateSearchQuery" />
    </BaseDashboardCard>

    <BaseDashboardCard icon="🗺️" title="지역별 날씨 현황">
      <p v-if="isLoading" class="api-message">8개 도시의 실시간 날씨를 불러오는 중입니다...</p>
      <p v-else-if="errorMessage" class="api-message error">{{ errorMessage }}</p>

      <ul v-if="filteredWeatherList.length" class="weather-list">
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

      <WeatherCard
        v-if="searchQuery === ''"
        :weather="notFoundExample"
        :show-favorite="false"
        @select-card="selectCity"
        @click-detail="showDetail"
      />
    </BaseDashboardCard>

    <p class="selected-message">
      {{ selectedCityInfo ? `${selectedCityInfo.name}이 선택되었습니다.` : '카드를 클릭하거나 검색해 보세요.' }}
    </p>

  </main>
</template>

<style scoped>
.weather-list {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.selected-message {
  margin: 12px 0 0;
  padding: 12px;
  border-radius: 5px;
  color: #25823b;
  background: #e1f5e5;
  font-weight: 700;
  text-align: center;
}

.no-result-message {
  margin: 0;
  padding: 16px;
  text-align: center;
}

.api-message {
  margin: 0 0 12px;
  padding: 10px;
  border-radius: 5px;
  background: #eef7fc;
  text-align: center;
}

.api-message.error {
  color: #a63131;
  background: #fff0f0;
}
</style>
