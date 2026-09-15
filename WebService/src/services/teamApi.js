import { apiRequest } from './httpClient'

export const teamApi = {
  getTeams: () => apiRequest('/teams'),
  getTeam: (id) => apiRequest(`/teams/${id}`),
  createTeam: (payload) => apiRequest('/teams', { method: 'POST', body: JSON.stringify(payload) }),
  updateTeam: (id, payload) => apiRequest(`/teams/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteTeam: (id) => apiRequest(`/teams/${id}`, { method: 'DELETE' }),
  getTeamMembers: (id) => apiRequest(`/teams/${id}/members`),
  getMember: (teamId, memberId) => apiRequest(`/teams/${teamId}/members/${memberId}`),
  getMyMembership: (teamId) => apiRequest(`/teams/${teamId}/members/me`),
  updateMyMembership: (teamId, payload) => apiRequest(`/teams/${teamId}/members/me`, { method: 'PATCH', body: JSON.stringify(payload) }),
  getInvitation: (code) => apiRequest(`/team-invitations/${encodeURIComponent(code)}`),
  joinTeam: (inviteCode) => apiRequest('/team-memberships', { method: 'POST', body: JSON.stringify({ inviteCode }) }),
}
