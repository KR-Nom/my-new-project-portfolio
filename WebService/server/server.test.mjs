/** Actual HTTP + SQLite integration tests; each run uses an isolated temporary DB. */
import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'

const root = fileURLToPath(new URL('../', import.meta.url))
const checks = []
const owner = { cookie: '' }, member = { cookie: '' }
let directory, databasePath, processHandle, base, teamId, inviteCode, ownerId, memberId, shareToken
const credentials = { name: '통합 검증', email: 'integration@example.com', password: 'test-only-password' }
async function start() {
  processHandle = spawn(process.execPath, ['server/server.mjs'], { cwd: root, env: { ...process.env, HOWTODO_DB: databasePath, HOWTODO_SEED: 'false', PORT: '0' }, stdio: ['ignore', 'pipe', 'pipe'] })
  base = await new Promise((resolve, reject) => {
    let buffer = ''
    const timer = setTimeout(() => reject(new Error('Server did not start')), 10000)
    processHandle.once('exit', () => { clearTimeout(timer); reject(new Error('Server exited before readiness')) })
    processHandle.stdout.on('data', value => {
      buffer += value
      for (const line of buffer.split('\n').slice(0, -1)) {
        const event = JSON.parse(line)
        if (event.ready) { clearTimeout(timer); resolve(`http://127.0.0.1:${event.port}`) }
      }
      buffer = buffer.split('\n').at(-1)
    })
  })
}
async function stop() {
  if (!processHandle || processHandle.exitCode !== null) return
  const child = processHandle
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('Server did not stop')) }, 10000)
    child.once('exit', () => { clearTimeout(timer); resolve() })
    child.kill('SIGTERM')
  })
}
async function request(path, { method = 'GET', payload, jar, headers = {} } = {}) {
  const response = await fetch(base + '/api' + path, {
    method, headers: { ...(payload !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(jar?.cookie ? { Cookie: jar.cookie } : {}), ...headers },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  })
  const setCookie = response.headers.get('set-cookie')
  if (jar && setCookie) jar.cookie = setCookie.split(';')[0]
  const value = response.status === 204 ? null : await response.json()
  return { status: response.status, value, setCookie }
}
const verified = (name, work) => test(name, async () => {
  try { await work(); checks.push({ name, passed: true }) }
  catch (error) { checks.push({ name, passed: false }); throw error }
})
before(async () => { directory = await mkdtemp(join(tmpdir(), 'howtodo-api-')); databasePath = join(directory, 'test.sqlite'); await start() })
after(async () => {
  await stop()
  const reportDirectory = join(root, 'report-assets/full-stack')
  await mkdir(reportDirectory, { recursive: true })
  await writeFile(join(reportDirectory, 'api-verification.json'), JSON.stringify({
    executedAt: new Date().toISOString(), runtime: process.version, kind: 'actual HTTP requests against Node server and file-backed SQLite',
    testDatabase: 'isolated temporary database (removed after tests)', processRestart: true,
    passed: checks.length === 12 && checks.every(check => check.passed), count: checks.length, checks,
  }, null, 2) + '\n')
  await rm(directory, { recursive: true, force: true })
})

verified('Forged x-user-id cannot authenticate', async () => {
  assert.equal((await request('/teams', { headers: { 'x-user-id': '1' } })).status, 401)
  assert.equal((await request('/health')).value.database, 'sqlite')
})
verified('Signup stores scrypt hash, issues HttpOnly session, normalizes duplicate email', async () => {
  const result = await request('/auth/signup', { method: 'POST', payload: credentials, jar: owner })
  assert.equal(result.status, 201)
  assert.match(result.setCookie, /HttpOnly/); assert.match(result.setCookie, /SameSite=Lax/)
  assert.equal('password' in result.value, false); assert.equal('user_password_hash' in result.value, false)
  ownerId = result.value.id
  assert.equal((await request('/auth/signup', { method: 'POST', payload: { ...credentials, email: credentials.email.toUpperCase() } })).status, 409)
  const db = new DatabaseSync(databasePath, { readOnly: true })
  const saved = db.prepare('SELECT user_password_hash FROM users WHERE user_id=?').get(ownerId).user_password_hash
  assert.match(saved, /^scrypt:/); assert.equal(saved.includes(credentials.password), false)
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM profiles WHERE user_id=?').get(ownerId).count, 1)
  db.close()
})
verified('Login validates password and rotates the existing session', async () => {
  assert.equal((await request('/auth/login', { method: 'POST', payload: { ...credentials, password: 'incorrect-password' } })).status, 401)
  const old = { cookie: owner.cookie }
  assert.equal((await request('/auth/login', { method: 'POST', payload: credentials, jar: owner })).status, 200)
  assert.equal((await request('/auth/me', { jar: old })).status, 401)
  assert.equal((await request('/auth/me', { jar: owner })).value.name, credentials.name)
})
verified('Creating a team creates its owner membership atomically', async () => {
  const created = await request('/teams', { method: 'POST', payload: { name: '통합서비스 팀', description: '프로필과 역할을 연결하는 팀' }, jar: owner })
  assert.equal(created.status, 201)
  assert.equal(created.value.ownerId, ownerId); assert.equal(created.value.memberCount, 1)
  teamId = created.value.id; inviteCode = created.value.inviteCode
  assert.equal((await request(`/teams/${teamId}/members/me`, { jar: owner })).value.userId, ownerId)
  const signup = await request('/auth/signup', { method: 'POST', payload: { name: '팀 동료', email: 'colleague@example.com', password: 'test-only-password' }, jar: member })
  memberId = signup.value.id
  assert.equal((await request(`/teams/${teamId}`, { jar: member })).status, 403)
  assert.equal((await request(`/teams/${teamId}/members`, { jar: member })).status, 403)
})
verified('Invitation joins once and preserves role priority in relational tables', async () => {
  assert.equal((await request(`/team-invitations/${inviteCode.toLowerCase()}`, { jar: member })).status, 200)
  assert.equal((await request('/team-memberships', { method: 'POST', payload: { inviteCode }, jar: member })).status, 201)
  assert.equal((await request('/team-memberships', { method: 'POST', payload: { inviteCode }, jar: member })).status, 200)
  const saved = await request(`/teams/${teamId}/members/me`, { method: 'PATCH', payload: { goal: 'API와 DB를 연결해요.', roles: ['AI', 'Backend'], projectLinks: [{ label: 'Repository', url: 'https://github.com/KR-Nom/my-new-project-portfolio' }] }, jar: member })
  assert.equal(saved.status, 200); assert.deepEqual(saved.value.roles, ['AI', 'Backend'])
  assert.equal((await request(`/teams/${teamId}`, { jar: owner })).value.memberCount, 2)
  const members = (await request(`/teams/${teamId}/members`, { jar: owner })).value
  assert.equal(members.some(m => 'email' in m.user || 'password' in m.user), false)
})
verified('Only owner can mutate team and payload cannot change ownership', async () => {
  assert.equal((await request(`/teams/${teamId}`, { method: 'PATCH', payload: { name: 'Unauthorized' }, jar: member })).status, 403)
  assert.equal((await request(`/teams/${teamId}`, { method: 'DELETE', jar: member })).status, 403)
  const result = await request(`/teams/${teamId}`, { method: 'PATCH', payload: { name: '저장된 협업 팀', ownerId: memberId }, jar: owner })
  assert.equal(result.status, 200); assert.equal(result.value.ownerId, ownerId)
})
verified('Profile public, team-only and private visibility are enforced server-side', async () => {
  shareToken = (await request('/profiles/me', { jar: owner })).value.shareToken
  const patch = payload => request('/profiles/me', { method: 'PATCH', payload, jar: owner })
  assert.equal((await patch({ tagline: '서버에 저장한 소개', interests: ['AI', '테스트'], visibility: 'PUBLIC', userId: memberId, shareToken: 'overwritten' })).status, 200)
  const publicProfile = (await request(`/public/profiles/${shareToken}`)).value
  assert.equal(publicProfile.tagline, '서버에 저장한 소개'); assert.equal(publicProfile.userId, ownerId)
  assert.equal('email' in publicProfile.user, false)
  await patch({ visibility: 'TEAM_ONLY' })
  assert.equal((await request(`/public/profiles/${shareToken}`)).status, 404)
  const teamProfile = (await request(`/teams/${teamId}/members`, { jar: member })).value.find(m => m.userId === ownerId).profile
  assert.equal(teamProfile.tagline, '서버에 저장한 소개')
  await patch({ visibility: 'PRIVATE' })
  const hidden = (await request(`/teams/${teamId}/members`, { jar: member })).value.find(m => m.userId === ownerId).profile
  assert.deepEqual(hidden, { visibility: 'PRIVATE', restricted: true })
  assert.equal((await request('/profiles/me', { jar: owner })).value.tagline, '서버에 저장한 소개')
})
verified('Invalid URLs and excessive roles fail without partially saving data', async () => {
  assert.equal((await request('/profiles/me', { method: 'PATCH', payload: { tagline: 'Should not persist', links: { github: 'javascript:alert(1)' } }, jar: owner })).status, 400)
  assert.equal((await request('/profiles/me', { jar: owner })).value.tagline, '서버에 저장한 소개')
  assert.equal((await request(`/teams/${teamId}/members/me`, { method: 'PATCH', payload: { goal: 'Should not persist', roles: ['AI', 'Data', 'Backend', 'Frontend'] }, jar: member })).status, 400)
  assert.equal((await request(`/teams/${teamId}/members/me`, { jar: member })).value.goal, 'API와 DB를 연결해요.')
})
verified('Foreign origin cannot write using an existing session', async () => {
  assert.equal((await request('/profiles/me', { method: 'PATCH', payload: { tagline: 'cross-origin' }, jar: owner, headers: { Origin: 'https://untrusted.example' } })).status, 403)
})
verified('SQLite profile, team and login session survive an actual server process restart', async () => {
  const oldPid = processHandle.pid
  await stop(); await start()
  assert.notEqual(processHandle.pid, oldPid)
  assert.equal((await request('/profiles/me', { jar: owner })).value.tagline, '서버에 저장한 소개')
  assert.equal((await request(`/teams/${teamId}`, { jar: owner })).value.name, '저장된 협업 팀')
  assert.deepEqual((await request(`/teams/${teamId}/members/me`, { jar: member })).value.roles, ['AI', 'Backend'])
})
verified('Deleting a team cascades memberships and member roles', async () => {
  assert.equal((await request(`/teams/${teamId}`, { method: 'DELETE', jar: owner })).status, 204)
  assert.equal((await request(`/teams/${teamId}`, { jar: owner })).status, 404)
  const db = new DatabaseSync(databasePath, { readOnly: true })
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM team_members WHERE team_id=?').get(teamId).count, 0)
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM member_roles').get().count, 0)
  db.close()
})
verified('Logout revokes server session even when previous cookie is replayed', async () => {
  const previous = { cookie: owner.cookie }
  assert.equal((await request('/auth/logout', { method: 'POST', payload: {}, jar: owner })).status, 204)
  assert.equal((await request('/auth/me', { jar: previous })).status, 401)
})
