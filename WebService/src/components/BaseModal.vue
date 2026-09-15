<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
const props = defineProps({ title: String, open: Boolean })
const emit = defineEmits(['close'])
const dialog = ref(null)
let previousFocus
let previousOverflow = ''
function onKeydown(event) {
  if (event.key === 'Escape') { event.preventDefault(); emit('close'); return }
  if (event.key !== 'Tab') return
  const controls = [...dialog.value.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),select:not(:disabled),[tabindex="0"]')]
  if (!controls.length) { event.preventDefault(); return }
  const first = controls[0], last = controls.at(-1)
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
}
watch(() => props.open, async open => {
  if (open) {
    previousFocus = document.activeElement
    previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    await nextTick()
    if (props.open) dialog.value?.querySelector('button')?.focus()
  } else {
    document.body.style.overflow = previousOverflow
    previousFocus?.focus()
  }
})
onBeforeUnmount(() => { if (props.open) document.body.style.overflow = previousOverflow })
</script>
<template>
  <Teleport to="body"><Transition name="fade"><div v-if="open" class="modal-backdrop" @click.self="$emit('close')" @keydown="onKeydown"><section ref="dialog" class="modal" role="dialog" aria-modal="true" :aria-label="title"><header class="modal-header"><div><p class="eyebrow">HowToDo</p><h2>{{ title }}</h2></div><button type="button" class="modal-close" aria-label="닫기" @click="$emit('close')">×</button></header><slot /></section></div></Transition></Teleport>
</template>
