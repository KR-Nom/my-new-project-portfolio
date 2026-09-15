<script setup>
import { computed } from 'vue'
import SocialLinks from './SocialLinks.vue'

const props = defineProps({
  profile: { type: Object, required: true },
  user: { type: Object, default: () => ({ name: '팀원' }) },
  publicView: Boolean,
})
const styleSections = [
  { field: 'collaboration', title: '함께 일할 때', subtitle: '협업 스타일', number: '02' },
  { field: 'feedback', title: '피드백을 받을 때', subtitle: '피드백 선호 방식', number: '03' },
  { field: 'meeting', title: '회의를 할 때', subtitle: '회의 스타일', number: '04' },
]
const name = computed(() => props.user?.name || '팀원')
const hasLinks = computed(() => Object.values(props.profile.links || {}).some(Boolean))
</script>

<template>
  <article class="profile">
    <section class="profile-hero">
      <div class="avatar large" aria-hidden="true">{{ profile.avatar || name[0] }}</div>
      <div><p class="eyebrow">COLLABORATION MANUAL</p><h1>{{ name }}</h1><p class="lead">{{ profile.tagline || '서로를 알아가는 첫 대화를 시작해 보세요.' }}</p></div>
    </section>

    <section class="profile-grid" aria-label="관심사와 협업 방식">
      <div class="card">
        <div class="profile-section-heading"><span>01</span><div><p class="label">대화의 공통점</p><h2>관심사와 취미</h2></div></div>
        <div v-if="profile.interests?.length" class="chips"><span v-for="tag in profile.interests" :key="tag" class="chip selected">{{ tag }}</span></div>
        <p v-else class="profile-empty help">아직 등록한 관심사가 없어요.</p>
      </div>
      <div v-for="section in styleSections" :key="section.field" class="card">
        <div class="profile-section-heading"><span>{{ section.number }}</span><div><p class="label">{{ section.subtitle }}</p><h2>{{ section.title }}</h2></div></div>
        <ul v-if="profile[section.field]?.length" class="profile-list"><li v-for="item in profile[section.field]" :key="item">{{ item }}</li></ul>
        <p v-else class="profile-empty help">아직 등록한 내용이 없어요.</p>
      </div>
    </section>

    <section class="card conversation">
      <p class="eyebrow">LET'S TALK</p><h2>이런 이야기부터 시작해요</h2>
      <ul v-if="profile.questions?.length" class="conversation-list"><li v-for="(question, index) in profile.questions" :key="question"><span aria-hidden="true">0{{ index + 1 }}</span><p>{{ question }}</p></li></ul>
      <p v-else class="profile-empty help">궁금한 관심사나 협업 방식부터 물어보세요.</p>
    </section>
    <section v-if="hasLinks || !publicView" class="card">
      <div class="field-heading"><h2>더 알아보기</h2><p class="help">작업물과 관심사를 만날 수 있는 링크예요.</p></div>
      <SocialLinks :links="profile.links" />
    </section>
  </article>
</template>
