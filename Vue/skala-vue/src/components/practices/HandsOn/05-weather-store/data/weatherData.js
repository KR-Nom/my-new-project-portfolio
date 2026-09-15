import { ref } from 'vue'

// 메인 View와 즐겨찾기 View가 함께 사용하는 날씨 데이터와 선택 상태
export const weatherList = ref([
  { id: 'city_01', name: '서울', temp: 28, status: '맑음' },
  { id: 'city_02', name: '부산', temp: 24, status: '비' },
  { id: 'city_03', name: '수원', temp: 26, status: '구름' },
  { id: 'city_04', name: '인천', temp: 22, status: '흐림' },
  { id: 'city_05', name: '대구', temp: 30, status: '맑음' },
  { id: 'city_06', name: '대전', temp: 23, status: '구름' },
  { id: 'city_07', name: '광주', temp: 27, status: '맑음' },
  { id: 'city_08', name: '제주', temp: 21, status: '비' },
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
