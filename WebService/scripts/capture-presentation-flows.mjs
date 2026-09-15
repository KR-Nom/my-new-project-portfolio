import { mkdir, writeFile } from 'node:fs/promises';

// Capture unmodified Vue screens in a dedicated agent-browser session.
// Usage: node scripts/capture-presentation-flows.mjs <isolated CDP port> [profile-only|invite-only]
const [port, mode = 'all'] = process.argv.slice(2);
if (!port) throw new Error('Supply the isolated agent-browser CDP port.');
const origin = 'http://127.0.0.1:5174';
const output = 'report-assets/redesign';
const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const target = targets.find(item => item.type === 'page' && item.url.startsWith(origin));
if (!target) throw new Error('Open HowToDo in the isolated browser first.');
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
const pending = new Map();
let sequence = 0;
const checks = { screenshots: [], join: {}, shares: [], errors: [] };
socket.addEventListener('message', event => {
  const message = JSON.parse(event.data);
  if (message.method === 'Runtime.exceptionThrown') checks.errors.push(message.params.exceptionDetails.text);
  if (!pending.has(message.id)) return;
  const { resolve, reject } = pending.get(message.id);
  pending.delete(message.id);
  message.error ? reject(new Error(JSON.stringify(message.error))) : resolve(message.result);
});
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
async function until(expression) {
  for (let attempt = 0; attempt < 150; attempt += 1) {
    if (await evaluate(expression)) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out: ${expression}`);
}
async function settle() {
  await evaluate('document.fonts.ready.then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))');
}
async function navigate(path, ready) {
  await send('Page.navigate', { url: origin + path });
  await until(`location.pathname === ${JSON.stringify(path)} && document.readyState === 'complete'`);
  if (ready) await until(ready);
  await settle();
}
async function viewport(width, height) {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 2, mobile: false });
  await settle();
}
async function fill(selector, value) {
  await evaluate(`(() => { const input = document.querySelector(${JSON.stringify(selector)}); input.value = ${JSON.stringify(value)}; input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  await settle();
}
async function bounds(selector) {
  return evaluate(`(() => { const boxes = [...document.querySelectorAll(${JSON.stringify(selector)})].map(element => element.getBoundingClientRect()).filter(box => box.width && box.height); if (!boxes.length) throw new Error('Missing screenshot elements'); const x = Math.min(...boxes.map(box => box.x)); const y = Math.min(...boxes.map(box => box.y)); return { x: x + scrollX, y: y + scrollY, width: Math.max(...boxes.map(box => box.right)) - x, height: Math.max(...boxes.map(box => box.bottom)) - y, scale: 1 }; })()`);
}
async function capture(name, selector, fixedClip) {
  await evaluate('scrollTo({top: 0, left: 0, behavior: "instant"})');
  await settle();
  const clip = fixedClip || await bounds(selector);
  const result = await send('Page.captureScreenshot', { format: 'png', clip, captureBeyondViewport: true });
  const bytes = Buffer.from(result.data, 'base64');
  await writeFile(`${output}/${name}.png`, bytes);
  const item = { name, selector, clip, pixels: [bytes.readUInt32BE(16), bytes.readUInt32BE(20)] };
  checks.screenshots.push(item);
  console.log(JSON.stringify(item));
}
async function captureShare(kind) {
  await until('!!document.querySelector(".qr-image") && document.querySelector(".qr-image").naturalWidth > 0');
  await until('getComputedStyle(document.querySelector(".modal-backdrop")).opacity === "1" && !document.querySelector(".modal-backdrop").className.includes("fade-enter")');
  await settle();
  const state = await evaluate(`(() => { const modal = document.querySelector('.modal'); const qr = document.querySelector('.qr-image'); return {kind: ${JSON.stringify(kind)}, title: modal.querySelector('h2').innerText, url: modal.querySelector('.copy-field input').value, modalWidth: modal.clientWidth, modalHeight: modal.clientHeight, modalScrollHeight: modal.scrollHeight, qrNaturalWidth: qr.naturalWidth}; })()`);
  const expected = origin + (kind === 'profile' ? '/p/hyeonjin' : '/join/SKALA3');
  if (state.url !== expected || state.modalScrollHeight > state.modalHeight + 1) throw new Error(`Invalid share state: ${JSON.stringify(state)}`);
  checks.shares.push(state);
  await capture(`ui-${kind}-share-mobile`, '.modal');
  await capture(`ui-${kind}-qr`, '.qr-image');
}
async function captureOnboarding() {
  await navigate('/profile/edit', '!!document.querySelector(".editor-stepper")');
  await until('document.querySelector(".step-panel-heading").innerText.includes("나를 소개하기")');
  // Leave the unsaved first-entry field blank so its prompt remains visible.
  await fill('.step-panel:first-of-type input[maxlength="60"]', '');
  await capture('ui-profile-onboarding', '.editor-stepper, .step-panel-heading, .step-panel:not([style*="display: none"]) .form-section:first-child');
}

try {
  await mkdir(output, { recursive: true });
  await send('Runtime.enable');
  await viewport(1280, 1400);
  if (mode === 'invite-only') {
    await navigate('/login', '!!document.querySelector(".auth-card")');
    await evaluate('document.querySelector(".auth-card button").click()');
    await until('location.pathname === "/" && !!document.querySelector(".welcome-panel")');
    await navigate('/join/SKALA3', '!!document.querySelector(".invitation") && !document.querySelector(".narrow .loading-card")');
    await capture('ui-invitation-card', '.invitation');
    await writeFile(`${output}/invitation-card-capture-checks.json`, JSON.stringify(checks, null, 2));
  } else if (mode === 'profile-only') {
    await navigate('/login', '!!document.querySelector(".auth-card")');
    await evaluate('document.querySelector(".auth-card button").click()');
    await until('location.pathname === "/" && !!document.querySelector(".welcome-panel")');
    await captureOnboarding();
    await writeFile(`${output}/profile-onboarding-capture-checks.json`, JSON.stringify(checks, null, 2));
  } else {
  await navigate('/signup', '!!document.querySelector("#signup-name")');
  await fill('#signup-name', '장현진');
  await fill('#signup-email', 'hyeonjin@example.com');
  await fill('#signup-password', '1234');
  await capture('ui-signup', '.auth-card');

  // Use the seeded account; no signup or profile-save request is submitted.
  await navigate('/login', '!!document.querySelector(".auth-card")');
  await evaluate('document.querySelector(".auth-card button").click()');
  await until('location.pathname === "/" && !!document.querySelector(".welcome-panel")');
  await captureOnboarding();

  await navigate('/join', '!!document.querySelector("#invite-code")');
  await fill('#invite-code', 'SKALA3');
  checks.join.before = await evaluate('({path: location.pathname, code: document.querySelector("#invite-code").value, invitationPresent: !!document.querySelector(".invitation"), button: document.querySelector(".narrow form button").innerText})');
  if (checks.join.before.invitationPresent) throw new Error('Invitation must be hidden before checking the manually entered code.');
  await evaluate('document.querySelector(".narrow form button").click()');
  await until('!!document.querySelector(".invitation") && !document.querySelector(".narrow .loading-card") && document.querySelector(".narrow form button").innerText === "팀 확인"');
  const joinSelector = '.narrow .form-section, .narrow .invitation';
  const joinClip = await bounds(joinSelector);
  checks.join.after = await evaluate('({path: location.pathname, code: document.querySelector("#invite-code").value, invitationPresent: !!document.querySelector(".invitation"), team: document.querySelector(".invitation h2").innerText, action: document.querySelector(".invitation button").innerText})');
  await capture('ui-join-after', joinSelector, joinClip);
  await capture('ui-invitation-card', '.invitation');
  // Revisit the initial state and use the identical clip so the reveal is clear.
  await navigate('/join', '!!document.querySelector("#invite-code")');
  await fill('#invite-code', 'SKALA3');
  if (await evaluate('!!document.querySelector(".invitation")')) throw new Error('Invitation remained visible after navigation.');
  await capture('ui-join-before', joinSelector, joinClip);

  await viewport(440, 1100);
  await navigate('/profile/preview', '!!document.querySelector(".share-bar")');
  await evaluate('[...document.querySelectorAll(".share-bar button")].find(button => button.innerText.includes("QR로 공유")).click()');
  await captureShare('profile');
  await navigate('/teams/1', 'document.querySelectorAll(".member-card").length === 5');
  await evaluate('[...document.querySelectorAll("button")].find(button => button.innerText.includes("팀원 초대")).click()');
  await captureShare('team');

  // Public link must render the recipient view even without a signed-in user.
  await evaluate('localStorage.removeItem("manual_user")');
  await navigate('/p/hyeonjin', '!!document.querySelector(".profile-grid")');
  checks.publicProfile = await evaluate('({path: location.pathname, guest: !localStorage.getItem("manual_user"), name: document.querySelector(".profile-hero h1").innerText})');
  await capture('ui-public-profile-mobile', '.public-head, .profile-hero, .profile-grid .card:nth-child(-n+2)');
  if (checks.errors.length) throw new Error(`Browser exceptions: ${JSON.stringify(checks.errors)}`);
  await writeFile(`${output}/presentation-flow-capture-checks.json`, JSON.stringify(checks, null, 2));
  console.log(JSON.stringify({ join: checks.join, shares: checks.shares, publicProfile: checks.publicProfile, errors: checks.errors }, null, 2));
  }
} finally {
  socket.close();
}
