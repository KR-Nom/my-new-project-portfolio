<script setup>
/**
 * 작성자: 장현진
 * 작성일: 2026-08-27
 * 프로그램 설명: 부모 검색어를 표시하고 변경된 검색어를 이벤트로 전달
 */
defineProps({
  query: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['update-query'])

// input의 최신 문자열을 부모 컴포넌트에 전달
const updateQuery = (event) => {
  emit('update-query', event.target.value)
}
</script>

<template>
  <div class="search-bar">
    <input
      type="text"
      :value="query"
      aria-label="검색할 도시 이름"
      placeholder="검색할 도시 이름 입력"
      @input="updateQuery"
    />
    <p>검색 중인 도시: <strong>{{ query }}</strong></p>
  </div>
</template>

<style scoped>
input {
  width: 100%;
  padding: 11px 12px;
  border: 1px solid #aebbc5;
  border-radius: 6px;
  color: #263746;
  background: #ffffff;
  font-size: clamp(14px, 1.2vw, 16px);
}

input::placeholder {
  color: #8b99a3;
}

p {
  margin: 8px 0 0;
  color: #657783;
  font-size: 14px;
}

strong {
  color: #263746;
}
</style>
