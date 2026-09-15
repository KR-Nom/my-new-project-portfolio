import { writeFile } from 'node:fs/promises';

// Attach to an isolated agent-browser session whose team-members operation has
// already been authorized (MockUserId: 1) and executed with teamId: 1.
const [port, mode = 'wide'] = process.argv.slice(2);
if (!/^\d+$/.test(port ?? '') || !['wide', 'compact'].includes(mode)) {
  throw new Error('Usage: node scripts/refresh-swagger.mjs <CDP port> [wide|compact]');
}
// Compact captures keep Swagger text readable in a two-column presentation.
const compact = mode === 'compact';
const prefix = compact ? 'ui-' : '';
const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const target = targets.find(item => item.type === 'page' && item.url.startsWith('http://127.0.0.1:5174/api-docs'));
if (!target) throw new Error('Open the local Swagger page in the isolated browser first.');
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
let sequence = 0;
const pending = new Map();
socket.addEventListener('message', event => {
  const message = JSON.parse(event.data);
  const task = pending.get(message.id);
  if (!task) return;
  pending.delete(message.id);
  message.error ? task.reject(new Error(JSON.stringify(message.error))) : task.resolve(message.result);
});
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++sequence;
  pending.set(id, { resolve, reject });
  socket.send(JSON.stringify({ id, method, params }));
});
async function evaluate(expression) {
  const response = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (response.exceptionDetails) throw new Error(JSON.stringify(response.exceptionDetails));
  return response.result.value;
}
async function capture(name, selector, maxHeight) {
  const clip = await evaluate(`(() => {
    const boxes = [...document.querySelectorAll(${JSON.stringify(selector)})].map(element => element.getBoundingClientRect());
    if (!boxes.length) throw new Error('Missing capture target');
    const x = Math.min(...boxes.map(box => box.x));
    const y = Math.min(...boxes.map(box => box.y));
    return { x: x + scrollX, y: y + scrollY, width: Math.max(...boxes.map(box => box.right)) - x,
      height: Math.max(...boxes.map(box => box.bottom)) - y, scale: 1 };
  })()`);
  if (maxHeight) clip.height = Math.min(clip.height, maxHeight);
  const result = await send('Page.captureScreenshot', { format: 'png', clip, captureBeyondViewport: true });
  await writeFile(`report-assets/redesign/${name}.png`, Buffer.from(result.data, 'base64'));
  console.log(name, clip);
}
try {
  await send('Emulation.setDeviceMetricsOverride', { width: compact ? 760 : 1280, height: 1100, deviceScaleFactor: 2, mobile: false });
  await evaluate('document.fonts.ready.then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))');
  const checks = await evaluate(`(() => {
    const table = document.querySelector('.live-responses-table');
    const body = JSON.parse(table.querySelector('.microlight').innerText);
    return { status: table.querySelector('tbody .response-col_status').innerText.trim(),
      members: body.length, requestUrl: document.querySelector('.request-url pre').innerText,
      operations: document.querySelectorAll('.opblock').length,
      tags: [...document.querySelectorAll('.opblock-tag-section')].map(section => ({
        name: section.querySelector('h3').getAttribute('data-tag'), count: section.querySelectorAll('.opblock').length })),
      methods: [...new Set([...document.querySelectorAll('.opblock-summary-method')].map(element => element.innerText))],
      serviceWorker: navigator.serviceWorker.controller?.scriptURL };
  })()`);
  if (checks.status !== '200' || checks.members !== 5 || checks.operations !== 20 || checks.tags.length !== 7) {
    throw new Error(`Unexpected Swagger state: ${JSON.stringify(checks)}`);
  }
  const operation = '#operations-Team_Member-get_teams__teamId__members';
  // Current Swagger UI renders Execute/Clear in .btn-group, not .execute-wrapper.
  // Include the live button itself so the request screenshot cannot crop it out.
  await capture(`${prefix}swagger-request`, `${operation} .opblock-summary, ${operation} .parameters-container, ${operation} .btn-group`);
  await capture(`${prefix}swagger-response`, '.request-url,.live-responses-table', compact ? 400 : 410);
  await writeFile(`report-assets/redesign/${prefix}swagger-execution-checks.json`, JSON.stringify({ viewportWidth: compact ? 760 : 1280, ...checks }, null, 2));
  console.log(JSON.stringify(checks, null, 2));
} finally {
  socket.close();
}
