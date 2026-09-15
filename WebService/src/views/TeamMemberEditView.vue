<script setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { teamApi } from '../services/teamApi'
import { profileApi } from '../services/profileApi'
import TagSelector from '../components/TagSelector.vue'

const route = useRoute()
const router = useRouter()
const form = ref(null)
const roles = ref([])
const loading = ref(true)
const saving = ref(false)
const loadError = ref('')
const saveError = ref('')

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const [membership, options] = await Promise.all([
      teamApi.getMyMembership(route.params.id),
      profileApi.getOptions(),
    ])
    form.value = { ...membership, projectLinks: membership.projectLinks || [] }
    roles.value = options.roles
  } catch (error) {
    loadError.value = error.message || '팀 프로필을 불러오지 못했어요.'
  } finally {
    loading.value = false
  }
}

function moveRole(index, direction) {
  const next = index + direction
  if (next < 0 || next >= form.value.roles.length) return
  const ordered = [...form.value.roles]
  ;[ordered[index], ordered[next]] = [ordered[next], ordered[index]]
  form.value.roles = ordered
}

async function save() {
  if (saving.value) return
  saveError.value = ''
  if (!form.value.goal.trim()) {
    saveError.value = '이번 프로젝트에서 해보고 싶은 일을 한 줄로 알려주세요.'
    return
  }
  const links = form.value.projectLinks.filter((link) => link.label.trim() || link.url.trim())
  for (const link of links) {
    if (!link.label.trim() || !link.url.trim()) {
      saveError.value = '프로젝트 링크의 이름과 주소를 함께 입력해 주세요.'
      return
    }
    try {
      if (!['http:', 'https:'].includes(new URL(link.url.trim()).protocol)) throw new Error()
    } catch {
      saveError.value = '프로젝트 링크를 https://로 시작하는 올바른 주소로 입력해 주세요.'
      return
    }
  }
  saving.value = true
  try {
    await teamApi.updateMyMembership(route.params.id, {
      ...form.value,
      goal: form.value.goal.trim(),
      projectLinks: links.map((link) => ({ label: link.label.trim(), url: link.url.trim() })),
    })
    await router.push('/teams/' + route.params.id)
  } catch (error) {
    saveError.value = error.message || '저장하지 못했어요. 입력 내용은 유지되니 다시 시도해 주세요.'
  } finally {
    saving.value = false
  }
}

watch(() => route.params.id, load, { immediate: true })
</script>

<template>
  <div class="narrow">
    <router-link class="back" :to="'/teams/' + route.params.id">← 팀 보드로 돌아가기</router-link>
    <section class="page-heading">
      <div><p class="eyebrow">MY TEAM PROFILE</p><h1>이번 팀에서의 나</h1><p>해보고 싶은 역할과 목표를 팀원에게 알려주세요.</p></div>
    </section>
    <div v-if="loading" class="card loading-card" role="status"><span class="spinner" />팀 프로필을 불러오고 있어요.</div>
    <div v-else-if="loadError" class="card empty error-state" role="alert"><strong>팀 프로필을 불러오지 못했어요</strong><p>{{ loadError }}</p><button class="button secondary" @click="load">다시 불러오기</button></div>
    <form v-else-if="form" class="editor" :aria-busy="saving" @submit.prevent="save">
      <section class="card form-section">
        <div class="field-heading"><h2>해보고 싶은 역할</h2><p class="help">최대 3개를 선택해요. 선택한 순서가 희망 우선순위가 됩니다.</p></div>
        <TagSelector v-model="form.roles" :options="roles" :max="3" label="희망 역할" ranked />
        <ol v-if="form.roles.length" class="role-priority-list" aria-label="희망 역할 우선순위">
          <li v-for="(role, index) in form.roles" :key="role" class="role-priority-item">
            <span class="rank-number">{{ index + 1 }}순위</span><strong>{{ role }}</strong>
            <div class="rank-controls">
              <button type="button" class="icon-button" :disabled="index === 0 || saving" :aria-label="role + ' 우선순위 올리기'" @click="moveRole(index, -1)">↑</button>
              <button type="button" class="icon-button" :disabled="index === form.roles.length - 1 || saving" :aria-label="role + ' 우선순위 내리기'" @click="moveRole(index, 1)">↓</button>
              <button type="button" class="icon-button" :disabled="saving" :aria-label="role + ' 선택 해제'" @click="form.roles.splice(index, 1)">×</button>
            </div>
          </li>
        </ol>
        <p v-else class="help">아직 결정하지 않았다면 역할 선택 없이 목표부터 작성해도 좋아요.</p>
      </section>
      <section class="card form-section">
        <label>이번 프로젝트의 목표 <span class="help">필수</span><textarea v-model="form.goal" required maxlength="120" rows="3" placeholder="예: 팀원과 API 구조를 함께 설계하고, 직접 구현까지 해보고 싶어요."></textarea><span class="field-meta">{{ form.goal.length }} / 120자</span></label>
      </section>
      <section class="card form-section">
        <div class="field-heading"><h2>프로젝트 관련 링크 <small>선택</small></h2><p class="help">팀과 공유할 작업물이나 참고 자료를 연결해요.</p></div>
        <div v-for="(link, index) in form.projectLinks" :key="index" class="link-row">
          <input v-model="link.label" :aria-label="'프로젝트 링크 ' + (index + 1) + ' 이름'" placeholder="링크 이름">
          <input v-model="link.url" :aria-label="'프로젝트 링크 ' + (index + 1) + ' 주소'" type="url" placeholder="https://...">
          <button type="button" class="icon-button" :aria-label="'프로젝트 링크 ' + (index + 1) + ' 삭제'" :disabled="saving" @click="form.projectLinks.splice(index, 1)">×</button>
        </div>
        <button type="button" class="button secondary" :disabled="saving" @click="form.projectLinks.push({ label: '', url: '' })">+ 링크 추가</button>
      </section>
      <p v-if="saveError" class="error" role="alert">{{ saveError }}</p>
      <div class="sticky-actions">
        <router-link class="button secondary" :to="'/teams/' + route.params.id">취소</router-link>
        <button class="button" :disabled="saving">{{ saving ? '저장 중…' : '저장하고 팀 보드 보기' }}</button>
      </div>
    </form>
  </div>
</template>
