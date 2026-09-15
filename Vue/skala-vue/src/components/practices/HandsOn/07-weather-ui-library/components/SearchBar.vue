<script setup>
/**
 * 작성자: 장현진
 * 작성일: 2026-08-27 (목)
 * 프로그램 설명: Element Plus 검색창의 도시명을 부모에게 전달
 */
defineProps({ query: { type: String, required: true } })
const emit = defineEmits(['update-query'])
</script>

<template>
  <el-input
    :model-value="query"
    size="large"
    clearable
    placeholder="서울, 부산, 제주처럼 도시 이름을 입력하세요"
    @update:model-value="emit('update-query', $event)"
  >
    <template #prefix>🔍</template>
  </el-input>
</template>
