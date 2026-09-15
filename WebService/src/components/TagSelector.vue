<script setup>
import { computed } from 'vue'

const props = defineProps({
  options: { type: Array, default: () => [] },
  modelValue: { type: Array, default: () => [] },
  max: { type: Number, default: Infinity },
  label: { type: String, default: '항목 선택' },
  ranked: Boolean,
})
const emit = defineEmits(['update:modelValue'])
// 직접 입력한 항목도 목록에 남겨 다시 눌러 해제할 수 있게 합니다.
const choices = computed(() => [...new Set([...props.options, ...props.modelValue])])
const atLimit = computed(() => props.modelValue.length >= props.max)

function toggle(value) {
  const selected = props.modelValue.includes(value)
  if (!selected && atLimit.value) return
  emit('update:modelValue', selected
    ? props.modelValue.filter((item) => item !== value)
    : [...props.modelValue, value])
}
</script>

<template>
  <div class="tag-selector">
    <div class="selection-summary" aria-live="polite">
      <span>{{ modelValue.length }}{{ Number.isFinite(max) ? ' / ' + max : '' }}개 선택</span>
      <span class="help">{{ atLimit ? '선택한 항목을 누르면 해제됩니다.' : '여러 개를 선택할 수 있어요.' }}</span>
    </div>
    <div class="chips" role="group" :aria-label="label">
      <button
        v-for="option in choices"
        :key="option"
        type="button"
        class="chip"
        :class="{ selected: modelValue.includes(option) }"
        :aria-pressed="modelValue.includes(option)"
        :disabled="atLimit && !modelValue.includes(option)"
        @click="toggle(option)"
      >
        <span v-if="modelValue.includes(option)" class="chip-check" aria-hidden="true">
          {{ ranked ? modelValue.indexOf(option) + 1 : '✓' }}
        </span>
        {{ option }}
      </button>
    </div>
  </div>
</template>
