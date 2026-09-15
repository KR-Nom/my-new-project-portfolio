<script setup>
import { ref, watch } from 'vue'
import QRCode from 'qrcode'
import BaseModal from './BaseModal.vue'
const props = defineProps({ open: Boolean, url: String, code: String, title: String })
defineEmits(['close'])
const copied = ref(false)
const qrImage = ref('')
const error = ref('')
async function copyLink() {
  try {
    error.value = ''
    if (!navigator.clipboard) throw new Error('링크를 선택해 직접 복사해 주세요.')
    await navigator.clipboard.writeText(props.url)
    copied.value = true
  } catch (e) { error.value = '자동 복사를 사용할 수 없어요. 아래 링크를 선택해 복사해 주세요.' }
}
watch(() => [props.open, props.url], async ([open, url]) => {
  copied.value = false
  error.value = ''
  qrImage.value = ''
  if (open && url) {
    try { qrImage.value = await QRCode.toDataURL(url, { width: 360, margin: 1, color: { dark: '#25264b', light: '#ffffff' } }) }
    catch { error.value = 'QR 코드를 만들지 못했어요. 링크를 복사해 공유해 주세요.' }
  }
}, { immediate: true })
</script>
<template>
  <BaseModal :open="open" :title="title || '공유하기'" @close="$emit('close')">
    <div class="share-modal-body">
      <img v-if="qrImage" :src="qrImage" class="qr-image" alt="공유 링크 QR 코드">
      <div class="share-info"><p>카메라로 QR 코드를 스캔하거나 링크를 전달해 주세요.</p><strong v-if="code" class="invite-code">{{ code }}</strong><div class="copy-field"><input :value="url" readonly aria-label="공유 링크" @focus="$event.target.select()"><button class="button" @click="copyLink">{{ copied ? '복사 완료' : '복사' }}</button></div><p v-if="error" class="error" role="alert">{{ error }}</p><small v-else aria-live="polite">{{ copied ? '링크를 복사했어요. 팀원에게 전달해 주세요.' : 'QR 코드와 링크는 같은 공유 화면으로 연결됩니다.' }}</small></div>
    </div>
  </BaseModal>
</template>
