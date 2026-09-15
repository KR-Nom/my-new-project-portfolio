<script setup>
/**
 * 작성자: 장현진
 * 작성일: 2026-08-27 (목)
 * 변경사항: Element Plus 기반의 반응형 날씨 대시보드로 화면 재구성
 * 프로그램 설명: 실제 날씨를 검색하고 카드형 대시보드로 출력
 */
import { computed, onMounted, ref, watch, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import { fetchCurrentWeather } from '../api/weatherApi'
import SearchBar from '../components/SearchBar.vue'
import UnitToggler from '../components/UnitToggler.vue'
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
      weatherMain: apiWeatherList[index].weather[0].main,
      icon: apiWeatherList[index].weather[0].icon,
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
  <main class="dashboard">
    <section class="hero-panel">
      <div>
        <el-tag round effect="dark">LIVE WEATHER</el-tag>
        <h2>오늘의 도시 날씨를 확인하세요</h2>
        <p>실시간 기온부터 단기 예보와 대기질까지 한 화면에서 확인할 수 있습니다.</p>
      </div>
      <SearchBar :query="searchQuery" @update-query="updateSearchQuery" />
    </section>

    <el-alert class="selected-message" type="success" :closable="false" center show-icon>
      <template #title>
        {{ selectedCityInfo ? `${selectedCityInfo.name} 날씨 카드를 선택했습니다.` : '도시를 검색하거나 날씨 카드를 선택해 보세요.' }}
      </template>
    </el-alert>

    <section class="weather-section">
      <div class="section-heading">
        <div><span>대한민국 주요 도시</span><h2>실시간 날씨</h2></div>
        <div class="heading-actions">
          <UnitToggler />
        </div>
      </div>

      <el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" />
      <el-skeleton v-if="isLoading" :rows="4" animated />

      <ul v-else-if="filteredWeatherList.length" class="weather-list">
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
      <el-empty v-else description="검색 결과와 일치하는 도시가 없습니다." />

      <WeatherCard
        v-if="!isLoading && searchQuery === ''"
        :weather="notFoundExample"
        :show-favorite="false"
        @select-card="selectCity"
        @click-detail="showDetail"
      />
    </section>
  </main>
</template>

<style scoped>
.dashboard { display: grid; gap: 20px; }
.hero-panel { position: relative; display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 32px; align-items: center; overflow: hidden; padding: clamp(24px, 5vw, 52px); border: 1px solid rgba(255,255,255,.7); border-radius: 22px; color: #fff; background: linear-gradient(120deg, rgba(10,125,194,.88), rgba(75,181,226,.68)); box-shadow: 0 18px 42px rgba(24,111,165,.2); backdrop-filter: blur(10px); }
.hero-panel::before { position: absolute; top: -90px; right: 12%; width: 260px; height: 160px; border-radius: 50%; content: ''; background: rgba(255,255,255,.22); filter: blur(24px); }
.hero-panel > * { position: relative; z-index: 1; }
.hero-panel h2 { margin: 14px 0 8px; font-size: clamp(26px, 4vw, 42px); line-height: 1.15; }
.hero-panel p { margin: 0; color: rgba(255, 255, 255, 0.88); }
.weather-section { padding: clamp(18px, 3vw, 30px); border: 1px solid rgba(255,255,255,.72); border-radius: 20px; background: rgba(255,255,255,.88); box-shadow: 0 18px 45px rgba(48,112,151,.1); backdrop-filter: blur(12px); }
.section-heading { display: flex; align-items: end; justify-content: space-between; margin-bottom: 18px; }
.section-heading span { color: #67a2b5; font-size: 13px; font-weight: 700; }
.section-heading h2 { margin: 3px 0 0; color: #183b4c; }
.heading-actions { display: flex; gap: 10px; align-items: center; }
.weather-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.weather-list:has(.weather-card:hover) .weather-card:not(:hover) {
  opacity: .72;
  transform: scale(.965);
  filter: saturate(.7);
}

.selected-message {
  --el-alert-padding: 16px 20px;
  border: 1px solid #bde8cf;
  border-radius: 16px;
  background: linear-gradient(90deg, #e9f9ef, #f4fcf7);
  box-shadow: 0 8px 24px rgba(45, 139, 91, .08);
}
.selected-message :deep(.el-alert__title) {
  color: #26764a;
  font-size: 16px;
  font-weight: 800;
}
@media (max-width: 760px) {
  .hero-panel, .weather-list { grid-template-columns: 1fr; }
  .section-heading { align-items: flex-start; flex-direction: column; gap: 12px; }
  .heading-actions { width: 100%; justify-content: space-between; }
  .weather-list:has(.weather-card:hover) .weather-card:not(:hover) {
    opacity: 1;
    transform: none;
    filter: none;
  }
}
</style>
