<script setup>
/**
 * 작성자: 장현진
 * 작성일: 2026-08-27
 * 프로그램 설명: 즐겨찾기 도시 목록을 출력하고 해제 이벤트를 부모에 전달
 */
defineProps({
  weatherList: {
    type: Array,
    required: true,
  },
})

defineEmits(['toggle-favorite'])
</script>

<template>
  <p v-if="weatherList.length === 0" class="empty-message">즐겨찾기한 도시가 없습니다.</p>
  <ul v-else class="favorite-list">
    <li v-for="weather in weatherList" :key="weather.id">
      <div>
        <strong>★ {{ weather.name }}</strong>
        <span>{{ weather.temp }}℃ · {{ weather.status }}</span>
      </div>
      <button @click="$emit('toggle-favorite', weather)">해제</button>
    </li>
  </ul>
</template>

<style scoped>
.empty-message {
  margin: 0;
  color: #7c7460;
  text-align: center;
}

.favorite-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 10px;
  padding: 0;
  list-style: none;
}

li {
  display: flex;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid #ead48d;
  border-radius: 8px;
  background: #ffffff;
  align-items: center;
  justify-content: space-between;
}

li div {
  display: flex;
  gap: 8px;
  align-items: center;
}

strong {
  color: #765b08;
}

span {
  color: #6c6654;
  font-size: 13px;
}

button {
  padding: 5px 8px;
  border: 1px solid #e0ad2f;
  border-radius: 4px;
  color: #8a6500;
  background: #fff9dc;
  cursor: pointer;
}
</style>
