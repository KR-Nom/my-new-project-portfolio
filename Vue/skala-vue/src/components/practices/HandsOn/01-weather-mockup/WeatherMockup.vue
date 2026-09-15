<script setup>
import { ref } from 'vue'

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
const text = ref('') // v-model용 변수
const showDetail = (cityName, status) => {
  window.alert(`${cityName}의 현재 날씨는 [${status}] 상태입니다.`)
}
const selectedCity = ref('')
</script>

<template>
  <div class="handson-section">
    <h2>과제 1: 날씨 (Mockup)</h2>
    <hr />
    <br />
    <h3>도시 검색</h3>
    <input type="text" v-model="text" placeholder="검색할 도시 이름 입력" />
    <h3>
      검색 중인 도시: <strong>{{ text }}</strong>
    </h3>
    <hr />
    <br />

    <h3>지역별 날씨 현황</h3>
    <ul>
      <li v-for="weather in weatherList" :key="weather.id" @click="selectedCity = weather.name">
        <strong>{{ weather.name }} ({{ weather.status }})</strong>
        <button @click.stop="showDetail(weather.name, weather.status)">상세보기</button>
        <p>현재 기온: {{ weather.temp }}℃</p>

        <span v-if="weather.temp >= 25" class="weather-label hot">🔥 더움 (25도 이상) </span>
        <span v-else class="weather-label cool">❄️ 선선함 (25도 미만) </span>
      </li>
    </ul>
    <p class="selected-message" v-if="selectedCity">{{ selectedCity }}이 선택되었습니다.</p>
    <span class="selected-message" v-else>카드를 클릭하거나 검색해 보세요.</span>
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

button {
  float: right;
  padding: 6px 10px;
  border: 1px solid #999;
  border-radius: 4px;
  background: white;
  cursor: pointer;
}

button:hover {
  background: #eaf3ff;
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
}
</style>
