/* 장현진 프로젝트 / Codex 구현 보조 · 2026-09-28. 세션 선택, 프레임 탐색, 검증 업로드. */
const $ = (id) => document.getElementById(id);
let frames = [];
let selectedFrame = 0;
let selectionRequest = 0;

async function request(path, options = {}) {
  const response = await fetch(path, options);
  const result = await response.json();
  if (!response.ok) throw new Error(typeof result.detail === 'string' ? result.detail : '요청을 처리하지 못했습니다.');
  return result;
}

function renderFrame(index) {
  if (!frames.length) return;
  selectedFrame = Math.max(0, Math.min(frames.length - 1, index));
  const frame = frames[selectedFrame];
  $('camera').src = frame.image_url;
  $('camera').alt = `${frame.timestamp_ms}ms 시점의 RC카 전방 카메라`;
  $('filename').textContent = frame.filename;
  $('timestamp').textContent = `${frame.timestamp_ms.toLocaleString()} ms`;
  $('frame-position').textContent = `${selectedFrame + 1} / ${frames.length}`;
  $('steering').textContent = (frame.steering > 0 ? '+' : '') + frame.steering.toFixed(3);
  $('throttle').textContent = frame.throttle.toFixed(3);
  $('steering-dot').style.left = `${(frame.steering + 1) * 50}%`;
  $('throttle-meter').value = frame.throttle;
  $('frame-range').value = selectedFrame;
  $('previous').disabled = selectedFrame === 0;
  $('next').disabled = selectedFrame === frames.length - 1;
  document.querySelectorAll('.thumb').forEach((button, position) => button.setAttribute('aria-pressed', String(position === selectedFrame)));
}

async function selectSession(id) {
  const requestId = ++selectionRequest;
  $('message').textContent = '주행 데이터를 불러오는 중…';
  try {
    const session = await request(`/api/sessions/${encodeURIComponent(id)}`);
    if (requestId !== selectionRequest) return;
    frames = session.frames;
    $('frame-count').textContent = frames.length.toLocaleString();
    $('duration').textContent = `${((frames.at(-1).timestamp_ms - frames[0].timestamp_ms) / 1000).toFixed(1)} s`;
    const sizes = new Set(frames.map(frame => `${frame.width} × ${frame.height}`));
    $('resolution').textContent = sizes.size === 1 ? [...sizes][0] : `${sizes.size}가지`;
    $('source').textContent = session.source;
    $('csv').href = `/api/sessions/${encodeURIComponent(id)}/csv`;
    $('frame-range').max = frames.length - 1;
    $('gallery').replaceChildren();
    frames.forEach((frame, index) => {
      const button = document.createElement('button');
      button.className = 'thumb';
      button.setAttribute('aria-label', `${index + 1}번 프레임 선택`);
      const image = document.createElement('img');
      image.src = frame.image_url;
      image.alt = '';
      image.loading = 'lazy';
      const details = document.createElement('div');
      const title = document.createElement('b');
      title.textContent = `FRAME ${String(index + 1).padStart(3, '0')}`;
      details.append(title);
      for (const value of [`조향 ${frame.steering.toFixed(3)} · 스로틀 ${frame.throttle.toFixed(3)}`, `${frame.timestamp_ms.toLocaleString()} ms`]) {
        const line = document.createElement('small');
        line.textContent = value;
        details.append(line);
      }
      button.append(image, details);
      button.addEventListener('click', () => renderFrame(index));
      $('gallery').append(button);
    });
    renderFrame(0);
    $('message').textContent = '';
  } catch (error) {
    if (requestId === selectionRequest) $('message').textContent = error.message;
  }
}

async function loadSessions(selectedId) {
  const sessions = await request('/api/sessions');
  $('session').replaceChildren();
  for (const session of sessions) {
    const option = document.createElement('option');
    option.value = session.id;
    option.textContent = `${session.name} · ${session.frame_count}장`;
    $('session').append(option);
  }
  if (selectedId) $('session').value = selectedId;
  if (sessions.length) await selectSession($('session').value);
}

$('session').addEventListener('change', () => selectSession($('session').value));
$('frame-range').addEventListener('input', (event) => renderFrame(Number(event.target.value)));
$('previous').addEventListener('click', () => renderFrame(selectedFrame - 1));
$('next').addEventListener('click', () => renderFrame(selectedFrame + 1));
$('open-upload').addEventListener('click', () => { $('upload-status').textContent = ''; $('upload-dialog').showModal(); });
$('close-upload').addEventListener('click', () => $('upload-dialog').close());
$('upload-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const file = $('archive').files[0];
  if (!file) return;
  if (file.size > 24 * 1024 * 1024) { $('upload-status').textContent = 'ZIP은 24MB 이하여야 합니다.'; return; }
  $('submit-upload').disabled = true;
  $('upload-status').textContent = '이미지와 CSV를 검증하고 있습니다…';
  try {
    const result = await request(`/api/sessions?name=${encodeURIComponent($('session-name').value.trim())}`, {
      method: 'POST', headers: {'Content-Type': 'application/zip'}, body: file,
    });
    await loadSessions(result.id);
    $('upload-dialog').close();
    $('upload-form').reset();
    $('message').textContent = `${result.frame_count}개 프레임을 저장했습니다.`;
  } catch (error) {
    $('upload-status').textContent = error.message;
  } finally {
    $('submit-upload').disabled = false;
  }
});
loadSessions().catch(error => { $('message').textContent = error.message; });
