<script setup>
import { ref, watch, reactive } from 'vue'

const state = reactive({
  productName: '노트북',
  price: 1000,
})
const logAutoDeep = ref('대기 중...')
const logTarget = ref('대기 중...')

watch(state, (newVal, oldVal) => {
  logAutoDeep.value = `[자동 deep] 가격 변동! 이전가격인척하는:${oldVal.value}원 ➡️ 현재가격:${newVal.price}원`
})

watch(
  () => state.price,
  (newPrice, oldPrice) => {
    logTarget.value = `[타겟 조준] 가격이 진짜 올랐음! 옛날값:${oldPrice} ➡️ 바뀐값:${newPrice}`
  },
)
</script>

<template>
  <div class="practice-section">
    <h2>reactive() 데이터 watch 감시 규칙</h2>
    <h3>🛒 상품 정보 관리 (reactive)</h3>
    <p>상품명: {{ state.productName }} / 가격: {{ state.price }}</p>
    <button @click="state.price += 500">가격 500원 인상</button>

    <div class="monitor auto">
      <p>👁️‍🗨️ 1) state 변수 통째로 감시 (deep 자동화)</p>
      <p>{{ logAutoDeep }}</p>
      <small>※ 주의: 이전 값과 현재 값이 똑같이 찍힌다.</small>
    </div>

    <div class="monitor target">
      <p>🎯 2) () => state.price 콕 집어 감시 (과거 추적)</p>
      <p>{{ logTarget }}</p>
      <small>※ 성공: 과거의 원본 가격이 칼같이 보존된다.</small>
    </div>
  </div>
</template>

<style scoped>
.monitor {
  font-weight: bold;
}
.auto {
  border-color: #ff7675;
  background: #fff5f5;
  color: #c0392b;
}
.target {
  border-color: #00b894;
  background: #e8f5e9;
  color: #27ae60;
}
</style>
