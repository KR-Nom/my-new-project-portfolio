<script setup>
/**
 * 작성자: 장현진
 * 작성일: 2026-08-27 (목)
 * 변경사항: Element Plus Card·Button·Tag로 날씨 카드 재구성
 * 프로그램 설명: 날씨 핵심 정보와 사용자 동작을 하나의 카드로 출력
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

const temperatureState = computed(() => {
  if (props.weather.temp === null) return { className: 'unknown', label: '정보 없음' }
  if (props.weather.temp >= 32) return { className: 'extreme', label: `폭염 · ${extremeStandard.value}` }
  if (props.weather.temp >= 25) return { className: 'hot', label: `더움 · ${hotStandard.value}` }
  return { className: 'cool', label: `선선함 · ${coolStandard.value}` }
})

const weatherIconUrl = computed(() => {
  if (!props.weather.icon) return ''
  return `https://openweathermap.org/img/wn/${props.weather.icon}@2x.png`
})

const weatherTheme = computed(() => {
  const main = props.weather.weatherMain
  const isHot = props.weather.temp >= 25

  if (['Rain', 'Drizzle', 'Thunderstorm'].includes(main)) return isHot ? 'hot-rain' : 'rain'
  if (main === 'Clouds') return isHot ? 'hot-clouds' : 'clouds'
  if (main === 'Clear') return isHot ? 'hot-clear' : 'clear'
  return 'default'
})

</script>

<template>
  <li class="weather-card" @click="$emit('select-card', weather)">
    <el-card shadow="hover" :class="['weather-theme', weatherTheme]">
      <div v-if="weather.cityImage" class="city-photo">
        <img :src="weather.cityImage" :alt="`${weather.name} 대표 도시 전경`" />
        <div class="photo-caption">
          <small>대한민국 주요 도시</small>
          <strong>{{ weather.name }}</strong>
        </div>
        <button
          v-if="showFavorite"
          class="favorite-button"
          :class="{ active: isFavorite }"
          :aria-label="`${weather.name} 즐겨찾기`"
          @click.stop="$emit('toggle-favorite', weather)"
        >
          {{ isFavorite ? '★' : '☆' }}
        </button>
      </div>
      <div class="weather-info-panel">
        <div class="card-header">
          <div>
            <small>현재 날씨</small>
            <h3>{{ weather.name }}</h3>
          </div>
          <el-button
            v-if="showFavorite && !weather.cityImage"
            class="fallback-favorite"
            circle
            @click.stop="$emit('toggle-favorite', weather)"
          >
            {{ isFavorite ? '★' : '☆' }}
          </el-button>
        </div>

        <div v-if="displayTemp !== null" class="weather-visual">
          <div>
            <strong class="temperature">{{ displayTemp }}<small>{{ configStore.unitSymbol }}</small></strong>
            <p class="weather-status">{{ weather.status }}</p>
          </div>
          <div :class="['weather-icon-wrap', temperatureState.className]">
            <img v-if="weatherIconUrl" :src="weatherIconUrl" :alt="`${weather.status} 날씨 이미지`" />
            <strong>{{ temperatureState.label }}</strong>
          </div>
        </div>
        <p v-else>등록된 날씨 정보가 없습니다.</p>

        <div class="card-footer">
          <el-button type="primary" plain @click.stop="$emit('click-detail', weather)">상세보기</el-button>
        </div>
      </div>
    </el-card>
  </li>
</template>

<style scoped>
.weather-card { min-width: 0; cursor: pointer; transition: transform .3s ease, opacity .3s ease, filter .3s ease; }
.weather-card:hover { z-index: 2; transform: scale(1.025) translateY(-5px); }
.weather-card :deep(.el-card) { height: 100%; overflow: hidden; border: 0; border-radius: 20px; box-shadow: 0 10px 30px rgba(19, 59, 76, .09); transition: box-shadow .3s ease; }
.weather-card :deep(.el-card:hover) { box-shadow: 0 22px 45px rgba(19, 59, 76, .2); }
.city-photo { position: relative; height: 190px; margin: -20px -20px 18px; overflow: hidden; }
.city-photo img { width: 100%; height: 100%; object-fit: cover; transition: transform .5s ease; }
.weather-card:hover .city-photo img { transform: scale(1.07); }
.city-photo::after { position: absolute; inset: 0; content: ''; background: linear-gradient(180deg, rgba(9,35,48,.05) 30%, rgba(9,35,48,.82)); }
.photo-caption { position: absolute; z-index: 1; left: 18px; bottom: 25px; display: grid; color: #fff; }
.photo-caption small { color: rgba(255,255,255,.78); font-size: 11px; }
.photo-caption strong { font-size: 25px; line-height: 1.2; }
.favorite-button { position: absolute; z-index: 2; top: 14px; right: 14px; display: grid; width: 40px; height: 40px; padding: 0; place-items: center; border: 1px solid rgba(255,255,255,.75); border-radius: 50%; color: #ffc928; background: rgba(18,44,56,.52); backdrop-filter: blur(7px); cursor: pointer; font-size: 25px; line-height: 1; transition: transform .2s ease, background .2s ease; }
.favorite-button:hover { transform: scale(1.1); background: rgba(18,44,56,.75); }
.favorite-button.active { color: #ffd43b; background: rgba(65,52,7,.72); text-shadow: 0 1px 8px rgba(255,212,59,.5); }
.weather-info-panel { position: relative; z-index: 1; margin: -32px -4px 0; padding: 20px; border: 1px solid rgba(222,232,237,.9); border-radius: 18px; background: rgba(255,255,255,.96); box-shadow: 0 12px 28px rgba(20,58,74,.11); }
.weather-theme { background: #f7fbfd; }
.card-header { display: flex; gap: 12px; align-items: center; justify-content: space-between; }
.card-header small { color: #8ca0aa; }
.card-header h3 { margin: 2px 0 0; color: #17384b; font-size: 20px; }
.fallback-favorite { color: #e7ab00; font-size: 20px; }
.weather-visual { display: flex; min-height: 126px; align-items: center; justify-content: space-between; }
.weather-icon-wrap { display: flex; width: 116px; height: 116px; align-items: center; justify-content: center; flex-direction: column; border: 4px solid rgba(255,255,255,.7); border-radius: 50%; box-shadow: 0 8px 20px rgba(25,64,79,.14); }
.weather-icon-wrap.extreme { color: #fff; background: linear-gradient(145deg, #ff5a64, #e83d4a); }
.weather-icon-wrap.hot { color: #fff; background: linear-gradient(145deg, #ffbb3d, #ef8e24); }
.weather-icon-wrap.cool { color: #fff; background: linear-gradient(145deg, #5eb8ed, #408bd5); }
.weather-icon-wrap.unknown { color: #58717d; background: #e8eef1; }
.weather-icon-wrap strong { margin-top: -12px; font-size: 11px; line-height: 1.2; white-space: nowrap; }
.weather-visual img { width: 72px; height: 72px; object-fit: contain; filter: drop-shadow(0 6px 7px rgba(25,64,79,.18)); }
.temperature { display: block; color: #163f54; font-size: 48px; line-height: 1; letter-spacing: -2px; }
.temperature small { margin-left: 4px; color: #63808e; font-size: 17px; letter-spacing: 0; }
.weather-status { margin: 8px 0 0; color: #526f7c; font-size: 15px; font-weight: 700; }
.card-footer { display: flex; min-height: 34px; align-items: end; justify-content: flex-end; gap: 12px; }
@media (max-width: 640px) {
  .weather-card:hover { transform: none; }
  .weather-info-panel { padding: 17px; }
}
</style>
