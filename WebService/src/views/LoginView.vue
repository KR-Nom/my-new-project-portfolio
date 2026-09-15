<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { authApi } from '../services/authApi'
import AuthIntro from '../components/AuthIntro.vue'
import AppIcon from '../components/AppIcon.vue'

const router = useRouter()
const email = ref('hyeonjin@example.com')
const password = ref('1234')
const error = ref('')
const loading = ref(false)
async function submit() {
  if (loading.value) return
  try {
    loading.value = true
    error.value = ''
    await authApi.login({ email: email.value.trim(), password: password.value })
    await router.push('/')
  } catch (e) { error.value = e.message }
  finally { loading.value = false }
}
</script>

<template>
  <div class="auth-page">
    <AuthIntro />
    <section class="auth-form-area">
      <form class="auth-card" @submit.prevent="submit" :aria-busy="loading">
        <div class="auth-heading"><p class="eyebrow">WELCOME BACK</p><h2>다시 만나 반가워요.</h2><p>내 사용설명서와 함께할 팀이 기다리고 있어요.</p></div>
        <label for="login-email">이메일<input id="login-email" v-model="email" type="email" autocomplete="username" inputmode="email" required placeholder="name@example.com"></label>
        <label for="login-password">비밀번호<input id="login-password" v-model="password" type="password" autocomplete="current-password" required placeholder="비밀번호를 입력하세요"></label>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
        <button class="button full" :disabled="loading"><span v-if="loading" class="spinner" />{{ loading ? '로그인 중…' : '로그인' }}<AppIcon v-if="!loading" name="arrow-right" :size="18" /></button>
        <p class="auth-switch">처음 오셨나요? <router-link to="/signup">회원가입</router-link></p>
        <div class="demo"><AppIcon name="sparkles" :size="18" /><div><strong>먼저 둘러보고 싶다면?</strong><p>체험 계정이 입력되어 있어요. 로그인 버튼을 눌러 바로 시작하세요.</p></div></div>
      </form>
      <p class="auth-form-footer">HowToDo · 우리 팀의 협업 사용설명서</p>
    </section>
  </div>
</template>
