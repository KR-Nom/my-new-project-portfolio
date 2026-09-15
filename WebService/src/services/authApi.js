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
  getCurrentUser() { return JSON.parse(localStorage.getItem('manual_user') || 'null') },
  logout() { localStorage.removeItem('manual_user') },
}
