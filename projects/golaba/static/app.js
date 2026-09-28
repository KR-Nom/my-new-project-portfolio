/* 장현진 · 2026-09-28 · GOLABA 로컬 접수/검토 UI. 실제 API 상태만 표시합니다. */
const $ = (selector) => document.querySelector(selector);
const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const labels = {CHECKING:'사전 점검 중',READY:'담당자 검토 대기',NEEDS_SUPPLEMENT:'보완 필요',APPROVED:'승인 완료',CHECK_FAILED:'점검 실패'};
let projects = [], applications = [], reviews = [], session = {}, view = 'programs', polling = false;
const date = (seconds) => new Date(seconds * 1000).toLocaleString('ko-KR', {month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
async function api(path, options = {}) {
  const response = await fetch(path, {credentials:'same-origin', ...options, headers:{'Content-Type':'application/json',...options.headers}});
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof body.detail === 'string' ? body.detail : `입력을 확인해 주세요. (${response.status})`);
  return body;
}
function notice(message, error = false) { $('#notice').textContent = message; $('#notice').classList.toggle('error',error); $('#notice').hidden = !message; }
function showView(name) {
  view = name;
  for (const part of ['programs','applications','reviewer']) $(`#${part}-view`).hidden = part !== name;
  document.querySelectorAll('.nav').forEach(button => button.classList.toggle('active', button.dataset.view === name));
  notice('');
  refresh().catch(error => notice(error.message,true));
}
function showProjects() {
  $('#projects').innerHTML = projects.map((project,index) => `<article class="project-card"><div class="project-art"><span>GOLABA<br>PROGRAM 0${index+1}</span><strong>${['◒','↗','✳'][index]}</strong></div><div class="project-body"><span class="category">${escape(project.category)}</span><h3>${escape(project.title)}</h3><p>${escape(project.description)}</p><div class="amount">예시 지원금 <b>${(project.amount/10000).toLocaleString()}<small>만 원</small></b></div><button class="primary" data-apply="${escape(project.id)}">사업 확인 · 신청하기 &nbsp; ↗</button></div></article>`).join('');
}
function cards(rows, reviewer = false) {
  if (!rows.length) return '<div class="empty">아직 접수된 신청이 없습니다.<br>지원사업을 선택해 첫 신청을 접수해 보세요.</div>';
  return rows.map(row => `<article class="application-card"><div><span class="badge ${escape(row.status)}">${labels[row.status]}</span><h3>${escape(row.project_title)}</h3><p>${escape(row.applicant_name)} · ${date(row.created_at)} · ${row.revision}차 제출</p>${row.reviewer_reason?`<p>담당자: ${escape(row.reviewer_reason)}</p>`:''}<small>접수번호 ${escape(row.id)}</small></div><div class="card-actions"><button class="secondary" data-detail="${escape(row.id)}" data-review="${reviewer}">${reviewer?'서류 확인 · 판단':'상세 확인'}</button>${!reviewer && ['NEEDS_SUPPLEMENT','CHECK_FAILED'].includes(row.status)?`<button class="primary" data-supplement="${escape(row.id)}">보완 제출</button>`:''}</div></article>`).join('');
}
async function refresh() {
  applications = await api('/api/applications');
  $('#application-count').textContent = applications.length;
  $('#applications').innerHTML = cards(applications);
  $('#reviewer-login').hidden = session.reviewer;
  $('#reviewer-tools').hidden = !session.reviewer;
  if (view === 'reviewer' && session.reviewer) {
    try { reviews = await api('/api/reviewer/applications'); $('#reviewer-applications').innerHTML = cards(reviews,true); }
    catch (error) { session.reviewer = false; $('#reviewer-login').hidden = false; $('#reviewer-tools').hidden = true; throw error; }
  }
}
function openForm(projectId, application = null) {
  const project = projects.find(item => item.id === projectId);
  $('#application-form').reset(); $('#form-error').hidden = true;
  $('#project-id').value = project.id; $('#application-id').value = application?.id || '';
  $('#form-title').textContent = project.title + (application ? ' · 보완 제출' : '');
  $('#submit-application').textContent = application ? '보완 내용 제출' : '신청 접수';
  $('#applicant-name').value = application?.applicant_name || ''; $('#purpose').value = application?.purpose || '';
  $('#document-fields').innerHTML = project.documents.map(document => `<label for="doc-${escape(document.key)}">${escape(document.label)} <small>증빙 텍스트 · 20자 이상</small></label><textarea id="doc-${escape(document.key)}" data-document="${escape(document.key)}" maxlength="5000" rows="3" placeholder="예시 증빙 내용을 입력하세요. 누락 시 보완 대상으로 분류됩니다.">${escape(application?.documents[document.key] || '')}</textarea>`).join('');
  $('#application-dialog').showModal();
}
async function openDetail(id, reviewer = false) {
  const row = reviewer ? reviews.find(item => item.id === id) : await api(`/api/applications/${id}`);
  const project = projects.find(item => item.id === row.project_id);
  $('#detail-content').innerHTML = `<h2>${escape(row.project_title)}</h2><span class="badge ${escape(row.status)}">${labels[row.status]}</span><p class="muted">${escape(row.applicant_name)} · ${row.revision}차 제출 · ${date(row.updated_at)} 갱신</p><h3 class="detail-section">신청 목적</h3><div class="detail-box">${escape(row.purpose)}</div><h3 class="detail-section">규칙 기반 사전 점검</h3><p class="muted">증빙의 존재·20자 이상 여부만 확인합니다. 증빙 진위와 지원 자격을 판정하지 않습니다.</p>${row.checks?`<ul class="checks">${row.checks.map(check => `<li><b class="${check.passed?'check-pass':'check-fail'}">${check.passed?'✓':'!'}</b><span>${escape(check.label)}<br><span class="muted">${escape(check.reason)}</span></span></li>`).join('')}</ul>`:'<div class="detail-box">점검 작업을 처리하고 있습니다. 잠시 후 상세 화면을 다시 열어 주세요.</div>'}${project.documents.map(document=>`<h3 class="detail-section">${escape(document.label)}</h3><div class="detail-box">${escape(row.documents[document.key]||'제출되지 않음')}</div>`).join('')}${row.reviewer_reason?`<h3 class="detail-section">담당자 검토 사유</h3><div class="detail-box">${escape(row.reviewer_reason)}</div>`:''}<h3 class="detail-section">처리 이력</h3><ol class="events">${(row.events||[]).map(event=>`<li><time>${date(event.created_at)}</time> · ${event.revision}차 · ${escape(event.detail)}</li>`).join('')}</ol>${reviewer && ['READY','NEEDS_SUPPLEMENT'].includes(row.status)?`<form id="decision-form" data-id="${escape(row.id)}" data-revision="${row.revision}"><label for="review-reason">담당자 판단 사유 <small>5자 이상 · 신청자에게 표시</small></label><textarea id="review-reason" minlength="5" maxlength="1000" rows="3" required placeholder="증빙 내용을 확인하고 승인 또는 보완 사유를 남겨 주세요."></textarea><div id="decision-error" class="form-error" hidden></div><div class="review-actions"><button type="submit" class="primary" value="APPROVED" ${row.status!=='READY'?'disabled':''}>신청 승인</button><button type="submit" class="secondary" value="NEEDS_SUPPLEMENT">보완 요청</button></div></form>`:''}`;
  $('#detail-dialog').showModal();
}
document.addEventListener('click', event => {
  const button = event.target.closest('button'); if (!button) return;
  if (button.dataset.view) showView(button.dataset.view);
  if (button.dataset.close) $(`#${button.dataset.close}`).close();
  if (button.dataset.apply) openForm(button.dataset.apply);
  if (button.dataset.supplement) { const row = applications.find(item=>item.id===button.dataset.supplement); openForm(row.project_id,row); }
  if (button.dataset.detail) openDetail(button.dataset.detail,button.dataset.review==='true').catch(error=>notice(error.message,true));
});
$('#fill-example').addEventListener('click',()=>{
  $('#applicant-name').value = '예시 지원자';
  $('#purpose').value = '이번 지원을 통해 학습 계획을 수립하고 지역 사회에 도움이 되는 작은 실험을 진행하려고 합니다.';
  document.querySelectorAll('[data-document]').forEach(field=>field.value = `${projects.find(item=>item.id===$('#project-id').value).documents.find(item=>item.key===field.dataset.document).label} 합성 예제입니다. 필요한 참여 조건과 계획을 확인했으며 실제 개인정보나 발급 문서를 포함하지 않습니다.`);
});
$('#application-form').addEventListener('submit',async event=>{
  event.preventDefault(); const button = $('#submit-application'); button.disabled = true; $('#form-error').hidden = true;
  const id = $('#application-id').value;
  const payload = {project_id:$('#project-id').value,applicant_name:$('#applicant-name').value,purpose:$('#purpose').value,documents:Object.fromEntries([...document.querySelectorAll('[data-document]')].map(field=>[field.dataset.document,field.value]))};
  try { await api('/api/applications'+(id?`/${id}`:''), {method:id?'PUT':'POST',body:JSON.stringify(payload)}); $('#application-dialog').close(); showView('applications'); notice('접수를 저장했습니다. 사전 점검이 끝나면 상태가 자동으로 갱신됩니다.'); }
  catch(error){$('#form-error').textContent=error.message;$('#form-error').hidden=false;}
  finally{button.disabled=false;}
});
$('#reviewer-login').addEventListener('submit',async event=>{
  event.preventDefault(); const button=event.submitter;button.disabled=true;
  try{await api('/api/reviewer/session',{method:'POST',body:JSON.stringify({token:$('#reviewer-token').value})});$('#reviewer-token').value='';session.reviewer=true;await refresh();notice('담당자 권한이 1시간 동안 활성화됩니다.');}
  catch(error){notice(error.message,true);}finally{button.disabled=false;}
});
$('#reviewer-logout').addEventListener('click',async event=>{
  event.target.disabled=true;
  try{await api('/api/reviewer/session',{method:'DELETE'});session.reviewer=false;await refresh();}catch(error){notice(error.message,true);}finally{event.target.disabled=false;}
});
document.addEventListener('submit',async event=>{
  if(event.target.id!=='decision-form')return;event.preventDefault();const form=event.target;const decision=event.submitter.value;
  form.querySelectorAll('button').forEach(button=>button.disabled=true);
  try{await api(`/api/reviewer/applications/${form.dataset.id}/decision`,{method:'POST',body:JSON.stringify({decision,revision:Number(form.dataset.revision),reason:$('#review-reason').value})});$('#detail-dialog').close();await refresh();notice('담당자 판단과 사유를 저장했습니다.');}
  catch(error){$('#decision-error').textContent=error.message;$('#decision-error').hidden=false;form.querySelectorAll('button').forEach(button=>button.disabled=button.value==='APPROVED'&&reviews.find(row=>row.id===form.dataset.id)?.status!=='READY');}
});
async function initialize(){session=await api('/api/session');projects=await api('/api/projects');showProjects();await refresh();if(!session.reviewer_configured)$('#reviewer-help').textContent='담당자 기능이 아직 설정되지 않았습니다. 서버 실행 전에 GOLABA_REVIEWER_TOKEN을 16자 이상 설정하세요.';}
initialize().catch(error=>notice(error.message,true));
setInterval(async()=>{if(polling||document.hidden||document.querySelector('dialog[open]'))return;if(!applications.some(row=>row.status==='CHECKING')&&view!=='reviewer')return;polling=true;try{await refresh();}catch(error){notice(error.message,true);}finally{polling=false;}},2000);
