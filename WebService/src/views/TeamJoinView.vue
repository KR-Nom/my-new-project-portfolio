<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { teamApi } from '../services/teamApi'
import AppIcon from '../components/AppIcon.vue'

const route = useRoute()
const router = useRouter()
const code = ref('')
const checkedCode = ref('')
const team = ref(null)
const error = ref('')
const checking = ref(false)
const joining = ref(false)
const canJoin = computed(() => team.value && checkedCode.value === code.value.trim() && !joining.value)
let lookupRequest = 0

// 초대 코드를 바꾸면 이전 확인 결과와 늦게 도착한 응답을 사용하지 않는다.
watch(code, () => {
  lookupRequest += 1
  team.value = null
  checkedCode.value = ''
  error.value = ''
  checking.value = false
}, { flush: 'sync' })

async function check() {
  if (checking.value || joining.value) return
  const requestedCode = code.value.trim()
  if (!requestedCode) {
    error.value = '팀원에게 받은 초대 코드를 입력해 주세요.'
    return
  }
  const request = ++lookupRequest
  checking.value = true
  team.value = null
  checkedCode.value = ''
  error.value = ''
  try {
    const invitation = await teamApi.getInvitation(requestedCode)
    if (request !== lookupRequest) return
    team.value = invitation
    checkedCode.value = requestedCode
  } catch (cause) {
    if (request === lookupRequest) error.value = cause.message || '초대 코드를 확인하지 못했어요. 다시 시도해 주세요.'
  } finally {
    if (request === lookupRequest) checking.value = false
  }
}

async function join() {
  if (!canJoin.value) return
  joining.value = true
  error.value = ''
  try {
    const joined = await teamApi.joinTeam(checkedCode.value)
    await router.push(`/teams/${joined.id}/me/edit`)
  } catch (cause) {
    error.value = cause.message || '팀에 참여하지 못했어요. 다시 시도해 주세요.'
  } finally {
    joining.value = false
  }
}

watch(() => route.params.code, (invitationCode) => {
  code.value = typeof invitationCode === 'string' ? invitationCode : ''
  if (code.value) check()
}, { immediate: true })
</script>

<template>
  <div class="narrow">
    <router-link class="back" to="/teams"><AppIcon name="arrow-left" /> 내 팀으로</router-link>
    <section class="page-heading">
      <div>
        <p class="eyebrow">JOIN A TEAM</p>
        <h1>함께할 팀을 찾아요</h1>
        <p>받은 초대 코드를 입력하고, 참여할 팀이 맞는지 확인하세요.</p>
      </div>
    </section>
    <form class="card form-section" :aria-busy="checking" @submit.prevent="check">
      <p class="step-label">01 · 초대 코드 확인</p>
      <label for="invite-code">초대 코드</label>
      <div class="inline-input">
        <input id="invite-code" v-model.trim="code" :disabled="joining" required placeholder="예: SKALA3" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-describedby="invite-hint">
        <button class="button secondary" :disabled="checking || joining || !code.trim()">{{ checking ? '확인 중…' : '팀 확인' }}</button>
      </div>
      <p id="invite-hint" class="field-hint">초대 링크로 접속했다면 코드가 자동으로 입력됩니다.</p>
    </form>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <div v-if="checking" class="loading-card" role="status"><span class="spinner" aria-hidden="true" /> 초대받은 팀을 확인하고 있어요.</div>
    <article v-else-if="team" class="card invitation" aria-live="polite">
      <p class="step-label">02 · 팀 확인 후 참여</p>
      <div class="invitation-summary">
        <span class="icon-box" aria-hidden="true"><AppIcon name="users" /></span>
        <div><h2>{{ team.name }}</h2><p class="muted">현재 {{ team.memberCount }}명이 함께하고 있어요.</p></div>
      </div>
      <p>{{ team.description }}</p>
      <p class="form-note">참여한 뒤 이 팀에서 맡고 싶은 역할과 목표를 작성합니다.</p>
      <button class="button full" :disabled="!canJoin" @click="join">{{ joining ? '팀에 참여하는 중…' : '이 팀에 참여하기' }}<AppIcon v-if="!joining" name="arrow-right" /></button>
    </article>
  </div>
</template>
