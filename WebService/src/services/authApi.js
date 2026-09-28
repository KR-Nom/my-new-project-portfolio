import { apiRequest } from './httpClient'

export const authApi = {
  async login(credentials) {
    const user = await apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(credentials) })
    localStorage.setItem('manual_user', JSON.stringify(user))
    return user
  },
  async signup(payload) {
    const user = await apiRequest('/auth/signup', { method: 'POST', body: JSON.stringify(payload) })
    localStorage.setItem('manual_user', JSON.stringify(user))
    return user
  },
  getCurrentUser() {
    try { return JSON.parse(localStorage.getItem('manual_user') || 'null') }
    catch { localStorage.removeItem('manual_user'); return null }
  },
  async refreshSession() {
    if (import.meta.env.VITE_ENABLE_MOCKS === 'true') return this.getCurrentUser()
    try {
      const user = await apiRequest('/auth/me')
      localStorage.setItem('manual_user', JSON.stringify(user))
      return user
    } catch { localStorage.removeItem('manual_user'); return null }
  },
  async logout() {
    if (import.meta.env.VITE_ENABLE_MOCKS !== 'true') await apiRequest('/auth/logout', { method: 'POST', body: '{}' })
    localStorage.removeItem('manual_user')
  },
}
