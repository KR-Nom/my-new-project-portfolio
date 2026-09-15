<script setup>
import { onMounted, ref } from 'vue'
import { teamApi } from '../services/teamApi'
import AppIcon from '../components/AppIcon.vue'
import TeamCard from '../components/TeamCard.vue'

const teams = ref([])
const loading = ref(true)
const error = ref('')

async function loadTeams() {
  loading.value = true
  error.value = ''
  try {
    teams.value = await teamApi.getTeams()
  } catch (cause) {
    error.value = cause.message || '잠시 후 다시 시도해 주세요.'
  } finally {
    loading.value = false
  }
}

onMounted(loadTeams)
</script>

<template>
  <div>
    <section class="page-heading">
      <div>
        <p class="eyebrow">MY TEAMS</p>
        <h1>함께하는 팀</h1>
        <p>팀을 열고, 함께할 사람들의 희망 역할과 협업 방식을 알아보세요.</p>
      </div>
      <div class="actions">
        <router-link class="button secondary" to="/join"><AppIcon name="link" /> 초대 코드로 참여</router-link>
        <router-link class="button" to="/teams/create"><AppIcon name="plus" /> 새 팀 만들기</router-link>
      </div>
    </section>
    <div v-if="loading" class="loading-card" role="status">
      <span class="spinner" aria-hidden="true" /> 참여한 팀을 불러오고 있어요.
    </div>
    <div v-else-if="error" class="empty error-state" role="alert">
      <strong>팀 목록을 불러오지 못했어요.</strong>
      <p>{{ error }}</p>
      <button class="button secondary" @click="loadTeams">다시 불러오기</button>
    </div>
    <template v-else-if="teams.length">
      <p class="team-summary">참여 중인 팀 <strong>{{ teams.length }}</strong></p>
      <div class="stack"><TeamCard v-for="team in teams" :key="team.id" :team="team" /></div>
    </template>
    <div v-else class="empty">
      <AppIcon class="empty-state-icon" name="users" />
      <h2>첫 번째 팀을 시작해 볼까요?</h2>
      <p>새 팀을 만들거나, 팀원에게 받은 초대 코드로 참여하세요.</p>
      <router-link class="button" to="/teams/create">새 팀 만들기 <AppIcon name="arrow-right" /></router-link>
    </div>
  </div>
</template>
