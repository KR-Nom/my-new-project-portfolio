<script setup>
/**
 * 작성자: 장현진
 * 작성일: 2026-08-27 (목)
 * 변경사항: Open-Meteo의 미세먼지와 대기질 정보 추가
 * 프로그램 설명: 도시별 실시간 날씨·단기 예보·대기질을 출력
 */
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { fetchCurrentAirQuality } from '../api/airQualityApi'
import { fetchCurrentWeather, fetchWeatherForecast } from '../api/weatherApi'
import { useConfigStore } from '../stores/configStore'

const route = useRoute()
const configStore = useConfigStore()
const apiWeather = ref(null)
const forecastList = ref([])
const airQuality = ref(null)
const isLoading = ref(false)
const isAirLoading = ref(false)
const errorMessage = ref('')
const airErrorMessage = ref('')

const weatherList = [
  { id: 'city_01', region: '대한민국 서울특별시', lat: 37.5665, lon: 126.978 },
  { id: 'city_02', region: '부산광역시', lat: 35.1796, lon: 129.0756 },
  { id: 'city_03', region: '경기도 수원시', lat: 37.2636, lon: 127.0286 },
  { id: 'city_04', region: '인천광역시', lat: 37.4563, lon: 126.7052 },
  { id: 'city_05', region: '대구광역시', lat: 35.8714, lon: 128.6014 },
  { id: 'city_06', region: '대전광역시', lat: 36.3504, lon: 127.3845 },
  { id: 'city_07', region: '광주광역시', lat: 35.1595, lon: 126.8526 },
  { id: 'city_08', region: '제주특별자치도', lat: 33.4996, lon: 126.5312 },
]

const selectedWeather = computed(() => {
  return weatherList.find((weather) => weather.id === route.params.cityId)
})

const displayTemp = computed(() => {
  if (!apiWeather.value) return null
  if (configStore.unit === 'fahrenheit') {
    return Math.round((apiWeather.value.main.temp * 9) / 5 + 32)
  }
  return Math.round(apiWeather.value.main.temp)
})

const displayForecastList = computed(() => {
  return forecastList.value.slice(0, 5).map((forecast) => ({
    time: new Date(forecast.dt * 1000).toLocaleString('ko-KR', {
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
    }),
    temp:
      configStore.unit === 'fahrenheit'
        ? Math.round((forecast.main.temp * 9) / 5 + 32)
        : Math.round(forecast.main.temp),
    status: forecast.weather[0].description,
  }))
})

const airQualityStatus = computed(() => {
  const aqi = airQuality.value?.current.us_aqi

  if (aqi <= 50) return '좋음'
  if (aqi <= 100) return '보통'
  if (aqi <= 150) return '민감군 주의'
  if (aqi <= 200) return '나쁨'
  return '매우 나쁨'
})

const loadWeather = async () => {
  if (!selectedWeather.value) return

  isLoading.value = true
  errorMessage.value = ''

  try {
    const [currentWeather, forecastWeather] = await Promise.all([
      fetchCurrentWeather(selectedWeather.value.lat, selectedWeather.value.lon),
      fetchWeatherForecast(selectedWeather.value.lat, selectedWeather.value.lon),
    ])

    apiWeather.value = currentWeather
    forecastList.value = forecastWeather.list
  } catch (error) {
    console.error('날씨와 예보 요청 실패:', error)
    errorMessage.value = '날씨 또는 예보 데이터를 가져오지 못했습니다.'
  } finally {
    isLoading.value = false
  }
}

const loadAirQuality = async () => {
  if (!selectedWeather.value) return

  isAirLoading.value = true
  airErrorMessage.value = ''

  try {
    airQuality.value = await fetchCurrentAirQuality(
      selectedWeather.value.lat,
      selectedWeather.value.lon,
    )
  } catch (error) {
    console.error('대기질 요청 실패:', error)
    airErrorMessage.value = '대기질 정보를 가져오지 못했습니다.'
  } finally {
    isAirLoading.value = false
  }
}

onMounted(() => {
  loadWeather()
  loadAirQuality()
})
</script>

<template>
  <main class="detail-view">
    <h2>📊 지역별 상세 기상 관측 정보</h2>

    <p v-if="isLoading" class="status-message">실시간 날씨를 불러오는 중입니다...</p>
    <p v-else-if="errorMessage" class="status-message error">{{ errorMessage }}</p>

    <div v-else-if="selectedWeather && apiWeather" class="weather-info">
      <p>📍 지정 지역: {{ selectedWeather.region }}</p>
      <p>실시간 기온: {{ displayTemp }}{{ configStore.unitSymbol }}</p>
      <p>기상 현황: {{ apiWeather.weather[0].description }}</p>
      <p>대기 습도: {{ apiWeather.main.humidity }}%</p>
      <p>현재 풍속: {{ apiWeather.wind.speed }}m/s</p>
    </div>
    <p v-else-if="!selectedWeather">도시 정보를 찾을 수 없습니다.</p>

    <section v-if="displayForecastList.length" class="forecast-section">
      <h3>🕒 3시간 간격 단기 예보</h3>
      <ul>
        <li v-for="forecast in displayForecastList" :key="forecast.time">
          <strong>{{ forecast.time }}</strong>
          <span>{{ forecast.temp }}{{ configStore.unitSymbol }}</span>
          <span>{{ forecast.status }}</span>
        </li>
      </ul>
    </section>

    <section class="air-quality-section">
      <h3>🌫️ 현재 대기질 정보</h3>
      <p v-if="isAirLoading" class="status-message">대기질 정보를 불러오는 중입니다...</p>
      <p v-else-if="airErrorMessage" class="status-message error">{{ airErrorMessage }}</p>
      <div v-else-if="airQuality" class="air-quality-grid">
        <p>
          미세먼지 PM10
          <strong>{{ airQuality.current.pm10 }}{{ airQuality.current_units.pm10 }}</strong>
        </p>
        <p>
          초미세먼지 PM2.5
          <strong>{{ airQuality.current.pm2_5 }}{{ airQuality.current_units.pm2_5 }}</strong>
        </p>
        <p>
          대기질 지수
          <strong>{{ airQuality.current.us_aqi }} · {{ airQualityStatus }}</strong>
        </p>
        <small>기준 시각: {{ airQuality.current.time }}</small>
      </div>
    </section>

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

.status-message {
  padding: 16px;
  border-radius: 5px;
  background: #eef7fc;
  text-align: center;
}

.status-message.error {
  color: #a63131;
  background: #fff0f0;
}

.forecast-section,
.air-quality-section {
  margin-top: 16px;
  padding: 16px;
  border: 1px solid #dbe3e8;
  border-radius: 5px;
}

.forecast-section h3,
.air-quality-section h3 {
  margin: 0 0 12px;
  font-size: 17px;
}

.air-quality-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.air-quality-grid p {
  display: grid;
  gap: 5px;
  margin: 0;
  padding: 10px;
  border-radius: 4px;
  background: #f4f8f1;
}

.air-quality-grid small {
  grid-column: 1 / -1;
  color: #657783;
}

.forecast-section ul {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.forecast-section li {
  display: grid;
  grid-template-columns: 1.4fr 0.6fr 1fr;
  gap: 8px;
  padding: 9px;
  border-radius: 4px;
  background: #f6f8fa;
}

@media (max-width: 520px) {
  .forecast-section li {
    grid-template-columns: 1fr;
  }

  .air-quality-grid {
    grid-template-columns: 1fr;
  }

  .air-quality-grid small {
    grid-column: auto;
  }
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
