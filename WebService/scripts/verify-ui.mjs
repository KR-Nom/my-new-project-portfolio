import { mkdir, writeFile } from 'node:fs/promises'

// Run only against an isolated agent-browser session with the local app open.
const port = process.argv[2]
const base = 'http://127.0.0.1:5174'
const targets = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json()
const target = targets.find(item => item.type === 'page' && item.url.startsWith(base))
if (!target) throw new Error('Open the local app in an isolated browser session first.')
const socket = new WebSocket(target.webSocketDebuggerUrl)
await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }))
let id = 0
const pending = new Map()
const responses = []
const errors = []
socket.addEventListener('message', event => {
  const message = JSON.parse(event.data)
  if (pending.has(message.id)) {
    const task = pending.get(message.id)
    pending.delete(message.id)
    message.error ? task.reject(new Error(JSON.stringify(message.error))) : task.resolve(message.result)
  }
  if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text)
  if (message.method === 'Network.responseReceived' && message.params.response.url.includes('/api/')) {
    const response = message.params.response
    responses.push({ path: new URL(response.url).pathname, status: response.status, serviceWorker: !!response.fromServiceWorker })
  }
})
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const requestId = ++id
    pending.set(requestId, { resolve, reject })
    socket.send(JSON.stringify({ id: requestId, method, params }))
  })
}
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails))
  return result.result.value
}
async function until(expression) {
  for (let i = 0; i < 150; i++) {
    if (await evaluate(expression)) return
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  throw new Error('Timed out: ' + expression)
}
async function go(path, ready) {
  await send('Page.navigate', { url: base + path })
  await until('location.pathname === ' + JSON.stringify(path) + ' && document.readyState === "complete"')
  await until(ready)
  await evaluate('document.fonts.ready.then(() => true)')
}
async function clickText(text, selector = 'button') {
  await evaluate('(()=>{const e=[...document.querySelectorAll(' + JSON.stringify(selector) + ')].find(e=>e.offsetWidth && e.textContent.trim().includes(' + JSON.stringify(text) + '));if(!e||e.disabled)throw new Error("Missing enabled control: "+' + JSON.stringify(text) + ');e.focus();e.click()})()')
}
async function fill(selector, value) {
  await evaluate('(()=>{const e=document.querySelector(' + JSON.stringify(selector) + ');if(!e)throw new Error("Missing input"); e.value=' + JSON.stringify(value) + ';e.dispatchEvent(new Event("input",{bubbles:true}));e.dispatchEvent(new Event("change",{bubbles:true}));})()')
}
async function assert(expression, label) {
  if (!await evaluate(expression)) throw new Error(label)
  console.log('PASS', label)
}
async function size(width, height = 1000) {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false })
}
const layouts = []
async function capture(name, full = false) {
  const layout = await evaluate('({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,overlay:!!document.querySelector("vite-error-overlay"),activeNav:document.querySelectorAll(".side-nav .is-active").length})')
  layouts.push({ name, ...layout })
  if (layout.scrollWidth > layout.width + 1 || layout.overlay) throw new Error('Layout failure: ' + name)
  const metrics = await send('Page.getLayoutMetrics')
  const clip = full ? { x: 0, y: 0, width: layout.width, height: Math.min(metrics.cssContentSize.height, 2400), scale: 1 } : undefined
  await evaluate('scrollTo(0,0)')
  const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: full, ...(clip ? { clip } : {}) })
  await writeFile('report-assets/ui-refresh/' + name + '.png', Buffer.from(result.data, 'base64'))
}
await mkdir('report-assets/ui-refresh', { recursive: true })
await send('Runtime.enable')
await send('Network.enable')
await send('Page.bringToFront')
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
try {
  await size(1440)
  await go('/', '!!document.querySelector(".dashboard")')
  await capture('home-desktop')
  await go('/teams/1', 'document.querySelectorAll(".member-card").length === 5')
  await capture('team-desktop', true)
  await fill('#member-search', 'AI')
  await until('document.querySelectorAll(".member-card").length === 2')
  await fill('#member-search', 'no-match-ui-check')
  await until('!!document.querySelector(".empty")')
  await clickText('전체 팀원 보기')
  await until('document.querySelectorAll(".member-card").length === 5')
  console.log('PASS team search and empty state reset')
  await go('/teams/1/members/2', '!!document.querySelector(".member-detail-hero")')
  await capture('member-desktop', true)

  await go('/profile/edit', '!!document.querySelector(".editor-stepper")')
  await fill('[aria-label="관심사 직접 입력"]', 'UI 검수 관심사')
  await evaluate('document.querySelector(' + JSON.stringify('[aria-label="관심사 직접 입력"]') + ').nextElementSibling.click()')
  await until('[...document.querySelectorAll(".chip")].some(e=>e.textContent.includes("UI 검수 관심사"))')
  await clickText('UI 검수 관심사', '.chip')
  await assert('![...document.querySelectorAll(".chip")].some(e=>e.textContent.includes("UI 검수 관심사"))', 'custom tag add/remove')
  await capture('profile-edit-desktop')
  await clickText('다음 단계')
  await until('document.querySelector(".step-panel-heading").textContent.includes("협업 방식")')
  await assert('document.querySelectorAll(".editor-stepper .active").length === 1', 'profile step navigation')
  await clickText('다음 단계')
  await until('document.querySelector(".step-panel-heading").textContent.includes("링크와 공유")')
  await clickText('저장하고 미리보기')
  await until('location.pathname === "/profile/preview" && !!document.querySelector(".profile-hero")')
  await capture('profile-desktop', true)
  await clickText('QR로 공유')
  await until('!!document.querySelector(".modal .qr-image")')
  await assert('document.querySelector(".modal").contains(document.activeElement)', 'dialog focus management')
  await capture('share-desktop')
  // Exercise the DOM key handler directly; this browser's native Escape is intercepted.
  await evaluate('document.activeElement.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))')
  await until('!document.querySelector(".modal")')
  await assert('document.activeElement.textContent.includes("QR로 공유")', 'Escape handler closes dialog and restores focus')

  await go('/join', '!!document.querySelector("#invite-code")')
  await fill('#invite-code', 'invalid-ui-check')
  await clickText('팀 확인')
  await until('!!document.querySelector("[role=alert]")')
  await fill('#invite-code', 'SKALA3')
  await clickText('팀 확인')
  await until('!!document.querySelector(".invitation")')
  await fill('#invite-code', 'changed-code')
  await until('!document.querySelector(".invitation")')
  await fill('#invite-code', 'SKALA3')
  await clickText('팀 확인')
  await until('!!document.querySelector(".invitation")')
  await clickText('이 팀에 참여하기')
  await until('location.pathname === "/teams/1/me/edit" && !!document.querySelector(".role-priority-item")')
  const firstRole = await evaluate('document.querySelector(".role-priority-item strong").textContent')
  await evaluate('document.querySelector(".rank-controls button:nth-child(2)").click()')
  await assert('document.querySelectorAll(".role-priority-item strong")[1].textContent === ' + JSON.stringify(firstRole), 'role priorities reorder')
  await evaluate('document.querySelectorAll(".rank-controls")[1].querySelector("button").click()')
  await assert('document.querySelector(".role-priority-item strong").textContent === ' + JSON.stringify(firstRole), 'role priorities restore')
  await capture('role-edit-desktop', true)
  await clickText('저장하고 팀 보드 보기')
  await until('location.pathname === "/teams/1" && document.querySelectorAll(".member-card").length === 5')
  console.log('PASS invitation validation, stale-code reset and membership save')

  // Create and delete only a team made by this verification run.
  const testName = 'UI 검수 ' + Date.now()
  await go('/teams/create', '!!document.querySelector("#team-name")')
  await fill('#team-name', testName)
  await fill('#team-description', '반응형 화면 동작 검수용 팀입니다.')
  await clickText('팀 만들고 시작하기')
  await until('!!document.querySelector(".team-hero h1") && document.querySelector(".team-hero h1").textContent === ' + JSON.stringify(testName))
  await clickText('팀 정보 수정')
  await until('!!document.querySelector("#edit-team-description")')
  await fill('#edit-team-description', '수정 검수 완료')
  await clickText('변경 저장')
  await until('!document.querySelector(".modal") && document.querySelector(".team-hero").textContent.includes("수정 검수 완료")')
  await clickText('팀 삭제', '.owner-bar button')
  await until('!!document.querySelector(".confirm-body")')
  await clickText('팀 삭제', '.confirm-body button')
  await until('location.pathname === "/teams" && !document.querySelector(".loading-card")')
  await assert('!document.body.textContent.includes(' + JSON.stringify(testName) + ')', 'new team create/edit/delete')

  const routes = [
    ['home', '/', '!!document.querySelector(".dashboard")'],
    ['teams', '/teams', '!!document.querySelector(".team-card")'],
    ['team', '/teams/1', 'document.querySelectorAll(".member-card").length === 5'],
    ['profile-edit', '/profile/edit', '!!document.querySelector(".editor-stepper")'],
    ['profile', '/profile/preview', '!!document.querySelector(".profile-hero")'],
    ['member', '/teams/1/members/2', '!!document.querySelector(".member-detail-hero")'],
    ['role-edit', '/teams/1/me/edit', '!!document.querySelector(".role-priority-item")'],
    ['join', '/join/SKALA3', '!!document.querySelector(".invitation")'],
    ['create', '/teams/create', '!!document.querySelector("#team-name")'],
    ['public', '/p/hyeonjin', '!!document.querySelector(".profile-hero")'],
  ]
  for (const width of [390, 768]) {
    await size(width, 844)
    for (const [name, path, ready] of routes) {
      await go(path, ready)
      await capture(name + '-' + width, width === 390)
      if (width === 390 && ['profile-edit', 'role-edit'].includes(name)) {
        await evaluate('scrollTo(0,document.body.scrollHeight)')
        await assert('document.querySelector(".sticky-actions").getBoundingClientRect().bottom <= document.querySelector(".sidebar").getBoundingClientRect().top', 'mobile save controls clear bottom navigation: ' + name)
      }
    }
  }
  await size(320, 740)
  await go('/teams/1', 'document.querySelectorAll(".member-card").length === 5')
  await capture('team-320', true)
  await go('/profile/edit', '!!document.querySelector(".editor-stepper")')
  await capture('profile-edit-320', true)
  await size(390, 844)
  await go('/p/no-such-profile', '!!document.querySelector("[role=alert]")')
  await capture('public-error-mobile')
  // Logout through the visible mobile control, then inspect both auth screens.
  await go('/', '!!document.querySelector(".dashboard")')
  await evaluate('document.querySelector(".mobile-logout").click()')
  await until('location.pathname === "/login" && !!document.querySelector("#login-email")')
  await capture('login-mobile', true)
  await go('/signup', '!!document.querySelector("#signup-name")')
  await capture('signup-mobile', true)
  await size(1440)
  await go('/login', '!!document.querySelector("#login-email")')
  await capture('login-desktop')
  await fill('#login-password', 'incorrect-ui-check')
  await clickText('로그인', '.auth-card button')
  await until('!!document.querySelector("[role=alert]")')
  await fill('#login-password', '1234')
  await clickText('로그인', '.auth-card button')
  await until('location.pathname === "/" && !!document.querySelector(".dashboard")')
  console.log('PASS login failure feedback and recovery')
  if (errors.length) throw new Error('Browser exceptions: ' + errors.join('; '))
  await writeFile('report-assets/ui-refresh/checks.json', JSON.stringify({ layouts, responses, errors }, null, 2))
  console.log('PASS all checks', { layouts: layouts.length, apiResponses: responses.length })
} finally {
  socket.close()
}
