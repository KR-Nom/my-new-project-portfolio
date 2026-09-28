<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authApi } from './services/authApi'
import AppIcon from './components/AppIcon.vue'

const route = useRoute()
const router = useRouter()
const user = computed(() => { route.fullPath; return authApi.getCurrentUser() })
const showWorkspace = computed(() => user.value && !route.meta.public && !route.meta.guest)
const pageTitle = computed(() => route.path.startsWith('/profile') ? '내 사용설명서' : route.path.startsWith('/teams') || route.path.startsWith('/join') ? '팀 워크스페이스' : '홈')
const navigation = [
  { path: '/', label: '홈', icon: 'home', active: () => route.path === '/' },
  { path: '/profile/preview', label: '내 사용설명서', icon: 'book', active: () => route.path.startsWith('/profile') },
  { path: '/teams', label: '내 팀', icon: 'users', active: () => route.path.startsWith('/teams') || route.path.startsWith('/join') },
]
const logoutError = ref('')
async function logout() {
  try { await authApi.logout(); logoutError.value = ''; await router.push('/login') }
  catch { logoutError.value = '로그아웃하지 못했어요. 다시 시도해 주세요.' }
}
</script>

<template>
  <div v-if="showWorkspace" class="app-layout">
    <a class="skip-link" href="#main-content">본문으로 이동</a>
    <aside class="sidebar">
      <router-link to="/" class="brand sidebar-brand" aria-label="HowToDo 홈">
        <span class="brand-mark"><AppIcon name="book" :size="21" /></span><span>HowToDo<span class="brand-caption">우리 팀의 협업 사용설명서</span></span>
      </router-link>
      <p class="workspace-label">나의 워크스페이스</p>
      <nav class="side-nav" aria-label="주 메뉴">
        <router-link v-for="item in navigation" :key="item.path" :to="item.path" :class="{ 'is-active': item.active() }" :aria-current="item.active() ? 'page' : undefined">
          <AppIcon :name="item.icon" /><span>{{ item.label }}</span>
        </router-link>
      </nav>
      <div class="sidebar-note"><AppIcon name="sparkles" /><strong>함께 일하는 나를 알려주세요.</strong><p>희망 역할과 협업 방식을 나누며<br>우리 팀의 첫 대화를 시작해요.</p><router-link to="/profile/edit">내 프로필 다듬기 <AppIcon name="arrow-right" :size="16" /></router-link></div>
      <router-link class="developer-link" to="/api-docs"><AppIcon name="code" :size="16" /> API 문서</router-link>
      <div class="account-card"><div class="avatar small">{{ user?.name?.[0] }}</div><div><strong>{{ user?.name }}</strong><span>{{ user?.email }}</span></div><button aria-label="로그아웃" title="로그아웃" @click="logout"><AppIcon name="logout" :size="18" /></button></div>
    </aside>
    <div class="workspace-main">
      <header class="workspace-header"><div><router-link class="mobile-brand" to="/">HowToDo</router-link><span class="header-breadcrumb">워크스페이스 <span>/</span></span><strong>{{ pageTitle }}</strong></div><div class="header-actions"><router-link class="header-profile" to="/profile/preview"><span>{{ user?.name }}</span><div class="avatar tiny">{{ user?.name?.[0] }}</div></router-link><button class="mobile-logout icon-button" aria-label="로그아웃" @click="logout"><AppIcon name="logout" :size="18" /></button></div></header>
      <main id="main-content" class="shell" tabindex="-1"><p v-if="logoutError" class="error" role="alert">{{ logoutError }}</p><router-view /></main>
    </div>
  </div>
  <main v-else><router-view /></main>
</template>
