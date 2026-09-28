import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { authApi } from './services/authApi'
import './assets/main.css'

async function enableMocking() {
  if (import.meta.env.VITE_ENABLE_MOCKS !== 'true') {
    // A previous mock-only visit must not continue intercepting real API calls.
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.filter(r => [r.active, r.waiting, r.installing].some(w => w?.scriptURL.endsWith('/mockServiceWorker.js'))).map(r => r.unregister()))
      if (navigator.serviceWorker.controller?.scriptURL.endsWith('/mockServiceWorker.js')) {
        location.reload()
        return false
      }
    }
    await authApi.refreshSession()
    return true
  }
  const { worker } = await import('./mocks/browser')
  await worker.start({ onUnhandledRequest: 'bypass' })
  return true
}

enableMocking().then(ready => { if (ready) createApp(App).use(router).mount('#app') })
