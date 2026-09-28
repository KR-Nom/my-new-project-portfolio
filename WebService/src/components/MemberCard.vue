<script setup>
import AppIcon from './AppIcon.vue'
import SocialLinks from './SocialLinks.vue'

defineProps({
  member: { type: Object, required: true },
  teamId: { type: [String, Number], required: true },
})
</script>

<template>
  <article class="card member-card">
    <div class="member-head">
      <div class="avatar" aria-hidden="true">{{ member.profile?.avatar || member.user.name[0] }}</div>
      <div class="member-identity">
        <h3>{{ member.user.name }}</h3>
        <p class="member-preview">{{ member.profile?.restricted ? '공통 프로필을 비공개로 설정했어요.' : member.profile?.tagline || '나의 협업 방식을 작성하고 있어요.' }}</p>
      </div>
      <router-link class="card-arrow" :to="`/teams/${teamId}/members/${member.id}`" :aria-label="`${member.user.name}의 사용설명서 보기`"><AppIcon name="arrow-right" /></router-link>
    </div>
    <div>
      <p class="label">희망 역할 · 우선순위</p>
      <div v-if="member.roles?.length" class="member-roles">
        <span v-for="(role, index) in member.roles" :key="role"><b>{{ index + 1 }}</b>{{ role }}</span>
      </div>
      <p v-else class="muted">아직 희망 역할을 작성하지 않았어요.</p>
    </div>
    <div class="member-goal">
      <p class="label">이번 프로젝트의 목표</p>
      <p class="goal">{{ member.goal || '어떤 경험을 하고 싶은지 곧 알려드릴게요.' }}</p>
    </div>
    <div class="member-footer">
      <SocialLinks :links="member.profile?.links" />
      <router-link :to="`/teams/${teamId}/members/${member.id}`">사용설명서 보기 <AppIcon name="arrow-right" /></router-link>
    </div>
  </article>
</template>
