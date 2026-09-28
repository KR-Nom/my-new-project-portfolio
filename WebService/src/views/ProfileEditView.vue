<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { profileApi } from '../services/profileApi'
import TagSelector from '../components/TagSelector.vue'

const router = useRouter()
const form = ref(null)
const options = ref(null)
const custom = ref({ interests: '', collaboration: '', feedback: '', meeting: '', questions: '' })
const loading = ref(true)
const saving = ref(false)
const loadError = ref('')
const saveError = ref('')
const currentStep = ref(0)
const panelHeading = ref(null)
const steps = ['나를 소개하기', '협업 방식', '링크와 공유']
const sections = computed(() => options.value ? [
  { field: 'collaboration', title: '함께 일할 때', hint: '동료가 알아두면 좋은 업무 방식을 골라주세요.', list: options.value.styleOptions.collaboration },
  { field: 'feedback', title: '피드백을 받을 때', hint: '어떻게 의견을 전하면 편한가요?', list: options.value.styleOptions.feedback },
  { field: 'meeting', title: '회의를 할 때', hint: '집중하기 편한 회의 방식을 알려주세요.', list: options.value.styleOptions.meeting },
] : [])
const visibilityHelp = computed(() => ({
  PUBLIC: '링크를 받은 누구나 공통 프로필을 볼 수 있어요.',
  TEAM_ONLY: '같은 팀의 동료만 볼 수 있어요. 외부 공유 링크는 열리지 않아요.',
  PRIVATE: '공통 프로필은 나만 볼 수 있어요. 팀별 역할과 목표는 팀원에게 표시됩니다.',
}[form.value?.visibility] || ''))

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const [profile, choices] = await Promise.all([profileApi.getMyProfile(), profileApi.getOptions()])
    if (!profile) throw new Error('프로필을 찾을 수 없습니다.')
    form.value = { ...profile, links: { github: '', notion: '', instagram: '', ...profile.links } }
    options.value = choices
  } catch (error) {
    loadError.value = error.message || '프로필을 불러오지 못했어요.'
  } finally {
    loading.value = false
  }
}

function add(field, max = Infinity) {
  const value = custom.value[field].trim()
  if (!value || form.value[field].includes(value) || form.value[field].length >= max) return
  form.value[field].push(value)
  custom.value[field] = ''
}

async function goToStep(index) {
  currentStep.value = index
  await nextTick()
  panelHeading.value?.focus({ preventScroll: true })
  panelHeading.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function save() {
  if (saving.value) return
  if (currentStep.value < steps.length - 1) return goToStep(currentStep.value + 1)
  saveError.value = ''
  for (const [label, value] of Object.entries(form.value.links)) {
    if (!value.trim()) continue
    try {
      const url = new URL(value.trim())
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error()
    } catch {
      saveError.value = label + ' 링크를 https://로 시작하는 올바른 주소로 입력해 주세요.'
      return
    }
  }
  saving.value = true
  try {
    await profileApi.updateMyProfile(form.value)
    await router.push('/profile/preview')
  } catch (error) {
    saveError.value = error.message || '저장하지 못했어요. 입력 내용은 유지되니 다시 시도해 주세요.'
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="profile-editor">
    <section class="page-heading">
      <div>
        <p class="eyebrow">MY PROFILE</p>
        <h1>나의 협업 사용설명서</h1>
        <p>동료에게 알려주고 싶은 나의 모습, 세 단계로 작성해요.</p>
      </div>
      <router-link class="button secondary" to="/profile/preview">미리보기</router-link>
    </section>

    <div v-if="loading" class="card loading-card" role="status"><span class="spinner" />프로필을 불러오고 있어요.</div>
    <div v-else-if="loadError" class="card empty error-state" role="alert">
      <strong>프로필을 불러오지 못했어요</strong><p>{{ loadError }}</p>
      <button class="button secondary" @click="load">다시 불러오기</button>
    </div>

    <form v-else-if="form && options" class="editor" novalidate :aria-busy="saving" @submit.prevent="save">
      <nav class="editor-stepper" aria-label="프로필 작성 단계">
        <button
          v-for="(step, index) in steps" :key="step" type="button"
          :class="{ active: currentStep === index }" :aria-current="currentStep === index ? 'step' : undefined"
          :disabled="saving" @click="goToStep(index)"
        ><span>{{ index + 1 }}</span>{{ step }}</button>
      </nav>
      <h2 ref="panelHeading" class="step-panel-heading" tabindex="-1">{{ steps[currentStep] }} <small>{{ currentStep + 1 }} / 3</small></h2>

      <div v-show="currentStep === 0" class="step-panel">
        <section class="card form-section">
          <div class="field-heading"><h2>어떤 사람인가요?</h2><p class="help">짧은 소개만으로도 첫 대화가 편해져요.</p></div>
          <label>프로필 이니셜<input v-model="form.avatar" maxlength="2" placeholder="현" autocomplete="off"><span class="help">프로필 사진 대신 표시할 한두 글자예요.</span></label>
          <label>한 줄 소개<input v-model="form.tagline" maxlength="60" placeholder="예: 중간 과정을 공유하며 함께 답을 찾는 개발자"><span class="field-meta">{{ form.tagline.length }} / 60자</span></label>
        </section>
        <section class="card form-section">
          <div class="field-heading"><h2>관심사와 취미</h2><p class="help">서로의 공통점을 발견할 수 있도록 알려주세요.</p></div>
          <TagSelector v-model="form.interests" :options="options.interests" label="관심사와 취미" />
          <div class="inline-input"><input v-model="custom.interests" aria-label="관심사 직접 입력" maxlength="40" placeholder="목록에 없다면 직접 입력" @keydown.enter.prevent="add('interests')"><button type="button" class="button secondary" :disabled="!custom.interests.trim()" @click="add('interests')">추가</button></div>
        </section>
      </div>

      <div v-show="currentStep === 1" class="step-panel">
        <section v-for="section in sections" :key="section.field" class="card form-section">
          <div class="field-heading"><h2>{{ section.title }}</h2><p class="help">{{ section.hint }}</p></div>
          <TagSelector v-model="form[section.field]" :options="section.list" :label="section.title" />
          <div class="inline-input"><input v-model="custom[section.field]" :aria-label="section.title + ' 직접 입력'" maxlength="80" placeholder="나에게 맞는 방식을 직접 입력" @keydown.enter.prevent="add(section.field)"><button type="button" class="button secondary" :disabled="!custom[section.field].trim()" @click="add(section.field)">추가</button></div>
        </section>
        <section class="card form-section">
          <div class="field-heading"><h2>대화를 시작하는 질문</h2><p class="help">동료가 나에게 물어보면 좋은 질문을 최대 3개 골라주세요.</p></div>
          <TagSelector v-model="form.questions" :options="options.conversationQuestions" :max="3" label="대화 시작 질문" />
          <div class="inline-input"><input v-model="custom.questions" aria-label="대화 질문 직접 입력" maxlength="120" placeholder="예: 요즘 가장 몰입하고 있는 일은?" :disabled="form.questions.length >= 3" @keydown.enter.prevent="add('questions', 3)"><button type="button" class="button secondary" :disabled="!custom.questions.trim() || form.questions.length >= 3" @click="add('questions', 3)">추가</button></div>
        </section>
      </div>

      <div v-show="currentStep === 2" class="step-panel">
        <section class="card form-section">
          <div class="field-heading"><h2>외부 링크 <small>선택</small></h2><p class="help">작업물이나 관심사를 더 자세히 보여줄 수 있어요.</p></div>
          <label>GitHub<input v-model="form.links.github" type="url" placeholder="https://github.com/username" autocomplete="url"></label>
          <label>Notion<input v-model="form.links.notion" type="url" placeholder="https://notion.so/..."></label>
          <label>Instagram<input v-model="form.links.instagram" type="url" placeholder="https://instagram.com/username"></label>
        </section>
        <section class="card form-section">
          <div class="field-heading"><h2>프로필 공유 설정</h2><p class="help">공개 링크에는 이 사용설명서의 공통 정보가 표시됩니다.</p></div>
          <label>공개 범위<select v-model="form.visibility"><option value="PUBLIC">전체 공개 · 링크로 공유</option><option value="TEAM_ONLY">같은 팀에게 공개</option><option value="PRIVATE">공통 프로필은 나만 보기</option></select></label>
          <p class="help" aria-live="polite">{{ visibilityHelp }} 팀별 역할과 프로젝트 목표는 공개 링크에 포함되지 않아요.</p>
        </section>
      </div>

      <p v-if="saveError" class="error" role="alert">{{ saveError }}</p>
      <div class="sticky-actions step-actions">
        <p class="step-actions-copy help">단계를 이동해도 입력 내용은 유지돼요.</p>
        <router-link v-if="currentStep === 0" class="button secondary" to="/">나중에 작성</router-link>
        <button v-else type="button" class="button secondary" :disabled="saving" @click="goToStep(currentStep - 1)">이전</button>
        <button v-if="currentStep < 2" type="button" class="button" @click="goToStep(currentStep + 1)">다음 단계 <span aria-hidden="true">→</span></button>
        <button v-else class="button" :disabled="saving">{{ saving ? '저장 중…' : '저장하고 미리보기' }}</button>
      </div>
    </form>
  </div>
</template>
