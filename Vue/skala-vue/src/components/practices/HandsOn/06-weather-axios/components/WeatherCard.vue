<script setup>
/**
 * 작성자: 장현진
 * 작성일: 2026-08-27 (목)
 * 변경사항: 온도 단위 변경 시 기온과 상태 기준값을 함께 변환
 * 프로그램 설명: 날씨 객체 한 건을 출력하고 카드 이벤트를 부모에 전달
 */
import { computed } from 'vue'
import { useConfigStore } from '../stores/configStore'

const props = defineProps({
  weather: { type: Object, required: true },
  isFavorite: { type: Boolean, default: false },
  showFavorite: { type: Boolean, default: true },
})

defineEmits(['select-card', 'click-detail', 'toggle-favorite'])

const configStore = useConfigStore()

// 원본 섭씨 값은 유지하고 화면에 표시할 값만 현재 단위로 변환한다.
const convertTemp = (celsiusTemp) => {
  if (configStore.unit === 'fahrenheit') {
    return Math.round((celsiusTemp * 9) / 5 + 32)
  }

  return celsiusTemp
}

const displayTemp = computed(() => {
  if (props.weather.temp === null) return null
  return convertTemp(props.weather.temp)
})

const extremeStandard = computed(() => `${convertTemp(32)}${configStore.unitSymbol} 이상`)
const hotStandard = computed(() => `${convertTemp(25)}${configStore.unitSymbol} 이상`)
const coolStandard = computed(() => `${convertTemp(25)}${configStore.unitSymbol} 미만`)
</script>

<template>
  <li class="weather-card" @click="$emit('select-card', weather)">
    <div class="card-header">
      <strong>{{ weather.name }} ({{ weather.status }})</strong>
      <div class="card-actions">
        <button v-if="showFavorite" class="favorite-button" @click.stop="$emit('toggle-favorite', weather)">
          {{ isFavorite ? '★ 즐겨찾기 해제' : '☆ 즐겨찾기' }}
        </button>
        <button @click.stop="$emit('click-detail', weather)">상세보기</button>
      </div>
    </div>

    <p v-if="displayTemp !== null">현재 기온: {{ displayTemp }}{{ configStore.unitSymbol }}</p>
    <p v-else>등록된 날씨 정보가 없습니다.</p>
    <span v-if="weather.temp !== null && weather.temp >= 32" class="weather-label extreme">
      🚨 폭염 ({{ extremeStandard }})
    </span>
    <span v-else-if="weather.temp !== null && weather.temp >= 25" class="weather-label hot">
      🔥 더움 ({{ hotStandard }})
    </span>
    <span v-else-if="weather.temp !== null" class="weather-label cool">
      ❄️ 선선함 ({{ coolStandard }})
    </span>
  </li>
</template>

<style scoped>
.weather-card { padding: clamp(16px, 2vw, 24px); border: 1px solid #d7dee3; border-radius: 8px; color: #263746; background: #fff; cursor: pointer; }
.card-header { display: flex; gap: 12px; align-items: center; justify-content: space-between; }
.card-header strong { font-size: clamp(16px, 1.6vw, 19px); }
.card-actions { display: flex; gap: 8px; }
p { margin: 8px 0; color: #555; }
button { padding: 6px 10px; border: 1px solid #999; border-radius: 4px; background: #fff; cursor: pointer; }
button:hover { background: #eaf3ff; }
.favorite-button { border-color: #e0ad2f; color: #8a6500; background: #fff9dc; }
.weather-label { display: inline-block; padding: 4px 8px; border-radius: 4px; color: #fff; font-size: 13px; font-weight: 700; }
.weather-label.extreme { background: #d93025; }
.weather-label.hot { background: #ff6572; }
.weather-label.cool { background: #45b9ef; }
@media (max-width: 640px) {
  .card-header { align-items: flex-start; flex-direction: column; }
  .card-actions { width: 100%; }
  .card-actions button { flex: 1; }
}
</style>
