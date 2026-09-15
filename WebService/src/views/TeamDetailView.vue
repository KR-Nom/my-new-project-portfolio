<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { teamApi } from '../services/teamApi'
import { authApi } from '../services/authApi'
import AppIcon from '../components/AppIcon.vue'
import MemberCard from '../components/MemberCard.vue'
import BaseModal from '../components/BaseModal.vue'
import ShareModal from '../components/ShareModal.vue'

const route = useRoute()
const router = useRouter()
const team = ref(null)
const members = ref([])
const loading = ref(true)
const error = ref('')
const saving = ref(false)
const modal = ref('')
const mutationError = ref('')
const search = ref('')
const editForm = reactive({ name: '', description: '' })
const owner = computed(() => team.value?.ownerId === authApi.getCurrentUser()?.id)
const inviteUrl = computed(() => team.value ? `${location.origin}/join/${team.value.inviteCode}` : '')
const filteredMembers = computed(() => {
  const keyword = search.value.trim().toLocaleLowerCase()
  if (!keyword) return members.value
  return members.value.filter((member) => [member.user.name, ...(member.roles || [])]
    .some((value) => value.toLocaleLowerCase().includes(keyword)))
})
let loadRequest = 0

async function loadTeam() {
  const request = ++loadRequest
  const teamId = route.params.id
  loading.value = true
  error.value = ''
  try {
    const [nextTeam, nextMembers] = await Promise.all([
      teamApi.getTeam(teamId),
      teamApi.getTeamMembers(teamId),
    ])
    if (request !== loadRequest) return
    team.value = nextTeam
    members.value = nextMembers
  } catch (cause) {
    if (request === loadRequest) error.value = cause.message || '잠시 후 다시 시도해 주세요.'
  } finally {
    if (request === loadRequest) loading.value = false
  }
}

function closeModal() {
  if (saving.value) return
  modal.value = ''
  mutationError.value = ''
}

function openEdit() {
  editForm.name = team.value.name
  editForm.description = team.value.description
  mutationError.value = ''
  modal.value = 'edit'
}

async function updateTeam() {
  if (saving.value) return
  mutationError.value = ''
  if (!editForm.name.trim() || !editForm.description.trim()) {
    mutationError.value = '팀 이름과 소개를 입력해 주세요.'
    return
  }
  saving.value = true
  try {
    team.value = await teamApi.updateTeam(team.value.id, {
      name: editForm.name.trim(),
      description: editForm.description.trim(),
    })
    modal.value = ''
  } catch (cause) {
    mutationError.value = cause.message || '저장하지 못했어요. 다시 시도해 주세요.'
  } finally {
    saving.value = false
  }
}

async function removeTeam() {
  if (saving.value) return
  saving.value = true
  mutationError.value = ''
  try {
    await teamApi.deleteTeam(team.value.id)
    await router.push('/teams')
  } catch (cause) {
    mutationError.value = cause.message || '삭제하지 못했어요. 다시 시도해 주세요.'
  } finally {
    saving.value = false
  }
}

watch(() => route.params.id, () => {
  search.value = ''
  modal.value = ''
  team.value = null
  loadTeam()
}, { immediate: true })
</script>

<template>
  <div v-if="loading" class="loading-card" role="status">
    <span class="spinner" aria-hidden="true" /> 팀 보드를 불러오고 있어요.
  </div>
  <div v-else-if="error" class="empty error-state" role="alert">
    <strong>팀 보드를 불러오지 못했어요.</strong>
    <p>{{ error }}</p>
    <div class="actions">
      <router-link class="button secondary" to="/teams">내 팀으로</router-link>
      <button class="button" @click="loadTeam">다시 불러오기</button>
    </div>
  </div>
  <div v-else-if="team">
    <router-link class="back" to="/teams"><AppIcon name="arrow-left" /> 내 팀으로</router-link>
    <section class="team-hero">
      <div>
        <p class="eyebrow">TEAM BOARD</p>
        <h1>{{ team.name }}</h1>
        <p>{{ team.description }}</p>
        <div class="meta"><span><AppIcon name="users" /> {{ members.length }}명의 팀원</span><span v-if="owner">내가 만든 팀</span></div>
      </div>
      <div class="actions">
        <router-link class="button outline-light" :to="`/teams/${team.id}/me/edit`">내 역할·목표 작성</router-link>
        <button class="button light-button" @click="modal = 'share'"><AppIcon name="plus" /> 팀원 초대</button>
      </div>
    </section>
    <div v-if="owner" class="owner-bar">
      <span class="owner-label">팀 관리</span>
      <button @click="openEdit">팀 정보 수정</button>
      <button class="danger-text" @click="mutationError = ''; modal = 'delete'">팀 삭제</button>
    </div>

    <div class="section-title">
      <div>
        <p class="eyebrow">GET TO KNOW YOUR TEAM</p>
        <h2>우리가 함께할 방식</h2>
        <p class="muted">희망 역할과 목표를 먼저 확인하고, 사용설명서에서 동료를 더 알아보세요.</p>
      </div>
      <span class="member-count">{{ members.length }}명</span>
    </div>
    <div class="member-toolbar">
      <label class="search-field" for="member-search">
        <AppIcon name="search" />
        <input id="member-search" v-model="search" type="search" placeholder="이름 또는 희망 역할 검색" aria-label="이름 또는 희망 역할로 팀원 검색">
      </label>
      <p class="muted" aria-live="polite">{{ search.trim() ? '검색 결과' : '전체 팀원' }} <strong>{{ filteredMembers.length }}명</strong></p>
    </div>
    <div v-if="filteredMembers.length" class="member-grid">
      <MemberCard v-for="member in filteredMembers" :key="member.id" :member="member" :team-id="team.id" />
    </div>
    <div v-else-if="search.trim()" class="empty">
      <AppIcon class="empty-state-icon" name="search" />
      <h3>일치하는 팀원이 없어요.</h3>
      <p>다른 이름이나 희망 역할로 검색해 보세요.</p>
      <button class="button secondary" @click="search = ''">전체 팀원 보기</button>
    </div>
    <div v-else class="empty">
      <AppIcon class="empty-state-icon" name="users" />
      <h3>함께할 팀원을 초대해 보세요.</h3>
      <p>초대 링크를 공유하면 이곳에서 팀원의 희망 역할과 목표를 볼 수 있어요.</p>
      <button class="button" @click="modal = 'share'">팀원 초대하기</button>
    </div>

    <ShareModal :open="modal === 'share'" title="팀원 초대하기" :url="inviteUrl" :code="team.inviteCode" @close="closeModal" />
    <BaseModal :open="modal === 'edit'" title="팀 정보 수정" @close="closeModal">
      <form class="form-section" :aria-busy="saving" @submit.prevent="updateTeam">
        <label for="edit-team-name">팀 이름<input id="edit-team-name" v-model.trim="editForm.name" :disabled="saving" required maxlength="40"></label>
        <label for="edit-team-description">팀 소개<textarea id="edit-team-description" v-model.trim="editForm.description" :disabled="saving" required rows="4" maxlength="160" /></label>
        <p v-if="mutationError" class="error" role="alert">{{ mutationError }}</p>
        <div class="actions end">
          <button type="button" class="button secondary" :disabled="saving" @click="closeModal">취소</button>
          <button class="button" :disabled="saving">{{ saving ? '저장 중…' : '변경 저장' }}</button>
        </div>
      </form>
    </BaseModal>
    <BaseModal :open="modal === 'delete'" title="팀을 삭제할까요?" @close="closeModal">
      <div class="confirm-body" :aria-busy="saving">
        <div class="warning-icon" aria-hidden="true">!</div>
        <p><strong>{{ team.name }}</strong>과 팀원의 팀별 프로필이 삭제됩니다.<br>삭제한 팀은 복구할 수 없습니다.</p>
        <p v-if="mutationError" class="error" role="alert">{{ mutationError }}</p>
        <div class="actions end">
          <button class="button secondary" :disabled="saving" @click="closeModal">취소</button>
          <button class="button danger" :disabled="saving" @click="removeTeam">{{ saving ? '삭제 중…' : '팀 삭제' }}</button>
        </div>
      </div>
    </BaseModal>
  </div>
</template>
