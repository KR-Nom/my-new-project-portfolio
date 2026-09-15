<script setup>
/**
 * 작성자: 장현진
 * 작성일: 2026-08-26
 * 변경사항:
 * - 2026-08-26: 과제 1 날씨 Mockup을 Composition API 구조로 확장
 * - 2026-08-26: 도시 검색 computed와 검색 결과 없음 안내 추가
 * - 2026-08-26: 즐겨찾기 반응형 상태, computed, watch 기능 추가
 * 프로그램 설명: 도시를 검색하고 날씨 카드를 선택할 수 있는 Vue 날씨 실습
 * 실행 방법: npm run dev 실행 후 브라우저에서 과제 2 화면 확인
 */
import { ref, computed, watch, watchEffect } from 'vue'

// 지역별 날씨 카드에 사용할 원본 데이터
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

// 상세보기 버튼을 누르면 선택한 도시의 날씨 상태를 알림으로 표시
const showDetail = (cityName, status) => {
  window.alert(`${cityName}의 현재 날씨는 [${status}] 상태입니다.`)
}

const searchQuery = ref('') // 검색 input과 연결되는 검색어
const selectedCityInfo = ref(null) // 사용자가 선택한 도시의 복사본
const favoriteCityIds = ref([]) // 즐겨찾기로 선택한 도시 ID 목록

// 원본 날씨 객체와 선택 상태가 함께 변경되지 않도록 얕은 복사
const selectCity = (weather) => {
  selectedCityInfo.value = { ...weather }
}

// 검색어가 없으면 전체 목록, 있으면 도시 이름이 포함된 결과만 반환
const filteredWeatherList = computed(() => {
  if (searchQuery.value === '') {
    return weatherList.value
  }

  return weatherList.value.filter((weather) => weather.name.includes(searchQuery.value))
})

// 즐겨찾기 ID와 일치하는 도시 객체만 원본 날씨 목록에서 반환
const favoriteWeatherList = computed(() => {
  return weatherList.value.filter((weather) => favoriteCityIds.value.includes(weather.id))
})

// 같은 버튼으로 즐겨찾기 도시를 추가하거나 제거
const toggleFavorite = (weather) => {
  const isFavorite = favoriteCityIds.value.includes(weather.id)

  if (isFavorite) {
    favoriteCityIds.value = favoriteCityIds.value.filter((cityId) => cityId !== weather.id)
    return
  }

  favoriteCityIds.value = [...favoriteCityIds.value, weather.id]
}

// 선택 도시가 바뀔 때 상태 바 변경 내용을 콘솔에 기록
watch(selectedCityInfo, (newCity, oldCity) => {
  const oldCityName = oldCity?.name ?? '선택 없음'

  console.log(
    `[watch 감지] 선택 도시 변경: ${oldCityName} → ${newCity.name}, 상태 바 문구가 업데이트되었습니다.`,
  )
})

// 검색어와 필터 결과가 바뀔 때 현재 검색 상태를 자동으로 콘솔에 기록
watchEffect(() => {
  const cityNames = filteredWeatherList.value.map((weather) => weather.name).join(', ')

  console.log(
    `[watchEffect 자동 호출] 현재 검색어 "${searchQuery.value}"의 검색 결과: ${filteredWeatherList.value.length}개 (${cityNames || '검색 결과 없음'})`,
  )
})

// 새 배열이 할당될 때마다 즐겨찾기 개수 변화를 콘솔에 기록
watch(favoriteCityIds, (newIds, oldIds) => {
  console.log(`[즐겨찾기 watch] ${oldIds.length}개 → ${newIds.length}개`)
})
</script>

<template>
  <div class="handson-section">
    <!-- 도시 검색 영역 -->
    <h2>과제 2: 날씨 (컴포지션)</h2>
    <hr />
    <br />
    <h3>도시 검색</h3>
    <input type="text" v-model="searchQuery" placeholder="검색할 도시 이름 입력" />
    <h3>
      검색 중인 도시: <strong>{{ searchQuery }}</strong>
    </h3>
    <hr />
    <br />

    <!-- computed로 계산된 지역별 날씨 카드 목록 -->
    <h3>지역별 날씨 현황</h3>
    <ul v-if="filteredWeatherList.length > 0">
      <li
        v-for="weather in filteredWeatherList"
        :key="weather.id"
        @click="selectCity(weather)"
      >
        <div class="card-header">
          <strong>{{ weather.name }} ({{ weather.status }})</strong>
          <div class="card-actions">
            <button class="favorite-button" @click.stop="toggleFavorite(weather)">
              {{ favoriteCityIds.includes(weather.id) ? '★ 즐겨찾기 해제' : '☆ 즐겨찾기' }}
            </button>
            <button @click.stop="showDetail(weather.name, weather.status)">상세보기</button>
          </div>
        </div>
        <p>현재 기온: {{ weather.temp }}℃</p>

        <span v-if="weather.temp >= 25" class="weather-label hot">🔥 더움 (25도 이상) </span>
        <span v-else class="weather-label cool">❄️ 선선함 (25도 미만) </span>
      </li>
    </ul>
    <p v-else class="no-result-message">검색 결과와 일치하는 도시가 없습니다.</p>

    <!-- 카드 선택 여부에 따른 상태 안내 -->
    <p class="selected-message" v-if="selectedCityInfo">
      {{ selectedCityInfo.name }}이 선택되었습니다.
    </p>
    <span class="selected-message" v-else>카드를 클릭하거나 검색해 보세요.</span>

    <!-- 개인 추가 기능: 즐겨찾기 도시 목록 -->
    <section class="favorite-section">
      <h3>즐겨찾기 도시 ({{ favoriteWeatherList.length }})</h3>
      <p v-if="favoriteWeatherList.length === 0" class="favorite-empty-message">
        즐겨찾기한 도시가 없습니다.
      </p>
      <ul v-else class="favorite-list">
        <li v-for="weather in favoriteWeatherList" :key="weather.id">
          <strong>★ {{ weather.name }}</strong>
          <span>{{ weather.temp }}℃ · {{ weather.status }}</span>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.handson-section {
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
  margin-bottom: 12px;
  color: #263746;
  font-size: clamp(20px, 2.2vw, 28px);
  font-weight: 700;
}

h3 {
  margin: 20px 0 10px;
  color: #486276;
  font-size: clamp(15px, 1.5vw, 18px);
  font-weight: 700;
}

hr {
  border: 0;
  border-top: 1px solid #aebbc5;
}

input {
  width: 100%;
  box-sizing: border-box;
  padding: 11px 12px;
  border: 1px solid #bbb;
  border-radius: 6px;
  color: #263746;
  background: #fff;
  font-size: clamp(14px, 1.2vw, 16px);
}

input::placeholder {
  color: #8b99a3;
}

ul {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 0;
  list-style: none;
}

li {
  padding: clamp(16px, 2vw, 24px);
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  color: #263746;
  transition:
    border-color 0.2s,
    box-shadow 0.2s,
    transform 0.2s;
}

li:hover {
  border-color: #9ec5df;
  box-shadow: 0 4px 12px rgba(38, 55, 70, 0.08);
  transform: translateY(-1px);
}

li strong {
  font-size: clamp(16px, 1.6vw, 19px);
}

.card-header {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
}

.card-actions {
  display: flex;
  gap: 8px;
}

li p {
  margin: 8px 0;
  color: #555;
}

.handson-section > p {
  color: #657783;
  font-size: 13px;
}

strong {
  color: #263746;
}

span {
  display: inline-block;
  margin-right: 12px;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 13px;
}

.weather-label {
  font-weight: bold;
}

.weather-label.hot {
  color: #ffffff;
  background: #ff6572;
}

.weather-label.cool {
  color: #ffffff;
  background: #45b9ef;
}

.handson-section > .selected-message {
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

.handson-section > .no-result-message {
  margin: 14px 0;
  padding: 18px;
  border: 1px dashed #c7d1d8;
  border-radius: 8px;
  color: #657783;
  background: #ffffff;
  font-size: 15px;
  text-align: center;
}

button {
  padding: 6px 10px;
  border: 1px solid #999;
  border-radius: 4px;
  background: white;
  cursor: pointer;
}

button:hover {
  background: #eaf3ff;
}

.favorite-button {
  border-color: #e0ad2f;
  color: #8a6500;
  background: #fff9dc;
}

.favorite-button:hover {
  background: #fff1ae;
}

.favorite-section {
  margin-top: 22px;
  padding: 18px;
  border: 1px solid #ead48d;
  border-radius: 8px;
  background: #fffdf3;
}

.favorite-section h3 {
  margin-top: 0;
  color: #765b08;
}

.favorite-empty-message {
  margin: 0;
  color: #7c7460;
  text-align: center;
}

.favorite-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
}

.favorite-list li {
  display: flex;
  padding: 12px 14px;
  border-color: #ead48d;
  align-items: center;
  justify-content: space-between;
}

.favorite-list li:hover {
  border-color: #d4ad34;
  box-shadow: none;
  transform: none;
}

.favorite-list span {
  margin: 0;
  padding: 0;
  color: #6c6654;
}

@media (max-width: 640px) {
  .handson-section {
    margin: 12px auto;
    padding: 20px;
  }

  h2 {
    font-size: 20px;
  }

  li {
    padding: 16px;
  }

  .card-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .card-actions {
    width: 100%;
  }

  .card-actions button {
    flex: 1;
  }
}
</style>
