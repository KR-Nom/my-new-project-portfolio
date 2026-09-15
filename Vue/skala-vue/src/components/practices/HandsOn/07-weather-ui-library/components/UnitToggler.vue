<script setup>
/**
 * 작성자: 장현진
 * 작성일: 2026-08-27 (목)
 * 프로그램 설명: Element Plus Switch로 Pinia의 온도 단위를 변경
 */
import { useConfigStore } from '../stores/configStore'

const configStore = useConfigStore()
const changeUnit = () => configStore.toggleUnit()
</script>

<template>
  <div class="unit-toggler">
    <span>℃</span>
    <el-switch
      :model-value="configStore.unit === 'fahrenheit'"
      aria-label="온도 단위 변경"
      @change="changeUnit"
    />
    <span>℉</span>
  </div>
</template>

<style scoped>
.unit-toggler {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 7px 11px;
  border-radius: 10px;
  background: #f1f7fa;
  white-space: nowrap;
}

span {
  color: #314f67;
  font-weight: 700;
}

</style>
