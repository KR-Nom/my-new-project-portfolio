<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { authApi } from '../services/authApi'
import AuthIntro from '../components/AuthIntro.vue'
import AppIcon from '../components/AppIcon.vue'
const router = useRouter()
const form = reactive({ name: '', email: '', password: '' })
const error = ref('')
const loading = ref(false)
async function submit() {
  if (loading.value) return
  if (!form.name.trim()) { error.value = '이름을 입력해 주세요.'; return }
  try {
    loading.value = true
    error.value = ''
    await authApi.signup(form)
    await router.push('/profile/edit')
  } catch (e) { error.value = e.message }
  finally { loading.value = false }
}
</script>

<template>
  <div class="auth-page"><AuthIntro /><section class="auth-form-area">
    <form class="auth-card" @submit.prevent="submit" :aria-busy="loading">
      <div class="auth-heading"><p class="eyebrow">LET'S GET STARTED</p><h2>함께할 준비를 시작해요.</h2><p>계정을 만들고, 나의 협업 방식을 알려주세요.</p></div>
      <label for="signup-name">이름<input id="signup-name" v-model.trim="form.name" required autocomplete="name" maxlength="30" placeholder="팀원에게 보여줄 이름"></label>
      <label for="signup-email">이메일<input id="signup-email" v-model.trim="form.email" type="email" autocomplete="username" required placeholder="name@example.com"></label>
      <label for="signup-password">비밀번호<input id="signup-password" v-model="form.password" type="password" autocomplete="new-password" minlength="4" required placeholder="4자 이상 입력해 주세요"></label>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <button class="button full" :disabled="loading">{{ loading ? '계정 만드는 중…' : '사용설명서 만들기' }}<AppIcon name="arrow-right" :size="18" /></button>
      <p class="auth-switch">이미 계정이 있나요? <router-link to="/login">로그인</router-link></p>
    </form><p class="auth-form-footer">HowToDo · 우리 팀의 협업 사용설명서</p>
  </section></div>
</template>
