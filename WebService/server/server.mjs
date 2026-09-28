/** HowToDo full-stack extension. Run: npm run server. Node.js 26+, no server packages. */
import { createServer } from 'node:http'
import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { readFile, stat } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { extname, resolve, sep } from 'node:path'
import { openDatabase } from './database.mjs'
import { styleOptions } from '../src/mocks/styleOptions.js'
import { conversationQuestions } from '../src/mocks/conversationQuestions.js'

const scryptAsync = promisify(scrypt)
const projectRoot = fileURLToPath(new URL('../', import.meta.url))
const hashToken = value => createHash('sha256').update(value).digest('hex')
const cookieName = 'howtodo_session'
const sessionSeconds = 7 * 24 * 60 * 60
const fail = (status, message) => { throw Object.assign(new Error(message), { status }) }
const text = (value, label, max, required = false) => {
  if (typeof value !== 'string') fail(400, `${label} 형식을 확인해 주세요.`)
  const result = value.trim()
  if ((required && !result) || result.length > max) fail(400, `${label}은(는) ${required ? '1~' : '최대 '}${max}자까지 입력해 주세요.`)
  return result
}
const list = (value, label, maxItems, maxLength) => {
  if (!Array.isArray(value) || value.length > maxItems) fail(400, `${label}은(는) 최대 ${maxItems}개입니다.`)
  return [...new Set(value.map(v => text(v, label, maxLength, true)))]
}
const webUrl = (value, label) => {
  const result = text(value, label, 2048)
  if (!result) return ''
  try { if (!['https:', 'http:'].includes(new URL(result).protocol)) throw new Error() }
  catch { fail(400, `${label}은(는) http 또는 https 주소여야 합니다.`) }
  return result
}
const object = value => value && typeof value === 'object' && !Array.isArray(value)
async function bodyJson(request) {
  if (!request.headers['content-type']?.startsWith('application/json')) fail(415, 'JSON으로 요청해 주세요.')
  const chunks = []; let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > 65536) fail(413, '요청이 너무 큽니다.')
    chunks.push(chunk)
  }
  try { const result = JSON.parse(Buffer.concat(chunks).toString()); if (!object(result)) throw new Error(); return result }
  catch { fail(400, '올바른 JSON 객체를 입력해 주세요.') }
}
function validateProfile(payload, current) {
  const p = { ...current }
  for (const [field, label, max] of [['tagline', '한 줄 소개', 60], ['avatar', '이니셜', 2]]) {
    if (field in payload) p[field] = text(payload[field], label, max)
  }
  for (const [field, max, len] of [['interests', 12, 40], ['collaboration', 12, 80], ['feedback', 12, 80], ['meeting', 12, 80], ['questions', 3, 120]]) {
    if (field in payload) p[field] = list(payload[field], field, max, len)
  }
  if ('visibility' in payload) {
    if (!['PUBLIC', 'TEAM_ONLY', 'PRIVATE'].includes(payload.visibility)) fail(400, '공개 범위를 확인해 주세요.')
    p.visibility = payload.visibility
  }
  if ('links' in payload) {
    if (!object(payload.links)) fail(400, '링크 형식을 확인해 주세요.')
    p.links = Object.fromEntries(['github', 'notion', 'instagram'].map(k => [k, webUrl(payload.links[k] ?? '', k)]))
  }
  return p
}

export function makeApp({ databasePath = process.env.HOWTODO_DB || resolve(projectRoot, 'data/howtodo.sqlite'), seed = process.env.HOWTODO_SEED !== 'false', allowedOrigins = ['http://127.0.0.1:5179', 'http://localhost:5179', 'http://127.0.0.1:8314', 'http://localhost:8314', ...(process.env.HOWTODO_ORIGINS || '').split(',').filter(Boolean)] } = {}) {
  const store = openDatabase(databasePath, seed)
  const { get, all, run, transaction, user, profile, saveProfile, team, membership, saveRoles } = store
  const attempts = new Map()
  const authRateLimit = request => {
    const key = request.socket.remoteAddress
    const now = Date.now()
    for (const [ip, item] of attempts) if (item.until < now) attempts.delete(ip)
    const item = attempts.get(key) || { count: 0, until: now + 60000 }
    if (++item.count > 30) fail(429, '로그인 요청이 많습니다. 잠시 후 다시 시도해 주세요.')
    attempts.set(key, item)
  }
  const rawCookie = request => request.headers.cookie?.split(';').map(v => v.trim()).find(v => v.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1) || ''
  const currentUser = request => {
    const token = rawCookie(request)
    if (!/^[a-f0-9]{64}$/.test(token)) return null
    const session = get('SELECT user_id FROM sessions WHERE token_hash=? AND expires_at>?', hashToken(token), Date.now())
    return session ? user(session.user_id, true) : null
  }
  const cookie = (value, maxAge = sessionSeconds) => `${cookieName}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${process.env.HOWTODO_SECURE_COOKIE === 'true' ? '; Secure' : ''}`
  const startSession = (request, response, id) => {
    run('DELETE FROM sessions WHERE expires_at<=? OR token_hash=?', Date.now(), hashToken(rawCookie(request)))
    const token = randomBytes(32).toString('hex')
    run('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)', hashToken(token), id, Date.now() + sessionSeconds * 1000)
    response.setHeader('Set-Cookie', cookie(token))
  }
  const requireMember = (teamId, viewerId) => {
    const t = team(teamId)
    if (!t) fail(404, '팀을 찾을 수 없습니다.')
    const m = get('SELECT * FROM team_members WHERE team_id=? AND user_id=?', teamId, viewerId)
    if (!m) fail(403, '이 팀에 참여한 사람만 볼 수 있습니다.')
    return { team: t, member: m }
  }
  const respond = (response, status, value) => {
    response.statusCode = status
    response.setHeader('Content-Type', 'application/json; charset=utf-8')
    response.end(status === 204 ? undefined : JSON.stringify(value))
  }
  const serveStatic = async (request, response, pathname) => {
    if (!['GET', 'HEAD'].includes(request.method)) fail(404, '경로를 찾을 수 없습니다.')
    const root = resolve(projectRoot, 'dist')
    let target = resolve(root, `.${pathname}`)
    if (target !== root && !target.startsWith(root + sep)) fail(404, '경로를 찾을 수 없습니다.')
    try { if (!(await stat(target)).isFile()) target = resolve(root, 'index.html') }
    catch { target = resolve(root, 'index.html') }
    let content
    try { content = await readFile(target) }
    catch { fail(404, '프론트엔드를 npm run dev로 실행하거나 npm run build를 먼저 실행해 주세요.') }
    response.setHeader('Content-Type', ({ '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.yml': 'text/yaml', '.jpg': 'image/jpeg' })[extname(target)] || 'application/octet-stream')
    response.end(request.method === 'HEAD' ? undefined : content)
  }
  const server = createServer(async (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff')
    response.setHeader('Cache-Control', 'no-store')
    try {
      const path = new URL(request.url, 'http://localhost').pathname
      const method = request.method
      if (!path.startsWith('/api/')) return await serveStatic(request, response, path)
      if (['POST', 'PATCH', 'DELETE'].includes(method) && request.headers.origin && !allowedOrigins.includes(request.headers.origin)) fail(403, '허용되지 않은 출처입니다.')
      if (path === '/api/health' && method === 'GET') return respond(response, 200, { status: 'ok', database: 'sqlite', domainTables: 8 })
      if (path === '/api/auth/logout' && method === 'POST') {
        run('DELETE FROM sessions WHERE token_hash=?', hashToken(rawCookie(request)))
        response.setHeader('Set-Cookie', cookie('', 0))
        return respond(response, 204)
      }
      if (['/api/auth/login', '/api/auth/signup'].includes(path) && method === 'POST') {
        authRateLimit(request)
        const payload = await bodyJson(request)
        const email = text(payload.email, '이메일', 254, true).toLowerCase()
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, '이메일 형식을 확인해 주세요.')
        const password = payload.password
        if (typeof password !== 'string' || password.length < 4 || password.length > 128) fail(400, '비밀번호는 4~128자로 입력해 주세요.')
        if (path.endsWith('/signup')) {
          const name = text(payload.name, '이름', 30, true)
          if (get('SELECT user_id FROM users WHERE user_email=?', email)) fail(409, '이미 가입된 이메일입니다.')
          const salt = randomBytes(16).toString('hex')
          const hash = `scrypt:${salt}:${(await scryptAsync(password, salt, 64)).toString('hex')}`
          const id = transaction(() => {
            const id = Number(run('INSERT INTO users(user_name,user_email,user_password_hash) VALUES(?,?,?)', name, email, hash).lastInsertRowid)
            run('INSERT INTO profiles(user_id,profile_share_token,profile_avatar) VALUES(?,?,?)', id, randomBytes(16).toString('hex'), name[0])
            return id
          })
          startSession(request, response, id)
          return respond(response, 201, user(id, true))
        }
        const account = get('SELECT * FROM users WHERE user_email=?', email)
        const [, salt, saved] = (account?.user_password_hash || `scrypt:missing:${'0'.repeat(128)}`).split(':')
        const attempt = await scryptAsync(password, salt, 64)
        if (!account || !timingSafeEqual(Buffer.from(saved, 'hex'), attempt)) fail(401, '이메일 또는 비밀번호를 확인해 주세요.')
        startSession(request, response, account.user_id)
        return respond(response, 200, user(account.user_id, true))
      }
      const publicMatch = path.match(/^\/api\/public\/profiles\/([^/]+)$/)
      if (publicMatch && method === 'GET') {
        const row = get('SELECT user_id FROM profiles WHERE profile_share_token=? AND profile_visibility=\'PUBLIC\'', decodeURIComponent(publicMatch[1]))
        if (!row) fail(404, '공개된 프로필을 찾을 수 없습니다.')
        return respond(response, 200, { ...profile(row.user_id), user: user(row.user_id) })
      }
      const viewer = currentUser(request)
      if (!viewer) fail(401, '로그인이 필요합니다.')
      if (path === '/api/auth/me' && method === 'GET') return respond(response, 200, viewer)
      const choices = {
        '/api/interests': () => all('SELECT interest_name FROM interests ORDER BY interest_id').map(r => r.interest_name),
        '/api/roles': () => all('SELECT role_name FROM roles ORDER BY role_id').map(r => r.role_name),
        '/api/style-options': () => styleOptions,
        '/api/conversation-questions': () => conversationQuestions,
      }
      if (choices[path] && method === 'GET') return respond(response, 200, choices[path]())
      if (path === '/api/profiles/me') {
        if (method === 'GET') return respond(response, 200, profile(viewer.id))
        if (method === 'PATCH') {
          const updated = validateProfile(await bodyJson(request), profile(viewer.id))
          transaction(() => saveProfile(viewer.id, updated))
          return respond(response, 200, profile(viewer.id))
        }
      }
      if (path === '/api/teams') {
        if (method === 'GET') return respond(response, 200, all('SELECT team_id FROM team_members WHERE user_id=? ORDER BY team_id', viewer.id).map(r => team(r.team_id)))
        if (method === 'POST') {
          const payload = await bodyJson(request)
          const name = text(payload.name, '팀 이름', 40, true)
          const description = text(payload.description, '팀 소개', 160, true)
          const id = transaction(() => {
            const id = Number(run('INSERT INTO teams(team_name,team_description,team_invite_code,owner_user_id) VALUES(?,?,?,?)', name, description, randomBytes(6).toString('hex').toUpperCase(), viewer.id).lastInsertRowid)
            run('INSERT INTO team_members(team_id,user_id) VALUES(?,?)', id, viewer.id)
            return id
          })
          return respond(response, 201, team(id))
        }
      }
      const invitation = path.match(/^\/api\/team-invitations\/([^/]+)$/)
      if (invitation && method === 'GET') {
        const row = get('SELECT team_id FROM teams WHERE team_invite_code=?', decodeURIComponent(invitation[1]))
        if (!row) fail(404, '유효하지 않은 초대 코드입니다.')
        return respond(response, 200, team(row.team_id))
      }
      if (path === '/api/team-memberships' && method === 'POST') {
        const payload = await bodyJson(request)
        const code = text(payload.inviteCode, '초대 코드', 32, true)
        const row = get('SELECT team_id FROM teams WHERE team_invite_code=?', code)
        if (!row) fail(404, '유효하지 않은 초대 코드입니다.')
        const created = run('INSERT OR IGNORE INTO team_members(team_id,user_id) VALUES(?,?)', row.team_id, viewer.id).changes
        return respond(response, created ? 201 : 200, team(row.team_id))
      }
      const teamMatch = path.match(/^\/api\/teams\/(\d+)(?:\/members(?:\/(me|\d+))?)?$/)
      if (teamMatch) {
        const teamId = Number(teamMatch[1])
        const context = requireMember(teamId, viewer.id)
        const membersPath = path.includes('/members')
        if (!membersPath) {
          if (method === 'GET') return respond(response, 200, context.team)
          if (['PATCH', 'DELETE'].includes(method)) {
            if (context.team.ownerId !== viewer.id) fail(403, '팀 소유자만 수정·삭제할 수 있습니다.')
            if (method === 'DELETE') { run('DELETE FROM teams WHERE team_id=?', teamId); return respond(response, 204) }
            const payload = await bodyJson(request)
            const name = text(payload.name ?? context.team.name, '팀 이름', 40, true)
            const description = text(payload.description ?? context.team.description, '팀 소개', 160, true)
            run('UPDATE teams SET team_name=?,team_description=? WHERE team_id=?', name, description, teamId)
            return respond(response, 200, team(teamId))
          }
        } else if (!teamMatch[2] && method === 'GET') {
          return respond(response, 200, all('SELECT * FROM team_members WHERE team_id=? ORDER BY member_id', teamId).map(row => membership(row, viewer.id, true)))
        } else if (teamMatch[2] === 'me') {
          if (method === 'GET') return respond(response, 200, membership(context.member, viewer.id))
          if (method === 'PATCH') {
            const payload = await bodyJson(request)
            const current = membership(context.member, viewer.id)
            const goal = text(payload.goal ?? current.goal, '프로젝트 목표', 120, true)
            const roleNames = list(payload.roles ?? current.roles, '희망 역할', 3, 40)
            if (roleNames.some(name => !get('SELECT role_id FROM roles WHERE role_name=?', name))) fail(400, '목록에 있는 역할을 선택해 주세요.')
            const links = payload.projectLinks ?? current.projectLinks
            if (!Array.isArray(links) || links.length > 8) fail(400, '프로젝트 링크는 최대 8개입니다.')
            const projectLinks = links.map(link => {
              if (!object(link)) fail(400, '링크 형식을 확인해 주세요.')
              const url = webUrl(link.url, '프로젝트 링크')
              if (!url) fail(400, '프로젝트 링크 주소를 입력해 주세요.')
              return { label: text(link.label, '링크 이름', 60, true), url }
            })
            transaction(() => {
              run('UPDATE team_members SET member_goal=?,member_project_links=? WHERE member_id=?', goal, JSON.stringify(projectLinks), context.member.member_id)
              saveRoles(context.member.member_id, roleNames)
            })
            return respond(response, 200, membership(get('SELECT * FROM team_members WHERE member_id=?', context.member.member_id), viewer.id))
          }
        } else if (method === 'GET') {
          const row = get('SELECT * FROM team_members WHERE team_id=? AND member_id=?', teamId, Number(teamMatch[2]))
          if (!row) fail(404, '팀원을 찾을 수 없습니다.')
          return respond(response, 200, membership(row, viewer.id, true))
        }
      }
      fail(404, '경로를 찾을 수 없습니다.')
    } catch (error) {
      const status = error.status || (error.code === 'ERR_SQLITE_ERROR' && error.message.includes('UNIQUE') ? 409 : 500)
      if (status === 500) console.error(JSON.stringify({ event: 'request_failed', code: error.code || error.name }))
      respond(response, status, { message: status === 500 ? '요청 처리 중 오류가 발생했습니다.' : status === 409 && !error.status ? '이미 존재하는 데이터입니다.' : error.message })
    }
  })
  server.requestTimeout = 15000
  return { server, store, close: () => new Promise((resolveClose, reject) => server.close(error => { store.db.close(); error ? reject(error) : resolveClose() })) }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const app = makeApp()
  const port = Number(process.env.PORT || 8314)
  app.server.listen(port, '127.0.0.1', () => console.log(JSON.stringify({ service: 'howtodo', port: app.server.address().port, database: 'sqlite', ready: true })))
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { app.close().then(() => process.exit(0)) })
}
