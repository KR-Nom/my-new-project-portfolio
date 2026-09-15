import { apiRequest } from './httpClient'

export const profileApi = {
  getMyProfile: () => apiRequest('/profiles/me'),
  updateMyProfile: (payload) => apiRequest('/profiles/me', { method: 'PATCH', body: JSON.stringify(payload) }),
  getPublicProfile: (token) => apiRequest(`/public/profiles/${token}`),
  async getOptions() {
    const [interests, styleOptions, conversationQuestions, roles] = await Promise.all([
      apiRequest('/interests'), apiRequest('/style-options'), apiRequest('/conversation-questions'), apiRequest('/roles'),
    ])
    return { interests, styleOptions, conversationQuestions, roles }
  },
}
