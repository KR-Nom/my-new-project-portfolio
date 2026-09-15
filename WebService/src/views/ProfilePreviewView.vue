<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { authApi } from '../services/authApi'
import { profileApi } from '../services/profileApi'
import ProfileCard from '../components/ProfileCard.vue'
import ShareModal from '../components/ShareModal.vue'

const user = authApi.getCurrentUser()
const profile = ref(null)
const loading = ref(true)
const error = ref('')
const copied = ref(false)
const copying = ref(false)
const copyError = ref('')
const shareOpen = ref(false)
let copyTimer
const url = computed(() => profile.value ? location.origin + '/p/' + profile.value.shareToken : '')
const visibility = computed(() => ({
  PUBLIC: { label: '전체 공개', description: '링크를 받은 누구나 공통 프로필을 볼 수 있어요.' },
  TEAM_ONLY: { label: '팀에서 사용', description: '외부 공유 링크가 비활성화되어 있어요.' },
  PRIVATE: { label: '링크 공유 안 함', description: '외부 공유 링크가 비활성화되어 있어요.' },
}[profile.value?.visibility]))

async function load() {
  loading.value = true
  error.value = ''
  try {
    const result = await profileApi.getMyProfile()
    if (!result) throw new Error('프로필을 찾을 수 없습니다.')
    profile.value = result
  } catch (cause) {
    error.value = cause.message || '프로필을 불러오지 못했어요.'
  } finally {
    loading.value = false
  }
}

async function copy() {
  if (copying.value || profile.value.visibility !== 'PUBLIC') return
  copying.value = true
  copyError.value = ''
  copied.value = false
  clearTimeout(copyTimer)
  try {
    if (!navigator.clipboard?.writeText) throw new Error('이 브라우저에서는 자동 복사를 지원하지 않아요. 아래 링크를 직접 선택해 복사해 주세요.')
    await navigator.clipboard.writeText(url.value)
    copied.value = true
    copyTimer = setTimeout(() => { copied.value = false }, 2000)
  } catch (cause) {
    copyError.value = cause.name === 'NotAllowedError'
      ? '복사 권한을 허용하거나 아래 링크를 직접 선택해 복사해 주세요.'
      : cause.message || '복사하지 못했어요. 아래 링크를 직접 선택해 복사해 주세요.'
  } finally {
    copying.value = false
  }
}

onMounted(load)
onBeforeUnmount(() => clearTimeout(copyTimer))
</script>

<template>
  <div>
    <section class="page-heading">
      <div><p class="eyebrow">MY MANUAL</p><h1>내 사용설명서</h1><p>동료가 나를 이해할 수 있도록, 소개와 협업 방식을 한곳에 모았어요.</p></div>
      <router-link class="button secondary" to="/profile/edit">프로필 수정</router-link>
    </section>
    <div v-if="loading" class="card loading-card" role="status"><span class="spinner" />사용설명서를 불러오고 있어요.</div>
    <div v-else-if="error" class="card empty error-state" role="alert"><strong>사용설명서를 불러오지 못했어요</strong><p>{{ error }}</p><button class="button secondary" @click="load">다시 불러오기</button></div>
    <template v-else-if="profile">
      <div class="share-bar card">
        <div class="share-status">
          <span class="status-dot" :class="profile.visibility.toLowerCase()" aria-hidden="true" />
          <div><strong class="visibility-label">{{ visibility.label }}</strong><p class="muted">{{ visibility.description }}</p></div>
        </div>
        <div v-if="profile.visibility === 'PUBLIC'" class="share-actions">
          <button class="button secondary" :disabled="copying" @click="copy">{{ copying ? '복사 중…' : copied ? '복사 완료 ✓' : '링크 복사' }}</button>
          <button class="button" @click="shareOpen = true">QR로 공유</button>
        </div>
        <router-link v-else class="button secondary" to="/profile/edit">공유 설정 변경</router-link>
      </div>
      <p v-if="copied" class="help" role="status">프로필 링크를 복사했어요.</p>
      <div v-if="copyError" class="error" role="alert">
        <p>{{ copyError }}</p><input :value="url" readonly aria-label="직접 복사할 프로필 링크" @focus="$event.target.select()">
      </div>
      <ProfileCard :profile="profile" :user="user" />
      <ShareModal :open="shareOpen" title="내 프로필 공유" :url="url" @close="shareOpen = false" />
    </template>
  </div>
</template>
