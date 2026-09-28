<script setup>
import { onBeforeUnmount, onMounted } from 'vue'
import SwaggerUIBundle from 'swagger-ui-dist/swagger-ui-bundle.js'
import SwaggerUIStandalonePreset from 'swagger-ui-dist/swagger-ui-standalone-preset.js'
import 'swagger-ui-dist/swagger-ui.css'

onMounted(() => {
  SwaggerUIBundle({
    url: '/specs/ServiceAPI.json',
    dom_id: '#swagger-ui',
    deepLinking: true,
    displayRequestDuration: true,
    persistAuthorization: true,
    presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
    layout: 'BaseLayout',
  })
})
onBeforeUnmount(() => { document.getElementById('swagger-ui')?.replaceChildren() })
</script>
<template><div class="api-docs-page"><div class="docs-intro"><div><p class="eyebrow">OPENAPI 3.0</p><h1>TEAM MANUAL API</h1><p>Node.js 서버와 SQLite로 연결된 실제 API입니다.</p></div><a class="button secondary" href="/specs/ServiceAPI.json" target="_blank">OAS 원본 보기</a></div><div class="docs-tip"><strong>Try it out 사용법</strong><span>앱에서 로그인하면 HttpOnly 세션 쿠키가 자동으로 전달됩니다. 저장 요청은 실제 데이터에 반영됩니다.</span></div><div id="swagger-ui"/></div></template>
