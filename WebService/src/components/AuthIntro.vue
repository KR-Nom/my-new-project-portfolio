<script setup>
import AppIcon from './AppIcon.vue'
</script>

<template>
  <section class="auth-copy">
    <router-link class="brand" to="/login"><span class="brand-mark"><AppIcon name="book" :size="21" /></span>HowToDo</router-link>
    <div class="auth-story"><span class="welcome-kicker"><AppIcon name="sparkles" :size="17" /> 새로운 팀, 더 편한 시작</span><h1>나를 알리고,<br>팀을 알아가는<br><span>가장 쉬운 시작.</span></h1><p>관심사부터 일하는 방식까지.<br>우리 팀만의 협업 사용설명서를 만들어 보세요.</p></div>
    <div class="auth-features"><div><span class="step-icon"><AppIcon name="book" /></span><div><strong>이렇게 일하는 사람이에요</strong><p>나의 협업 방식과 관심사를 한곳에</p></div></div><div><span class="step-icon"><AppIcon name="users" /></span><div><strong>이번 팀에서는 이걸 해보고 싶어요</strong><p>서로의 희망 역할과 목표를 먼저 공유</p></div></div></div>
    <p class="auth-caption">서로를 이해하는 순간, 협업이 시작됩니다.</p>
  </section>
</template>
