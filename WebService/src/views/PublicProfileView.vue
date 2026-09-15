<script setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { profileApi } from '../services/profileApi'
import ProfileCard from '../components/ProfileCard.vue'
import AppIcon from '../components/AppIcon.vue'

const route = useRoute()
const data = ref(null)
const loading = ref(true)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  data.value = null
  try {
    data.value = await profileApi.getPublicProfile(route.params.token)
  } catch (cause) {
    error.value = cause.message || '프로필을 불러오지 못했어요.'
  } finally {
    loading.value = false
  }
}
watch(() => route.params.token, load, { immediate: true })
</script>

<template>
  <div class="public-wrap">
    <div class="public-head">
      <router-link to="/" class="brand"><span class="brand-mark"><AppIcon name="book" :size="21" /></span>HowToDo</router-link>
      <span class="status">공개 사용설명서</span>
    </div>
    <div v-if="loading" class="card loading-card" role="status"><span class="spinner" />프로필을 불러오고 있어요.</div>
    <div v-else-if="error" class="card empty error-state" role="alert">
      <strong>지금은 프로필을 볼 수 없어요</strong><p>{{ error }}</p>
      <p class="help">공유 주소가 맞는지, 프로필이 공개 상태인지 확인해 주세요.</p>
      <button class="button secondary" @click="load">다시 불러오기</button>
    </div>
    <ProfileCard v-else-if="data" :profile="data" :user="data.user" public-view />
    <footer>서로를 이해하는 만큼, 함께하는 일이 편해집니다.</footer>
  </div>
</template>
