<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { teamApi } from '../services/teamApi'
import AppIcon from '../components/AppIcon.vue'

const router = useRouter()
const form = reactive({ name: '', description: '' })
const loading = ref(false)
const error = ref('')

async function submit() {
  if (loading.value) return
  error.value = ''
  if (!form.name.trim() || !form.description.trim()) {
    error.value = '팀 이름과 소개를 입력해 주세요.'
    return
  }
  loading.value = true
  try {
    const team = await teamApi.createTeam({ name: form.name.trim(), description: form.description.trim() })
    await router.push(`/teams/${team.id}`)
  } catch (cause) {
    error.value = cause.message || '팀을 만들지 못했어요. 다시 시도해 주세요.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="narrow">
    <router-link class="back" to="/teams"><AppIcon name="arrow-left" /> 내 팀으로</router-link>
    <section class="page-heading">
      <div>
        <p class="eyebrow">NEW TEAM</p>
        <h1>우리 팀의 첫 시작</h1>
        <p>팀을 소개하고, 함께할 동료를 초대하세요.</p>
      </div>
    </section>
    <form class="card form-section" :aria-busy="loading" @submit.prevent="submit">
      <div class="form-intro">
        <h2>어떤 팀인가요?</h2>
        <p class="muted">만든 뒤에도 팀 이름과 소개를 수정할 수 있어요.</p>
      </div>
      <label for="team-name">팀 이름
        <input id="team-name" v-model.trim="form.name" :disabled="loading" required maxlength="40" placeholder="예: SKALA 웹서비스 3조" autocomplete="off" aria-describedby="team-name-hint">
      </label>
      <div id="team-name-hint" class="field-meta"><span>팀원이 알아보기 쉬운 이름을 적어주세요.</span><span>{{ form.name.length }}/40</span></div>
      <label for="team-description">팀 소개
        <textarea id="team-description" v-model.trim="form.description" :disabled="loading" required maxlength="160" rows="4" placeholder="함께 만들고 싶은 서비스나 이번 프로젝트의 목표를 알려주세요." aria-describedby="team-description-count" />
      </label>
      <div id="team-description-count" class="field-meta"><span>팀 보드와 초대 화면에 표시됩니다.</span><span>{{ form.description.length }}/160</span></div>
      <p class="form-note"><AppIcon name="link" /> 팀을 만들면 초대 링크와 코드가 준비됩니다.</p>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <div class="actions end">
        <button type="button" class="button secondary" :disabled="loading" @click="router.push('/teams')">취소</button>
        <button class="button" :disabled="loading"><span v-if="loading" class="spinner" aria-hidden="true" />{{ loading ? '팀을 만드는 중…' : '팀 만들고 시작하기' }}</button>
      </div>
    </form>
  </div>
</template>
