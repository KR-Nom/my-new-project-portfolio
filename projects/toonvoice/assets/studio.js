const $ = id => document.getElementById(id);
const state = {project: null, voices: [], dirty: false, busy: false};
const player = $('audioPlayer');
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const seconds = n => `${Math.floor((n || 0) / 60).toString().padStart(2,'0')}:${Math.floor((n || 0) % 60).toString().padStart(2,'0')}`;

async function api(url, options = {}) {
  const response = await fetch(url, {cache:'no-store', ...options});
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(typeof body.detail === 'string' ? body.detail : '입력 내용을 확인한 뒤 다시 시도해 주세요.');
  }
  return response.json();
}
const json = (method, body) => ({method, headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)});
function notice(message, error = false) {
  $('notice').textContent = message;
  $('notice').className = `notice${error ? ' error' : ''}`;
  $('notice').hidden = !message;
}
async function task(title, description, run) {
  if (state.busy) return;
  state.busy = true;
  $('busyTitle').textContent = title;
  $('busyDescription').textContent = description;
  $('busyOverlay').hidden = false;
  notice('');
  try { await run(); } catch (error) { notice(error.message, true); }
  finally { state.busy = false; $('busyOverlay').hidden = true; updateButtons(); }
}
function dirty() {
  state.dirty = true;
  $('saveState').textContent = '저장하지 않은 변경';
  $('saveState').classList.add('dirty');
  $('characterCount').textContent = `${collectLines().reduce((n,l)=>n+l.text.length,0)}자`;
  updateButtons();
}
function updateButtons() {
  const p = state.project;
  $('ocrButton').disabled = !p?.image_url || state.busy;
  $('saveButton').disabled = !p || !state.dirty || state.busy;
  $('addLineButton').disabled = !p || state.busy;
  $('generateButton').disabled = !p || !$('dialogueList').querySelector('.dialogue-card') || state.busy;
  $('playAllButton').disabled = !p?.export_url || state.dirty || state.busy;
  $('downloadButton').classList.toggle('disabled', !p?.export_url || state.dirty);
  $('downloadButton').setAttribute('aria-disabled', String(!p?.export_url || state.dirty));
  document.querySelectorAll('.line-play,.audio-clip').forEach(button => {button.disabled = state.dirty || state.busy || !button.dataset.audio;});
}
async function refreshProjects() {
  const projects = await api('/api/projects');
  $('projectSelect').innerHTML = '<option value="">저장한 프로젝트</option>' + projects.map(p=>`<option value="${p.id}">${escapeHTML(p.title)} · ${p.line_count}개 대사</option>`).join('');
  if (state.project) $('projectSelect').value = state.project.id;
  return projects;
}
function waveHTML(values) {
  return values.map(value=>`<i style="height:${Math.max(3,Math.round(value*26))}px"></i>`).join('');
}
function lineHTML(line, index) {
  const options = (state.voices.length ? state.voices : [{id:'Yuna',label:'유나 · 한국어'}]).map(v=>`<option value="${escapeHTML(v.id)}" ${v.id===line.voice?'selected':''}>${escapeHTML(v.label)}</option>`).join('');
  return `<div class="dialogue-card" data-index="${index}"><div class="dialogue-top"><span class="avatar">${escapeHTML(line.speaker?.slice(0,1)||'인')}</span><input class="speaker-input" aria-label="대사 ${index+1}의 등장인물" maxlength="30" value="${escapeHTML(line.speaker)}"><span class="line-number">대사 ${String(index+1).padStart(2,'0')}</span><span class="line-spacer"></span><button class="line-play" aria-label="대사 ${index+1} 듣기" data-audio="${escapeHTML(line.audio_url||'')}" ${line.audio_url?'':'disabled'}>▶</button><button class="line-delete" aria-label="대사 ${index+1} 삭제">×</button></div><textarea class="dialogue-text" aria-label="대사 ${index+1} 내용" maxlength="500" rows="2">${escapeHTML(line.text)}</textarea><div class="voice-controls"><select class="voice-select" aria-label="대사 ${index+1} 목소리">${options}</select><label class="rate-control">읽기 속도<input type="range" min="100" max="260" step="5" value="${line.rate||170}" aria-label="대사 ${index+1} 읽기 속도"><output>${((line.rate||170)/170).toFixed(2)}×</output></label><span class="duration">${line.duration ? line.duration.toFixed(1)+'초' : '음성 생성 전'}</span></div>${line.waveform?.length?`<div class="mini-wave" aria-label="생성한 음성 파형">${waveHTML(line.waveform)}</div>`:''}</div>`;
}
function render(project) {
  player.pause();
  player.removeAttribute('src');
  state.project = project;
  state.dirty = false;
  localStorage.setItem('toonvoice-project', project.id);
  $('projectTitle').textContent = project.title;
  $('projectSubtitle').textContent = '장면의 대사를 확인하고, 인물마다 어울리는 목소리를 골라 보세요.';
  $('sceneImage').src = project.image_url ? `${project.image_url}?revision=${project.revision}` : '/assets/sample-ocr.png';
  $('sceneImage').alt = project.image_url ? `${project.title} 업로드 이미지` : '예시 웹툰 이미지';
  $('sceneTip').hidden = !!project.image_url;
  $('sceneLabel').textContent = project.image_url ? '저장된 원본 장면' : '예시 장면';
  $('lineCount').textContent = project.lines.length;
  $('saveState').textContent = '✓ 모든 변경 저장됨';
  $('saveState').classList.remove('dirty');
  $('dialogueList').innerHTML = project.lines.length ? project.lines.map(lineHTML).join('') : '<div class="empty-state"><span class="empty-symbol">Aa</span><h3>장면 속 이야기를 읽어 볼까요?</h3><p>‘말풍선 읽기’를 누르면 OCR로 대사를 추출합니다.<br>글자가 없다면 대사를 직접 추가할 수 있어요.</p></div>';
  $('characterCount').textContent = `${project.lines.reduce((n,l)=>n+l.text.length,0)}자`;
  $('timeline').innerHTML = project.export_url ? project.lines.map(line=>`<button class="audio-clip" data-audio="${line.audio_url}" style="flex:${Math.max(1,line.duration)}"><span>${escapeHTML(line.speaker)} · ${line.duration.toFixed(1)}초</span><div class="mini-wave">${waveHTML(line.waveform)}</div></button>`).join('') : '<div class="timeline-empty">음성을 생성하면 실제 오디오 파형이 표시됩니다.</div>';
  $('audioSummary').textContent = project.export_url ? `${project.lines.length}개 대사 · ${project.export_duration.toFixed(1)}초 · WAV 24kHz` : '대사 사이에는 0.35초의 쉼을 넣습니다.';
  $('timeDisplay').textContent = `00:00 / ${seconds(project.export_duration)}`;
  $('downloadButton').href = project.export_url ? `${project.export_url}?download=true` : '#';
  $('playAllButton').textContent = '▶';
  updateButtons();
}
function collectLines() {
  return [...$('dialogueList').querySelectorAll('.dialogue-card')].map(card=>({speaker:card.querySelector('.speaker-input').value.trim(),text:card.querySelector('textarea').value.trim(),voice:card.querySelector('select').value,rate:Number(card.querySelector('input[type=range]').value)}));
}
async function save() {
  if (!state.dirty) return;
  const lines = collectLines();
  if (lines.some(l=>!l.text||!l.speaker)) throw new Error('모든 대사와 인물 이름을 입력해 주세요.');
  render(await api(`/api/projects/${state.project.id}/lines`, json('PUT',{revision:state.project.revision,lines})));
  await refreshProjects();
}
function mayDiscard() { return !state.dirty || confirm('저장하지 않은 변경이 있습니다. 저장하지 않고 이동할까요?'); }
$('sampleButton').addEventListener('click',()=>{
  if (!mayDiscard()) return;
  task('예제 장면을 준비하고 있어요.','직접 생성한 웹툰에 말풍선을 넣은 예제입니다.', async()=>{render(await api('/api/projects/sample',{method:'POST'}));await refreshProjects();notice('장면을 가져왔어요. ‘말풍선 읽기’로 실제 대사를 추출해 보세요.');});
});
$('newButton').addEventListener('click',()=>{
  if (!mayDiscard()) return;
  const title = prompt('프로젝트 이름을 입력해 주세요.','새 웹툰 프로젝트');
  if (!title?.trim()) return;
  task('새 프로젝트를 만드는 중입니다.','제목과 작업 내용은 이 컴퓨터에 저장됩니다.',async()=>{render(await api('/api/projects',json('POST',{title})));await refreshProjects();});
});
$('projectSelect').addEventListener('change',event=>{
  const id = event.target.value;
  if(!id) return;
  if (!mayDiscard()) {event.target.value=state.project?.id||'';return;}
  task('저장한 프로젝트를 여는 중입니다.','대사와 생성한 음성까지 함께 불러옵니다.',async()=>render(await api(`/api/projects/${id}`)));
});
$('uploadButton').addEventListener('click',()=>$('fileInput').click());
$('fileInput').addEventListener('change',event=>{
  const file = event.target.files[0];
  if(!file) return;
  if(state.project?.lines.length && !confirm('새 이미지를 넣으면 기존 대사와 오디오가 초기화됩니다. 계속할까요?')) {event.target.value='';return;}
  task('장면을 가져오는 중입니다.','PNG·JPG·WebP, 최대 12MB 이미지를 지원합니다.',async()=>{
    if(!state.project) render(await api('/api/projects',json('POST',{title:file.name.replace(/\.[^.]+$/,'').slice(0,80)})));
    const body = new FormData();body.append('file',file);
    render(await api(`/api/projects/${state.project.id}/image`,{method:'POST',body}));await refreshProjects();notice('이미지를 저장했어요. ‘말풍선 읽기’를 눌러 주세요.');
  });
  event.target.value='';
});
$('ocrButton').addEventListener('click',()=>{
  if(state.project?.lines.length && !confirm('다시 추출하면 현재 대사와 음성이 교체됩니다. 계속할까요?')) return;
  task('말풍선에서 대사를 읽고 있어요.','첫 실행에는 한국어 인식 엔진 준비로 잠시 더 걸릴 수 있습니다.',async()=>{
    render(await api(`/api/projects/${state.project.id}/ocr`,json('POST',{revision:state.project.revision})));
    await refreshProjects();notice(state.project.lines.length?`${state.project.lines.length}개 대사를 읽었어요. 텍스트와 등장인물을 확인해 주세요.`:'읽을 수 있는 글자를 찾지 못했어요. 더 선명한 이미지를 넣거나 대사를 직접 추가해 주세요.');
  });
});
$('saveButton').addEventListener('click',()=>task('대사를 저장하고 있어요.','수정한 대사로 음성을 다시 생성할 수 있습니다.',async()=>{await save();notice('대사와 목소리 설정을 저장했어요.');}));
$('addLineButton').addEventListener('click',()=>{
  const count=$('dialogueList').querySelectorAll('.dialogue-card').length;
  if(count>=40) return notice('프로젝트당 최대 40개 대사를 추가할 수 있어요.',true);
  $('dialogueList').querySelector('.empty-state')?.remove();
  $('dialogueList').insertAdjacentHTML('beforeend',lineHTML({text:'',speaker:count%2?'도윤':'서윤',voice:'Yuna',rate:170},count));
  $('lineCount').textContent=count+1;
  $('dialogueList').lastElementChild.querySelector('textarea').focus();dirty();
});
$('dialogueList').addEventListener('input',event=>{
  if(event.target.matches('input[type=range]')) event.target.nextElementSibling.textContent=`${(Number(event.target.value)/170).toFixed(2)}×`;
  if(event.target.matches('.speaker-input')) event.target.previousElementSibling.textContent=event.target.value.slice(0,1)||'인';
  dirty();
});
$('dialogueList').addEventListener('change',event=>{if(event.target.matches('select')) dirty();});
async function play(url) {
  try {player.src=url;await player.play();}catch {notice('오디오를 재생하지 못했습니다. 파일을 내보내서 확인해 주세요.',true);}
}
$('dialogueList').addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.classList.contains('line-delete')){button.closest('.dialogue-card').remove();$('lineCount').textContent=collectLines().length;dirty();}
  if(button.classList.contains('line-play')&&button.dataset.audio&&!state.dirty)play(button.dataset.audio);
});
$('generateButton').addEventListener('click',()=>task('목소리를 입히고 있어요.','인물별 목소리와 읽기 속도로 실제 WAV 오디오를 생성합니다.',async()=>{
  await save();render(await api(`/api/projects/${state.project.id}/synthesize`,json('POST',{revision:state.project.revision})));
  await refreshProjects();notice('오디오를 완성했어요. 이어 듣거나 WAV로 내보낼 수 있습니다.');
}));
$('playAllButton').addEventListener('click',()=>{
  if(!player.paused){player.pause();return;}
  if(state.project?.export_url)play(state.project.export_url);
});
$('timeline').addEventListener('click',event=>{const clip=event.target.closest('.audio-clip');if(clip?.dataset.audio&&!state.dirty)play(clip.dataset.audio);});
player.addEventListener('timeupdate',()=>{$('timeDisplay').textContent=`${seconds(player.currentTime)} / ${seconds(player.duration||state.project?.export_duration)}`;});
player.addEventListener('play',()=>{$('playAllButton').textContent='Ⅱ';});
for(const name of ['pause','ended'])player.addEventListener(name,()=>{$('playAllButton').textContent='▶';});
window.addEventListener('beforeunload',event=>{if(state.dirty){event.preventDefault();event.returnValue='';}});
(async()=>{
  try {
    const health=await api('/api/health');state.voices=health.voices;
    $('engineStatus').textContent=health.voices.length?'● 한국어 OCR · 로컬 음성 엔진 준비됨':'macOS 한국어 음성 설치를 확인해 주세요';
    const projects=await refreshProjects();const remembered=localStorage.getItem('toonvoice-project');
    const selected=projects.find(p=>p.id===remembered)||projects[0];
    if(selected){render(await api(`/api/projects/${selected.id}`));$('projectSelect').value=selected.id;}
  }catch(error){notice('서버에 연결하지 못했습니다. 로컬 서버를 실행한 주소로 접속해 주세요.',true);$('engineStatus').textContent='로컬 서버 연결 필요';}
})();
