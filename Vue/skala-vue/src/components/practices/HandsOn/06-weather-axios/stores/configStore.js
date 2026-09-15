import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

/**
 * 작성자: 장현진
 * 작성일: 2026-08-27 (목)
 * 프로그램 설명: 여러 화면에서 함께 사용하는 온도 단위 설정을 관리
 */
export const useConfigStore = defineStore('config', () => {
  // state: 현재 온도 단위와 사용자가 단위를 변경한 횟수
  const unit = ref('celsius')
  const changeCount = ref(0)

  // getter: state를 화면에서 사용하기 좋은 글자로 변환
  const unitSymbol = computed(() => (unit.value === 'celsius' ? '℃' : '℉'))
  const unitName = computed(() => (unit.value === 'celsius' ? '섭씨' : '화씨'))

  // action: 버튼을 누르면 섭씨와 화씨를 서로 변경
  const toggleUnit = () => {
    unit.value = unit.value === 'celsius' ? 'fahrenheit' : 'celsius'
    changeCount.value += 1
  }

  return { unit, changeCount, unitSymbol, unitName, toggleUnit }
})
