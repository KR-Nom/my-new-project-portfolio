<script setup>
import { onBeforeUnmount, onMounted } from 'vue'
import SwaggerUIBundle from 'swagger-ui-dist/swagger-ui-bundle.js'
import SwaggerUIStandalonePreset from 'swagger-ui-dist/swagger-ui-standalone-preset.js'
import 'swagger-ui-dist/swagger-ui.css'

onMounted(() => {
  SwaggerUIBundle({
    url: '/specs/API.yml',
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
<template><div class="api-docs-page"><div class="docs-intro"><div><p class="eyebrow">OPENAPI 3.0</p><h1>TEAM MANUAL API</h1><p>MSW가 응답하는 Mock API를 조회하고 직접 실행할 수 있습니다.</p></div><a class="button secondary" href="/specs/API.yml" target="_blank">OAS 원본 보기</a></div><div class="docs-tip"><strong>Try it out 사용법</strong><span>Authorize에 Mock 사용자 ID <code>1</code>을 입력한 뒤 API를 실행하세요.</span></div><div id="swagger-ui"/></div></template>
