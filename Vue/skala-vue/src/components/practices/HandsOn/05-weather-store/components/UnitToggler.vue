<script setup>
/**
 * 작성자: 장현진
 * 작성일: 2026-08-27 (목)
 * 프로그램 설명: Pinia Store의 온도 단위를 확인하고 변경하는 버튼
 */
import { useConfigStore } from '../stores/configStore'

const configStore = useConfigStore()
</script>

<template>
  <div class="unit-toggler">
    <span>{{ configStore.unitName }} {{ configStore.unitSymbol }}</span>
    <button @click="configStore.toggleUnit">단위 변경</button>
    <small>변경 {{ configStore.changeCount }}회</small>
  </div>
</template>

<style scoped>
.unit-toggler {
  display: flex;
  gap: 8px;
  align-items: center;
  white-space: nowrap;
}

span {
  color: #314f67;
  font-weight: 700;
}

button {
  padding: 7px 10px;
  border: 1px solid #88b9d3;
  border-radius: 4px;
  color: #176b94;
  background: #eef8fd;
  cursor: pointer;
}

small {
  color: #71828d;
}
</style>
