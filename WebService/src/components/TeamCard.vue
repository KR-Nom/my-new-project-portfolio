<script setup>
import { computed } from 'vue'
import { authApi } from '../services/authApi'
import AppIcon from './AppIcon.vue'

const props = defineProps({ team: { type: Object, required: true } })
const isOwner = computed(() => props.team.ownerId === authApi.getCurrentUser()?.id)
</script>

<template>
  <article class="card team-card">
    <div class="icon-box" aria-hidden="true">{{ team.name.slice(0, 1) }}</div>
    <div class="team-card-copy">
      <div class="card-kicker">MY TEAM <span v-if="isOwner" class="team-role-badge">내가 만든 팀</span></div>
      <h3>{{ team.name }}</h3>
      <p>{{ team.description }}</p>
      <div class="team-meta"><AppIcon name="users" /><strong>{{ team.memberCount }}명 참여 중</strong></div>
    </div>
    <router-link class="button secondary" :to="`/teams/${team.id}`" :aria-label="`${team.name} 팀 보드 열기`">팀 보드 열기 <AppIcon name="arrow-right" /></router-link>
  </article>
</template>
