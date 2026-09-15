import { delay, http, HttpResponse } from 'msw'
import { mockStore } from './mockStore'
import { interests } from './interests'
import { styleOptions } from './styleOptions'
import { conversationQuestions } from './conversationQuestions'
import { roles } from './roles'

const copy = (value) => JSON.parse(JSON.stringify(value))
const error = (message, status = 400) => HttpResponse.json({ message }, { status })
const userId = (request) => Number(request.headers.get('x-user-id'))
const teamWithCount = (team) => ({ ...copy(team), memberCount: mockStore.members.filter((member) => member.teamId === team.id).length })
const memberDetail = (member) => ({
  ...copy(member),
  user: copy(mockStore.users.find((user) => user.id === member.userId)),
  profile: copy(mockStore.profiles.find((profile) => profile.userId === member.userId)),
})

export const handlers = [
  http.post('/api/auth/login', async ({ request }) => {
    await delay(250)
    const credentials = await request.json()
    const user = mockStore.users.find((item) => item.email === credentials.email && item.password === credentials.password)
    return user ? HttpResponse.json(copy(user)) : error('이메일 또는 비밀번호를 확인해 주세요.', 401)
  }),
  http.post('/api/auth/signup', async ({ request }) => {
    await delay(300)
    const payload = await request.json()
    if (mockStore.users.some((item) => item.email === payload.email)) return error('이미 가입된 이메일입니다.', 409)
    const user = { id: Date.now(), ...payload }
    mockStore.users.push(user)
    mockStore.profiles.push({ userId: user.id, shareToken: String(user.id), tagline: '', avatar: user.name[0], interests: [], collaboration: [], feedback: [], meeting: [], questions: [], links: { github: '', notion: '', instagram: '' }, visibility: 'PUBLIC' })
    mockStore.save()
    return HttpResponse.json(copy(user), { status: 201 })
  }),
  http.get('/api/profiles/me', ({ request }) => HttpResponse.json(copy(mockStore.profiles.find((profile) => profile.userId === userId(request))))),
  http.patch('/api/profiles/me', async ({ request }) => {
    await delay(250)
    const payload = await request.json()
    const index = mockStore.profiles.findIndex((profile) => profile.userId === userId(request))
    if (index < 0) return error('프로필을 찾을 수 없습니다.', 404)
    mockStore.profiles[index] = { ...mockStore.profiles[index], ...copy(payload) }
    mockStore.save()
    return HttpResponse.json(copy(mockStore.profiles[index]))
  }),
  http.get('/api/interests', () => HttpResponse.json(copy(interests))),
  http.get('/api/style-options', () => HttpResponse.json(copy(styleOptions))),
  http.get('/api/conversation-questions', () => HttpResponse.json(copy(conversationQuestions))),
  http.get('/api/roles', () => HttpResponse.json(copy(roles))),
  http.get('/api/public/profiles/:shareToken', ({ params }) => {
    const profile = mockStore.profiles.find((item) => item.shareToken === params.shareToken && item.visibility === 'PUBLIC')
    if (!profile) return error('공개된 프로필을 찾을 수 없습니다.', 404)
    return HttpResponse.json({ ...copy(profile), user: copy(mockStore.users.find((user) => user.id === profile.userId)) })
  }),
  http.get('/api/teams', ({ request }) => {
    const teamIds = mockStore.members.filter((member) => member.userId === userId(request)).map((member) => member.teamId)
    return HttpResponse.json(mockStore.teams.filter((team) => teamIds.includes(team.id)).map(teamWithCount))
  }),
  http.post('/api/teams', async ({ request }) => {
    await delay(300)
    const payload = await request.json()
    const team = { id: Date.now(), ...payload, inviteCode: Math.random().toString(36).slice(2, 8).toUpperCase(), ownerId: userId(request) }
    mockStore.teams.push(team)
    mockStore.members.push({ id: Date.now() + 1, teamId: team.id, userId: userId(request), roles: [], goal: '', projectLinks: [] })
    mockStore.save()
    return HttpResponse.json(copy(team), { status: 201 })
  }),
  http.get('/api/teams/:teamId', ({ params }) => {
    const team = mockStore.teams.find((item) => item.id === Number(params.teamId))
    return team ? HttpResponse.json(teamWithCount(team)) : error('팀을 찾을 수 없습니다.', 404)
  }),
  http.patch('/api/teams/:teamId', async ({ params, request }) => {
    const index = mockStore.teams.findIndex((team) => team.id === Number(params.teamId))
    if (index < 0) return error('팀을 찾을 수 없습니다.', 404)
    if (mockStore.teams[index].ownerId !== userId(request)) return error('OWNER만 수정할 수 있습니다.', 403)
    mockStore.teams[index] = { ...mockStore.teams[index], ...await request.json() }
    mockStore.save()
    return HttpResponse.json(teamWithCount(mockStore.teams[index]))
  }),
  http.delete('/api/teams/:teamId', ({ params, request }) => {
    const team = mockStore.teams.find((item) => item.id === Number(params.teamId))
    if (!team) return error('팀을 찾을 수 없습니다.', 404)
    if (team.ownerId !== userId(request)) return error('OWNER만 삭제할 수 있습니다.', 403)
    mockStore.teams = mockStore.teams.filter((item) => item.id !== team.id)
    mockStore.members = mockStore.members.filter((member) => member.teamId !== team.id)
    mockStore.save()
    return new HttpResponse(null, { status: 204 })
  }),
  http.get('/api/teams/:teamId/members', ({ params }) => HttpResponse.json(mockStore.members.filter((member) => member.teamId === Number(params.teamId)).map(memberDetail))),
  http.get('/api/teams/:teamId/members/me', ({ params, request }) => {
    const member = mockStore.members.find((item) => item.teamId === Number(params.teamId) && item.userId === userId(request))
    return member ? HttpResponse.json(copy(member)) : error('팀 참여 정보를 찾을 수 없습니다.', 404)
  }),
  http.get('/api/teams/:teamId/members/:memberId', ({ params }) => {
    const member = mockStore.members.find((item) => item.teamId === Number(params.teamId) && item.id === Number(params.memberId))
    return member ? HttpResponse.json(memberDetail(member)) : error('팀원을 찾을 수 없습니다.', 404)
  }),
  http.patch('/api/teams/:teamId/members/me', async ({ params, request }) => {
    await delay(250)
    const index = mockStore.members.findIndex((item) => item.teamId === Number(params.teamId) && item.userId === userId(request))
    if (index < 0) return error('팀 참여 정보를 찾을 수 없습니다.', 404)
    mockStore.members[index] = { ...mockStore.members[index], ...await request.json() }
    mockStore.save()
    return HttpResponse.json(copy(mockStore.members[index]))
  }),
  http.get('/api/team-invitations/:inviteCode', ({ params }) => {
    const team = mockStore.teams.find((item) => item.inviteCode.toLowerCase() === String(params.inviteCode).toLowerCase())
    return team ? HttpResponse.json(teamWithCount(team)) : error('유효하지 않은 초대 코드입니다.', 404)
  }),
  http.post('/api/team-memberships', async ({ request }) => {
    const { inviteCode } = await request.json()
    const team = mockStore.teams.find((item) => item.inviteCode.toLowerCase() === String(inviteCode).toLowerCase())
    if (!team) return error('유효하지 않은 초대 코드입니다.', 404)
    if (!mockStore.members.some((member) => member.teamId === team.id && member.userId === userId(request))) {
      mockStore.members.push({ id: Date.now(), teamId: team.id, userId: userId(request), roles: [], goal: '', projectLinks: [] })
      mockStore.save()
    }
    return HttpResponse.json(teamWithCount(team), { status: 201 })
  }),
]
