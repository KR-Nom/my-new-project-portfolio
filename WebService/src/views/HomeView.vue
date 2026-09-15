<script setup>
import { computed, onMounted, ref } from 'vue'
import { authApi } from '../services/authApi'
import { profileApi } from '../services/profileApi'
import { teamApi } from '../services/teamApi'
import TeamCard from '../components/TeamCard.vue'
import AppIcon from '../components/AppIcon.vue'

const user = authApi.getCurrentUser()
const profile = ref(null)
const teams = ref([])
const loading = ref(true)
const error = ref('')
const profileReady = computed(() => Boolean(profile.value?.tagline && profile.value?.collaboration?.length))
const checklist = computed(() => [
  { title: '나를 소개하기', detail: '관심사와 협업 방식을 남겨요.', done: profileReady.value, link: '/profile/edit', icon: 'book' },
  { title: '팀과 연결하기', detail: '초대 코드로 우리 팀에 참여해요.', done: teams.value.length > 0, link: teams.value.length ? '/teams' : '/join', icon: 'link' },
  { title: '동료 알아보기', detail: '팀원의 희망 역할과 목표를 살펴봐요.', done: false, link: teams.value.length ? '/teams/' + teams.value[0].id : '/teams', icon: 'users' },
])
async function load() {
  loading.value = true
  error.value = ''
  try { [profile.value, teams.value] = await Promise.all([profileApi.getMyProfile(), teamApi.getTeams()]) }
  catch (e) { error.value = e.message }
  finally { loading.value = false }
}
onMounted(load)
</script>

<template>
  <div v-if="loading" class="loading-card" role="status"><span class="spinner" />내 워크스페이스를 불러오고 있어요.</div>
  <div v-else-if="error" class="empty error-state" role="alert"><h2>잠시 불러오지 못했어요.</h2><p>{{ error }}</p><button class="button" @click="load">다시 시도</button></div>
  <div v-else class="dashboard">
    <section class="page-heading dashboard-heading"><div><p class="eyebrow">MY WORKSPACE</p><h1>{{ user.name }}님, 반가워요 <span class="greeting-dot">✦</span></h1><p>함께 일하는 방식을 나누고, 우리 팀을 더 알아가요.</p></div><router-link class="button secondary" to="/join"><AppIcon name="link" :size="17" /> 초대 코드로 참여</router-link></section>
    <section class="welcome-panel"><div class="welcome-content"><span class="welcome-kicker"><AppIcon name="sparkles" :size="17" /> 좋은 협업을 위한 첫걸음</span><h2>서로의 사용법을 알면,<br>함께하는 일이 편해져요.</h2><p>나는 어떻게 일하는 사람인가요?<br>짧은 소개로 팀원들과 대화를 시작해 보세요.</p><router-link class="button" to="/profile/edit">{{ profileReady ? '내 사용설명서 다듬기' : '내 사용설명서 만들기' }}<AppIcon name="arrow-right" :size="17" /></router-link></div><div class="welcome-preview" aria-label="나의 협업 프로필 요약"><div class="preview-top"><span class="avatar">{{ profile?.avatar || user.name[0] }}</span><div><strong>{{ user.name }}</strong><span>나의 협업 사용설명서</span></div><span class="preview-decoration"><AppIcon name="book" /></span></div><p class="preview-tagline">{{ profile?.tagline || '함께 일하는 나를 소개해 주세요.' }}</p><div class="preview-divider" /><p class="label">이렇게 협업해요</p><div class="chips compact"><span v-for="style in profile?.collaboration?.slice(0, 2)" :key="style" class="chip selected">{{ style }}</span><span v-if="!profile?.collaboration?.length" class="muted">선호하는 협업 방식을 선택해 보세요.</span></div><div class="preview-bottom"><span class="preview-dot" /> {{ profile?.visibility === 'PUBLIC' ? '공개 프로필' : '공개 범위 설정됨' }}<router-link to="/profile/preview">미리보기 <AppIcon name="arrow-right" :size="14" /></router-link></div></div></section>
    <section class="onboarding-strip" aria-label="협업 시작 안내"><router-link v-for="(step, index) in checklist" :key="step.title" :to="step.link" class="onboarding-step"><span class="step-icon" :class="{ completed: step.done }"><AppIcon :name="step.done ? 'check' : step.icon" :size="20" /></span><div><span class="step-caption">STEP 0{{ index + 1 }}<span v-if="step.done"> · 완료</span></span><h3>{{ step.title }}</h3><p>{{ step.detail }}</p></div><AppIcon name="arrow-right" :size="17" class="step-arrow" /></router-link></section>
    <section><div class="section-title"><div><h2>함께하는 팀 <span class="inline-count">{{ teams.length }}</span></h2><p>우리 팀의 희망 역할과 목표를 확인하세요.</p></div><router-link class="text-link" to="/teams">전체 보기 <AppIcon name="arrow-right" :size="16" /></router-link></div><div class="stack"><TeamCard v-for="team in teams.slice(0, 3)" :key="team.id" :team="team" /><div v-if="!teams.length" class="empty"><AppIcon name="users" :size="32" /><h3>첫 팀과 연결해 보세요.</h3><p>팀을 만들거나 전달받은 초대 코드로 참여할 수 있어요.</p><router-link class="button" to="/join">팀 참여하기</router-link></div></div><router-link class="new-team-link" to="/teams/create"><AppIcon name="plus" :size="19" /> 새로운 팀 만들기</router-link></section>
  </div>
</template>
