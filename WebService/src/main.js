import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './assets/main.css'

async function enableMocking() {
  const { worker } = await import('./mocks/browser')
  return worker.start({ onUnhandledRequest: 'bypass' })
}

enableMocking().then(() => createApp(App).use(router).mount('#app'))
