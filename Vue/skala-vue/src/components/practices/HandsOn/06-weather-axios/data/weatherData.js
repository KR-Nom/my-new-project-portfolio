import { ref } from 'vue'

// 메인 View와 즐겨찾기 View가 함께 사용하는 날씨 데이터와 선택 상태
export const weatherList = ref([
  { id: 'city_01', name: '서울', lat: 37.5665, lon: 126.978, temp: 28, status: '맑음' },
  { id: 'city_02', name: '부산', lat: 35.1796, lon: 129.0756, temp: 24, status: '비' },
  { id: 'city_03', name: '수원', lat: 37.2636, lon: 127.0286, temp: 26, status: '구름' },
  { id: 'city_04', name: '인천', lat: 37.4563, lon: 126.7052, temp: 22, status: '흐림' },
  { id: 'city_05', name: '대구', lat: 35.8714, lon: 128.6014, temp: 30, status: '맑음' },
  { id: 'city_06', name: '대전', lat: 36.3504, lon: 127.3845, temp: 23, status: '구름' },
  { id: 'city_07', name: '광주', lat: 35.1595, lon: 126.8526, temp: 27, status: '맑음' },
  { id: 'city_08', name: '제주', lat: 33.4996, lon: 126.5312, temp: 21, status: '비' },
])

export const favoriteCityIds = ref([])

export const toggleFavorite = (weather) => {
  const isFavorite = favoriteCityIds.value.includes(weather.id)

  if (isFavorite) {
    favoriteCityIds.value = favoriteCityIds.value.filter((cityId) => cityId !== weather.id)
    return
  }

  favoriteCityIds.value = [...favoriteCityIds.value, weather.id]
}
