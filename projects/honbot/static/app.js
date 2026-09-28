/*
 * 장현진 | 2026-09-28
 * HONBOT: 강의 재생 시점과 질문을 묶고 서버에 복습·이해도 기록을 저장합니다.
 * 실행: 프로젝트 FastAPI 서버에서 / 경로를 엽니다. API 키는 서버에서만 관리합니다.
 */
(() => {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const video = $('#lecture-video');
  const state = {
    lecture: null,
    questions: [],
    selectedId: null,
    parentId: null,
    activeTab: 'questions',
    submitting: false,
    retryPayload: null,
    health: null,
    lectureVersion: 0,
    pendingSeek: null,
    toastTimer: null,
  };

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function button(label, className, onClick) {
    const node = element('button', className, label);
    node.type = 'button';
    node.addEventListener('click', onClick);
    return node;
  }

  function formatTime(value) {
    const seconds = Math.max(0, Math.floor(Number(value) || 0));
    const minutes = Math.floor(seconds / 60);
    return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  }

  function lecturePath(suffix = '') {
    return `/api/lectures/${encodeURIComponent(state.lecture.id)}${suffix}`;
  }

  function toast(message) {
    clearTimeout(state.toastTimer);
    $('#toast').textContent = message;
    $('#toast').hidden = false;
    state.toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 3800);
  }

  async function api(path, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeout || 20000);
    try {
      const response = await fetch(path, {
        method: options.method || 'GET',
        credentials: 'same-origin',
        headers: options.body ? { 'Content-Type': 'application/json' } : {},
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        const detail = typeof result?.detail === 'string' ? result.detail : null;
        throw new Error(detail || `요청을 처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요. (${response.status})`);
      }
      return result;
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('응답 시간이 길어지고 있어요. 잠시 뒤 다시 시도해 주세요.');
      if (error instanceof TypeError) throw new Error('서버에 연결하지 못했어요. 연결을 확인하고 다시 시도해 주세요.');
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  function setPageError(message) {
    $('#page-alert-text').textContent = message || '';
    $('#page-alert').hidden = !message;
  }

  function setRequestError(message) {
    $('#request-alert-text').textContent = message || '';
    $('#request-alert').hidden = !message;
    $('#retry-question').hidden = !state.retryPayload;
  }

  function showConnection(connected) {
    const label = $('#connection-status');
    label.textContent = connected ? '질문 가능' : '연결 확인';
    label.classList.toggle('is-error', !connected);
  }

  function showMode(health) {
    const mode = $('#assistant-mode');
    if (health?.ai_mode === 'openai_compatible') {
      mode.textContent = `${health.model || '연결된 모델'} · 강의 근거와 함께 답변`;
    } else if (health?.ai_mode === 'transcript') {
      mode.textContent = '강의 자료 검색 · 관련 구간을 찾아드려요';
    } else {
      mode.textContent = '강의 내용을 바탕으로 질문하세요.';
    }
  }

  function setSubmitting(value) {
    state.submitting = value;
    $('#question-input').disabled = value || !state.lecture;
    $('#send-question').disabled = value || !state.lecture;
    $('#lecture-select').disabled = value || !state.lecture;
    $('#retry-question').disabled = value;
    $('#reload-button').disabled = value;
    $('#send-label').textContent = value ? '확인 중…' : '질문하기';
    $('#question-form').setAttribute('aria-busy', String(value));
  }

  function resetFollowup() {
    state.parentId = null;
    $('#followup-context').hidden = true;
    $('#followup-text').textContent = '';
  }

  function setFollowup(question) {
    state.parentId = question.id;
    $('#followup-text').textContent = `이어서 질문: ${question.question}`;
    $('#followup-context').hidden = false;
    $('#question-input').focus();
  }

  function safeMediaUrl(value) {
    if (!value) return null;
    try {
      const url = new URL(value, window.location.href);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
    } catch {
      return null;
    }
  }

  function configureVideo(lecture) {
    video.pause();
    video.replaceChildren();
    video.removeAttribute('src');
    video.removeAttribute('poster');
    const source = safeMediaUrl(lecture.video_url);
    video.hidden = !source;
    $('#video-empty').hidden = Boolean(source);
    $('#video-empty-text').textContent = source ? '' : '등록된 강의 영상이 없어요. 강의 목차와 자료는 아래에서 확인할 수 있습니다.';
    if (source) {
      video.src = source;
      const poster = safeMediaUrl(lecture.poster_url);
      if (poster) video.poster = poster;
      const subtitles = safeMediaUrl(lecture.subtitle_url);
      if (subtitles) {
        const track = element('track');
        track.kind = 'captions';
        track.label = '한국어';
        track.srclang = 'ko';
        track.src = subtitles;
        track.default = true;
        track.addEventListener('load', () => {
          // 일시정지 상태에서도 자막이 네이티브 재생 컨트롤에 가려지지 않게 배치합니다.
          for (const cue of track.track.cues || []) {
            cue.snapToLines = false;
            cue.line = 65;
          }
        });
        video.append(track);
      }
    }
    video.load();
    updatePlaybackContext();
  }

  function segmentAt(seconds) {
    const segments = state.lecture?.segments || [];
    return segments.find((segment) => seconds >= Number(segment.start) && seconds < Number(segment.end))
      || (Number.isFinite(video.duration) && seconds >= video.duration - 0.1 ? segments.at(-1) : null);
  }

  function updatePlaybackContext() {
    const seconds = Number.isFinite(video.currentTime) ? video.currentTime : 0;
    $('#current-time').textContent = formatTime(seconds);
    $('#question-time').textContent = formatTime(seconds);
    const segment = segmentAt(seconds);
    $('#segment-title').textContent = segment?.title || '강의 내용';
    $('#segment-transcript').textContent = segment?.text || '재생 시점에 맞는 강의 내용을 여기서 확인할 수 있어요.';
  }

  function seekVideo(seconds) {
    if (!video.getAttribute('src')) {
      toast('등록된 강의 영상이 없어 해당 시점으로 이동할 수 없어요.');
      return;
    }
    const target = Math.max(0, Number(seconds) || 0);
    if (video.readyState >= 1) {
      video.currentTime = Number.isFinite(video.duration) ? Math.min(target, video.duration) : target;
      updatePlaybackContext();
    } else {
      state.pendingSeek = target;
      toast('영상을 불러오면 선택한 시점으로 이동합니다.');
    }
  }

  function renderEmpty(container, message) {
    container.replaceChildren(element('p', 'empty-records', message));
  }

  function selectQuestion(question, seek = true) {
    if (state.submitting) {
      toast('현재 질문에 대한 답변을 먼저 기다려 주세요.');
      return;
    }
    state.selectedId = question.id;
    resetFollowup();
    if (seek) seekVideo(question.timestamp);
    renderQuestions();
    renderAnswer(question);
    $('#conversation').scrollTop = 0;
  }

  function questionRecord(question) {
    const record = button('', 'record', () => selectQuestion(question));
    record.classList.toggle('is-selected', String(question.id) === String(state.selectedId));
    if (String(question.id) === String(state.selectedId)) record.setAttribute('aria-current', 'true');
    const time = element('time', '', formatTime(question.timestamp));
    time.dateTime = `PT${Math.max(0, Math.floor(Number(question.timestamp) || 0))}S`;
    const title = element('span', 'record-title', question.question);
    const status = element('span', 'record-status');
    const statuses = [];
    if (question.bookmarked) statuses.push('저장됨');
    if (question.feedback?.rating === 'unclear') statuses.push('다시 보기');
    else if (question.feedback?.rating === 'understood') statuses.push('이해했어요');
    status.textContent = statuses.join(' · ') || '↗';
    record.append(time, title, status);
    return record;
  }

  function renderQuestions() {
    $('#question-count').textContent = state.questions.length;
    const list = $('#question-list');
    if (!state.questions.length) {
      renderEmpty(list, '아직 남긴 질문이 없어요. 강의를 보다가 궁금한 점을 질문해 보세요.');
      return;
    }
    list.replaceChildren(...[...state.questions].sort((left, right) => Number(right.id) - Number(left.id)).map(questionRecord));
  }

  function renderChapters() {
    const list = $('#chapter-list');
    const chapters = state.lecture?.chapters || [];
    if (!chapters.length) {
      renderEmpty(list, '등록된 강의 목차가 없어요.');
      return;
    }
    list.replaceChildren(...chapters.map((chapter) => {
      const record = button('', 'record', () => seekVideo(chapter.start));
      record.append(element('time', '', formatTime(chapter.start)), element('span', 'record-title', chapter.title), element('span', 'record-status', '이동 ↗'));
      return record;
    }));
  }

  function renderWelcome() {
    const welcome = element('div', 'conversation-welcome');
    const mark = element('span', 'welcome-symbol', 'h');
    mark.setAttribute('aria-hidden', 'true');
    welcome.append(mark, element('h3', '', '어떤 부분이 궁금한가요?'), element('p', '', '지금 보는 강의 시점과 함께 질문하면 관련 강의 내용을 확인할 수 있어요.'));
    welcome.append(button('지금 설명하는 개념을 알려주세요 ↗', 'suggestion-button', fillSuggestion));
    $('#conversation').replaceChildren(welcome);
  }

  function questionBubble(question) {
    const bubble = element('div', 'question-bubble');
    const segment = (state.lecture?.segments || []).find((item) => Number(question.timestamp) >= Number(item.start) && Number(question.timestamp) < Number(item.end));
    bubble.append(element('time', '', `${formatTime(question.timestamp)}${segment?.title ? ` · ${segment.title}` : ''}`), element('p', '', question.question));
    return bubble;
  }

  function providerText(question) {
    return question.provider === 'transcript' ? '강의 자료 검색 결과' : `${question.model || '연결된 모델'} · 생성 답변`;
  }

  function renderAnswer(question) {
    const conversation = $('#conversation');
    const answer = element('section', 'answer');
    const byline = element('div', 'answer-by');
    byline.append(element('span', 'answer-icon', 'h'), element('span', '', 'HONBOT'), element('span', 'provider-label', providerText(question)));
    answer.append(byline, element('p', 'answer-text', question.answer || '표시할 답변이 없습니다.'));
    const citations = Array.isArray(question.citations) ? question.citations : [];
    if (citations.length) {
      answer.append(element('p', 'evidence-heading', '답변과 연결된 강의 내용'));
      citations.forEach((citation) => {
        const reference = button('', 'citation', () => seekVideo(citation.start));
        reference.append(element('span', 'citation-label', `${formatTime(citation.start)}–${formatTime(citation.end)} · ${citation.title || '강의 구간'} ↗`), element('span', 'citation-text', citation.text || ''));
        answer.append(reference);
      });
    }
    const actions = element('div', 'answer-actions');
    const bookmark = button(question.bookmarked ? '✓ 복습에 저장됨' : '＋ 복습에 저장', `action-button${question.bookmarked ? ' is-active' : ''}`, () => toggleBookmark(question, bookmark));
    bookmark.setAttribute('aria-pressed', String(Boolean(question.bookmarked)));
    actions.append(button(`↶ ${formatTime(question.timestamp)} 다시 보기`, 'action-button', () => seekVideo(question.timestamp)), bookmark, button('이어서 질문하기', 'action-button', () => setFollowup(question)));
    answer.append(actions, feedbackControls(question));
    conversation.replaceChildren(questionBubble(question), answer);
  }

  function feedbackControls(question) {
    const block = element('div', 'feedback-block');
    const row = element('div', 'feedback-row');
    row.append(element('span', '', '설명이 이해되셨나요?'));
    const commentLabel = element('label', 'feedback-comment-label', '어려웠던 부분을 남겨 주세요 (선택)');
    const comment = element('textarea', 'feedback-comment');
    comment.id = `feedback-comment-${question.id}`;
    comment.maxLength = 1000;
    comment.rows = 2;
    comment.placeholder = '예: 평균변화율과 순간변화율의 차이가 어려워요.';
    comment.value = question.feedback?.comment || '';
    commentLabel.htmlFor = comment.id;
    const status = element('p', 'feedback-status');
    status.setAttribute('role', 'status');
    const ratingButtons = [];
    const understood = button('이해했어요', 'feedback-button', () => saveFeedback(question, 'understood', comment.value, ratingButtons, status));
    const unclear = button('아직 어려워요', 'feedback-button is-unclear', () => saveFeedback(question, 'unclear', comment.value, ratingButtons, status));
    understood.classList.toggle('is-active', question.feedback?.rating === 'understood');
    unclear.classList.toggle('is-active', question.feedback?.rating === 'unclear');
    understood.setAttribute('aria-pressed', String(question.feedback?.rating === 'understood'));
    unclear.setAttribute('aria-pressed', String(question.feedback?.rating === 'unclear'));
    row.append(understood, unclear);
    const save = button('의견 저장', 'quiet-button', () => {
      if (!question.feedback?.rating) { status.textContent = '먼저 이해도를 선택해 주세요.'; return; }
      saveFeedback(question, question.feedback.rating, comment.value, ratingButtons, status);
    });
    ratingButtons.push(understood, unclear, save);
    block.append(row, commentLabel, comment, save, status);
    return block;
  }

  async function toggleBookmark(question, control) {
    control.disabled = true;
    const bookmarked = !question.bookmarked;
    const version = state.lectureVersion;
    try {
      await api(`/api/questions/${encodeURIComponent(question.id)}/bookmark`, { method: 'POST', body: { bookmarked } });
      if (version !== state.lectureVersion) return;
      question.bookmarked = bookmarked;
      control.textContent = bookmarked ? '✓ 복습에 저장됨' : '＋ 복습에 저장';
      control.classList.toggle('is-active', bookmarked);
      control.setAttribute('aria-pressed', String(bookmarked));
      renderQuestions();
      refreshActivePanel();
      toast(bookmarked ? '복습 목록에 저장했어요.' : '복습 저장을 해제했어요.');
    } catch (error) {
      toast(error.message);
    } finally {
      control.disabled = false;
    }
  }

  async function saveFeedback(question, rating, comment, controls, status) {
    controls.forEach((control) => { control.disabled = true; });
    status.textContent = '저장하고 있어요…';
    const version = state.lectureVersion;
    try {
      await api(`/api/questions/${encodeURIComponent(question.id)}/feedback`, { method: 'POST', body: { rating, comment: comment.trim() } });
      if (version !== state.lectureVersion) return;
      question.feedback = { rating, comment: comment.trim() };
      controls[0].classList.toggle('is-active', rating === 'understood');
      controls[1].classList.toggle('is-active', rating === 'unclear');
      controls[0].setAttribute('aria-pressed', String(rating === 'understood'));
      controls[1].setAttribute('aria-pressed', String(rating === 'unclear'));
      status.textContent = '이해도와 의견을 저장했어요.';
      renderQuestions();
      refreshActivePanel();
    } catch (error) {
      status.textContent = error.message;
    } finally {
      controls.forEach((control) => { control.disabled = false; });
    }
  }

  function syncQuestion(record) {
    const index = state.questions.findIndex((question) => String(question.id) === String(record.id));
    if (index >= 0) Object.assign(state.questions[index], record);
    else state.questions.push(record);
    return index >= 0 ? state.questions[index] : record;
  }

  async function loadReview() {
    if (!state.lecture) return;
    const version = state.lectureVersion;
    const list = $('#review-list');
    const refresh = $('#refresh-review');
    refresh.disabled = true;
    renderEmpty(list, '복습할 질문을 불러오고 있어요…');
    try {
      const records = await api(lecturePath('/review'));
      if (version !== state.lectureVersion) return;
      if (!Array.isArray(records)) throw new Error('복습 목록을 읽지 못했어요. 다시 불러와 주세요.');
      if (!records.length) { renderEmpty(list, '복습에 저장한 질문이 없어요. 답변에서 저장하거나 이해도를 남겨 보세요.'); return; }
      list.replaceChildren(...records.map((record) => questionRecord(syncQuestion(record))));
    } catch (error) {
      if (version === state.lectureVersion) renderEmpty(list, error.message);
    } finally {
      if (version === state.lectureVersion) refresh.disabled = false;
    }
  }

  async function loadInsights() {
    if (!state.lecture) return;
    const version = state.lectureVersion;
    const content = $('#insight-content');
    const refresh = $('#refresh-insights');
    refresh.disabled = true;
    renderEmpty(content, '학습 피드백을 불러오고 있어요…');
    try {
      const insights = await api(lecturePath('/insights'));
      if (version !== state.lectureVersion) return;
      if (!insights) throw new Error('학습 피드백을 읽지 못했어요. 다시 불러와 주세요.');
      const stats = element('div', 'insight-stats');
      [['내 질문', insights.question_count], ['이해했어요', insights.understood_count], ['아직 어려워요', insights.unclear_count], ['복습 저장', insights.bookmarked_count]].forEach(([label, count]) => {
        const stat = element('div', 'stat');
        stat.append(element('span', '', label), element('strong', '', Number(count) || 0));
        stats.append(stat);
      });
      const topics = element('div', 'topic-list');
      if (!insights.topics?.length) renderEmpty(topics, '질문과 이해도 기록이 쌓이면 주제별로 정리해 드려요.');
      else insights.topics.forEach((topic) => {
        const row = element('div', 'topic-row');
        row.append(element('span', '', topic.title), element('span', '', `질문 ${Number(topic.count) || 0} · 어려움 ${Number(topic.unclear_count) || 0}`));
        topics.append(row);
      });
      content.replaceChildren(stats, topics);
    } catch (error) {
      if (version === state.lectureVersion) renderEmpty(content, error.message);
    } finally {
      if (version === state.lectureVersion) refresh.disabled = false;
    }
  }

  function refreshActivePanel() {
    if (state.activeTab === 'review') loadReview();
    if (state.activeTab === 'insights') loadInsights();
  }

  function activateTab(name) {
    state.activeTab = name;
    document.querySelectorAll('[data-tab]').forEach((tab) => {
      const active = tab.dataset.tab === name;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      $(`#panel-${tab.dataset.tab}`).hidden = !active;
    });
    refreshActivePanel();
  }

  function fillSuggestion() {
    $('#question-input').value = '지금 설명하는 개념을 알려주세요.';
    $('#question-input').focus();
  }

  async function sendQuestion(payload = null) {
    if (state.submitting || !state.lecture) return;
    const text = $('#question-input').value.trim();
    if (!payload && !text) { $('#question-input').focus(); return; }
    const request = payload || {
      question: text,
      // 영상 인코딩의 끝 오차(예: 60.046초)는 강의 명세의 재생 범위에 맞춥니다.
      timestamp: Number.isFinite(video.currentTime) ? Number(Math.min(video.currentTime, Number(state.lecture.duration) || video.currentTime).toFixed(3)) : 0,
      parent_question_id: state.parentId,
      request_id: crypto.randomUUID(),
    };
    state.retryPayload = request; // 재시도에는 같은 식별자를 사용해 질문 중복 저장을 막습니다.
    setRequestError(null);
    setSubmitting(true);
    const conversation = $('#conversation');
    conversation.replaceChildren(questionBubble(request), element('p', 'loading-answer', state.health?.ai_mode === 'transcript' ? '관련 강의 내용을 찾고 있어요…' : '강의 내용을 확인하며 답변을 준비하고 있어요…'));
    conversation.scrollTop = 0;
    try {
      const result = await api(lecturePath('/questions'), { method: 'POST', body: request, timeout: 120000 });
      if (!result || result.id === undefined || typeof result.answer !== 'string') throw new Error('답변을 읽지 못했어요. 다시 시도해 주세요.');
      const question = syncQuestion(result);
      state.selectedId = question.id;
      state.retryPayload = null;
      $('#question-input').value = '';
      resetFollowup();
      showConnection(true);
      renderQuestions();
      renderAnswer(question);
      refreshActivePanel();
    } catch (error) {
      conversation.replaceChildren(questionBubble(request), element('p', 'answer-text', '답변을 가져오지 못했어요. 질문은 입력창에 남겨 두었습니다.'));
      $('#question-input').value = request.question;
      setRequestError(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function loadLecture(id) {
    const version = ++state.lectureVersion;
    state.lecture = null;
    state.questions = [];
    state.selectedId = null;
    state.retryPayload = null;
    state.pendingSeek = null;
    resetFollowup();
    setRequestError(null);
    setPageError(null);
    setSubmitting(false);
    video.pause();
    $('#course-title').textContent = '강의를 불러오고 있어요';
    renderQuestions();
    renderWelcome();
    const results = await Promise.allSettled([
      api(`/api/lectures/${encodeURIComponent(id)}`),
      api(`/api/lectures/${encodeURIComponent(id)}/questions`),
    ]);
    if (version !== state.lectureVersion) return;
    if (results[0].status === 'rejected') {
      setPageError(results[0].reason.message);
      $('#course-title').textContent = '강의를 불러오지 못했어요';
      $('#lecture-select').disabled = false;
      showConnection(false);
      return;
    }
    const lecture = results[0].value;
    if (!lecture || lecture.id === undefined) {
      setPageError('강의 정보를 읽지 못했어요. 다시 불러와 주세요.');
      $('#lecture-select').disabled = false;
      return;
    }
    state.lecture = lecture;
    state.questions = results[1].status === 'fulfilled' && Array.isArray(results[1].value) ? results[1].value : [];
    if (results[1].status === 'rejected') setPageError(`강의는 준비됐지만 질문 기록을 불러오지 못했어요. ${results[1].reason.message}`);
    $('#course-title').textContent = lecture.title;
    $('#course-category').textContent = lecture.category || '온라인 강의';
    $('#lecture-select').value = String(lecture.id);
    $('#export-link').href = lecturePath('/export');
    configureVideo(lecture);
    renderQuestions();
    renderChapters();
    setSubmitting(false);
    showConnection(true);
    refreshActivePanel();
  }

  async function initialize() {
    setPageError(null);
    $('#reload-button').disabled = true;
    // 첫 요청이 학습 공간 쿠키를 확정한 뒤 다른 API를 호출합니다.
    try {
      state.health = await api('/api/health');
      showMode(state.health);
    } catch {
      state.health = null;
      showMode(null);
    }
    let lectures;
    try {
      lectures = await api('/api/lectures');
    } catch (error) {
      setPageError(error.message);
      $('#course-title').textContent = '강의 연결을 확인해 주세요';
      $('#video-empty-text').textContent = '서버에서 강의를 불러오지 못했어요.';
      showConnection(false);
      renderQuestions();
      $('#reload-button').disabled = false;
      return;
    }
    $('#reload-button').disabled = false;
    if (!Array.isArray(lectures) || !lectures.length) {
      $('#course-title').textContent = '등록된 강의가 없어요';
      $('#video-empty-text').textContent = '등록된 강의가 없습니다. 강의 자료를 추가한 뒤 다시 불러와 주세요.';
      $('#lecture-select').replaceChildren(element('option', '', '강의 없음'));
      setPageError('현재 등록된 강의가 없어요.');
      showConnection(false);
      renderQuestions();
      return;
    }
    const previousId = state.lecture?.id;
    $('#lecture-select').replaceChildren(...lectures.map((lecture) => {
      const option = element('option', '', lecture.title);
      option.value = String(lecture.id);
      return option;
    }));
    const selected = lectures.find((lecture) => String(lecture.id) === String(previousId)) || lectures[0];
    await loadLecture(selected.id);
  }

  $('#question-form').addEventListener('submit', (event) => { event.preventDefault(); sendQuestion(); });
  $('#question-input').addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); sendQuestion(); }
  });
  $('#question-input').addEventListener('input', () => {
    if (state.retryPayload && $('#question-input').value.trim() !== state.retryPayload.question) {
      state.retryPayload = null;
      setRequestError(null);
    }
  });
  $('#retry-question').addEventListener('click', () => { if (state.retryPayload) sendQuestion(state.retryPayload); });
  $('#clear-followup').addEventListener('click', resetFollowup);
  $('#suggested-question').addEventListener('click', fillSuggestion);
  $('#lecture-select').addEventListener('change', (event) => loadLecture(event.target.value));
  $('#reload-button').addEventListener('click', initialize);
  $('#refresh-review').addEventListener('click', loadReview);
  $('#refresh-insights').addEventListener('click', loadInsights);
  document.querySelectorAll('[data-tab]').forEach((tab) => {
    tab.addEventListener('click', () => activateTab(tab.dataset.tab));
    tab.addEventListener('keydown', (event) => {
      const tabs = [...document.querySelectorAll('[data-tab]')];
      const index = tabs.indexOf(tab);
      let target;
      if (event.key === 'ArrowRight') target = tabs[(index + 1) % tabs.length];
      else if (event.key === 'ArrowLeft') target = tabs[(index - 1 + tabs.length) % tabs.length];
      else if (event.key === 'Home') target = tabs[0];
      else if (event.key === 'End') target = tabs.at(-1);
      if (target) { event.preventDefault(); activateTab(target.dataset.tab); target.focus(); }
    });
  });
  video.addEventListener('timeupdate', updatePlaybackContext);
  video.addEventListener('loadedmetadata', () => {
    if (state.pendingSeek !== null) {
      const target = state.pendingSeek;
      state.pendingSeek = null;
      seekVideo(target);
    }
    updatePlaybackContext();
  });
  video.addEventListener('error', () => {
    if (!video.getAttribute('src')) return;
    video.hidden = true;
    $('#video-empty').hidden = false;
    $('#video-empty-text').textContent = '영상을 재생하지 못했어요. 아래 강의 자료를 확인하거나 페이지를 새로고침해 주세요.';
  });
  initialize();
})();
