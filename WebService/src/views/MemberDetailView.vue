<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { teamApi } from '../services/teamApi'
import AppIcon from '../components/AppIcon.vue'
import SocialLinks from '../components/SocialLinks.vue'

const route = useRoute()
const team = ref(null)
const member = ref(null)
const loading = ref(true)
const error = ref('')
const profile = computed(() => member.value?.profile || {})
const manualSections = [
  { key: 'interests', title: '관심사 · 취미' },
  { key: 'collaboration', title: '협업 스타일' },
  { key: 'feedback', title: '피드백 선호 방식' },
  { key: 'meeting', title: '회의 스타일' },
]
let loadRequest = 0

async function loadMember() {
  const request = ++loadRequest
  loading.value = true
  error.value = ''
  try {
    const [nextTeam, nextMember] = await Promise.all([
      teamApi.getTeam(route.params.teamId),
      teamApi.getMember(route.params.teamId, route.params.memberId),
    ])
    if (request !== loadRequest) return
    team.value = nextTeam
    member.value = nextMember
  } catch (cause) {
    if (request === loadRequest) error.value = cause.message || '잠시 후 다시 시도해 주세요.'
  } finally {
    if (request === loadRequest) loading.value = false
  }
}

watch(() => [route.params.teamId, route.params.memberId], loadMember, { immediate: true })
</script>

<template>
  <div v-if="loading" class="loading-card" role="status">
    <span class="spinner" aria-hidden="true" /> 팀원의 사용설명서를 불러오고 있어요.
  </div>
  <div v-else-if="error" class="empty error-state" role="alert">
    <strong>사용설명서를 불러오지 못했어요.</strong>
    <p>{{ error }}</p>
    <div class="actions">
      <router-link class="button secondary" :to="`/teams/${route.params.teamId}`">팀 보드로</router-link>
      <button class="button" @click="loadMember">다시 불러오기</button>
    </div>
  </div>
  <div v-else-if="member && team" class="member-detail">
    <router-link class="back" :to="`/teams/${team.id}`"><AppIcon name="arrow-left" /> 팀 보드로 돌아가기</router-link>
    <section class="profile-hero member-detail-hero">
      <div class="avatar large" aria-hidden="true">{{ profile.avatar || member.user.name[0] }}</div>
      <div>
        <p class="eyebrow">TEAM MEMBER</p>
        <h1>{{ member.user.name }}</h1>
        <p class="lead">{{ profile.tagline || '함께할 동료에게 나를 소개하고 있어요.' }}</p>
        <span class="status">{{ team.name }}</span>
      </div>
    </section>

    <section class="card team-context member-detail-section">
      <p class="eyebrow">이번 팀에서의 나</p>
      <div class="detail-role">
        <div>
          <h2>맡고 싶은 역할</h2>
          <p class="field-hint">우선순위에 따라 작성한 희망 역할이에요.</p>
          <ol v-if="member.roles?.length" class="role-list"><li v-for="role in member.roles" :key="role">{{ role }}</li></ol>
          <p v-else class="muted">아직 희망 역할을 작성하지 않았어요.</p>
        </div>
        <div>
          <h2>이번 프로젝트의 목표</h2>
          <p class="quote">{{ member.goal || '아직 프로젝트 목표를 작성하지 않았어요.' }}</p>
        </div>
      </div>
      <div v-if="member.projectLinks?.length" class="project-links-section">
        <h2>프로젝트 관련 링크</h2>
        <div class="social-links"><a v-for="(link, index) in member.projectLinks" :key="index" :href="link.url" target="_blank" rel="noopener noreferrer">{{ link.label }} <AppIcon name="arrow-up-right" /></a></div>
      </div>
    </section>

    <div class="section-title">
      <div>
        <p class="eyebrow">COLLABORATION MANUAL</p>
        <h2>이렇게 함께하면 좋아요</h2>
        <p class="muted">역할을 넘어, 동료의 일하는 방식도 알아보세요.</p>
      </div>
    </div>
    <section class="profile-grid">
      <div v-for="section in manualSections" :key="section.key" class="card">
        <h2>{{ section.title }}</h2>
        <div v-if="profile[section.key]?.length && section.key === 'interests'" class="chips">
          <span v-for="value in profile[section.key]" :key="value" class="chip selected">{{ value }}</span>
        </div>
        <ul v-else-if="profile[section.key]?.length"><li v-for="value in profile[section.key]" :key="value">{{ value }}</li></ul>
        <p v-else class="muted">아직 작성하지 않았어요.</p>
      </div>
    </section>
    <section class="card conversation member-detail-section">
      <p class="eyebrow">START A CONVERSATION</p>
      <h2>이런 질문으로 대화를 시작해요</h2>
      <template v-if="profile.questions?.length"><p v-for="question in profile.questions" :key="question">“{{ question }}”</p></template>
      <p v-else class="muted">아직 대화 주제를 작성하지 않았어요.</p>
    </section>
    <section class="card member-detail-section">
      <h2>더 알아보기</h2>
      <SocialLinks :links="profile.links" />
    </section>
  </div>
</template>
