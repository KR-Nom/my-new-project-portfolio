/* 작성자: 장현진 · 2026-09-28. API 응답만 화면에 반영하는 CourtCast 신규 UI. */
'use strict';
const $ = (selector) => document.querySelector(selector);
const state = { courts: [], allCourts: [], selected: null, favoriteOnly: false, searchVersion: 0 };
const labels = { dry: '마른 상태', wet: '젖어 있어요', puddles: '물웅덩이', closed: '이용 제한' };
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const stamp = (value) => new Date(value).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
let toastTimer;

async function api(url, options = {}) {
  const response = await fetch(url, { credentials: 'same-origin', ...options });
  const payload = await response.json();
  if (!response.ok) throw new Error(typeof payload.detail === 'string' ? payload.detail : '입력 내용을 확인해 주세요.');
  return payload;
}

function toast(message) {
  $('#toast').textContent = message;
  $('#toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 2700);
}

async function loadCourts() {
  const version = ++state.searchVersion;
  const params = new URLSearchParams({ q: $('#searchInput').value.trim(), district: $('#districtSelect').value, favorites: String(state.favoriteOnly) });
  $('#searchClear').hidden = !$('#searchInput').value;
  try {
    const result = await api('/api/courts?' + params);
    if (version !== state.searchVersion) return;
    state.courts = result.items;
    if (!state.allCourts.length && !params.get('q') && !params.get('district') && !state.favoriteOnly) state.allCourts = result.items;
    if ($('#districtSelect').options.length === 1) {
      result.districts.forEach((district) => $('#districtSelect').add(new Option(district, district)));
    }
    $('#favoriteCount').textContent = result.favorite_count;
    $('#resultCount').textContent = '서울 ' + result.total + '곳 중 ' + result.count + '곳';
    $('#listCount').textContent = result.count + '곳';
    renderList();
    const exists = state.courts.some((court) => court.id === state.selected?.id);
    if (!exists && state.courts.length) {
      const preferred = state.courts.find((court) => court.name === '응봉공원') || state.courts[0];
      await selectCourt(preferred.id);
    } else if (!state.courts.length) {
      state.selected = null;
      $('#selectedOverview').innerHTML = '<p class="empty">검색 조건에 맞는 코트가 없습니다.<br>검색어 또는 자치구를 바꿔 보세요.</p>';
      $('#weatherContent').innerHTML = '<p class="empty">코트를 선택하면 예보가 표시됩니다.</p>';
      $('#weatherMode').textContent = '선택 대기';
      $('#reportsContent').innerHTML = '<p class="empty">선택된 코트가 없습니다.</p>';
      $('#openReport').disabled = true;
    }
    renderMap();
  } catch (error) {
    $('#courtList').innerHTML = '<p class="empty error">' + esc(error.message) + '</p>';
  }
}

function renderList() {
  $('#courtList').innerHTML = state.courts.length ? state.courts.map((court) =>
    '<article class="court-item ' + (court.id === state.selected?.id ? 'selected' : '') + '" data-court="' + esc(court.id) + '">' +
    '<span class="district">' + esc(court.district) + ' · 테니스</span>' +
    '<button class="court-name" data-select="' + esc(court.id) + '">' + esc(court.name.replaceAll('>', ' · ')) + '</button>' +
    '<button class="court-favorite ' + (court.is_favorite ? 'saved' : '') + '" data-favorite="' + esc(court.id) + '" aria-label="' + esc(court.name) + ' 즐겨찾기 ' + (court.is_favorite ? '해제' : '추가') + '" aria-pressed="' + court.is_favorite + '">' + (court.is_favorite ? '♥' : '♡') + '</button>' +
    '<div class="court-meta"><span>' + esc(court.payment_description) + '</span><i class="dot"></i><span>예약상품 ' + court.service_count + '개</span></div>' +
    '<span class="court-report">' + (court.report_count ? '현장 제보 ' + court.report_count + '건' : '아직 현장 제보 없음') + '</span></article>'
  ).join('') : '<p class="empty">' + (state.favoriteOnly ? '아직 저장한 코트가 없어요.<br>코트 옆 하트를 눌러 저장해 보세요.' : '검색 결과가 없습니다.') + '</p>';
}

function renderMap() {
  const project = (court) => ({ x: 47 + (court.longitude - 126.80) / .34 * 575, y: 405 - (court.latitude - 37.46) / .24 * 307 });
  const all = state.allCourts;
  let svg = '<defs><pattern id="grid" width="34" height="34" patternUnits="userSpaceOnUse"><path d="M 34 0 L 0 0 0 34" fill="none" stroke="#dce5d6" stroke-width=".7"/></pattern><radialGradient id="wash"><stop stop-color="#d9e9ce" stop-opacity=".8"/><stop offset="1" stop-color="#edf2e9" stop-opacity="0"/></radialGradient></defs><rect width="670" height="485" fill="#edf2e9"/><rect x="0" y="80" width="670" height="360" fill="url(#grid)"/><ellipse cx="345" cy="280" rx="250" ry="166" fill="url(#wash)"/>';
  svg += '<text x="33" y="245" fill="#b0bca6" font-size="9" transform="rotate(-90 33 245)">37.58° N</text><text x="332" y="435" fill="#b0bca6" font-size="9">126.97° E</text>';
  const districtPositions = {};
  all.forEach((court) => { (districtPositions[court.district] ||= []).push(project(court)); });
  Object.entries(districtPositions).forEach(([district, points]) => {
    if (['강서구', '도봉구', '마포구', '서초구', '강동구', '관악구', '성북구'].includes(district)) {
      const x = points.reduce((sum, p) => sum + p.x, 0) / points.length;
      const y = points.reduce((sum, p) => sum + p.y, 0) / points.length;
      svg += '<text x="' + x + '" y="' + (y - 20) + '" text-anchor="middle" fill="#9cad92" font-size="11" font-weight="500">' + esc(district) + '</text>';
    }
  });
  const filtered = new Set(state.courts.map((c) => c.id));
  const ordered = [...all.filter((c) => c.id !== state.selected?.id), ...all.filter((c) => c.id === state.selected?.id)];
  ordered.forEach((court) => {
    const { x, y } = project(court);
    const selected = court.id === state.selected?.id;
    const visible = filtered.has(court.id);
    if (!visible) { svg += '<circle cx="' + x + '" cy="' + y + '" r="4" fill="#cad6c1"/>'; return; }
    svg += '<g class="map-pin" data-select="' + esc(court.id) + '" role="button" tabindex="0" aria-label="' + esc(court.name) + ' 선택"><title>' + esc(court.name) + '</title>';
    if (selected) {
      svg += '<circle cx="' + x + '" cy="' + y + '" r="27" fill="#2b79671a"/><circle cx="' + x + '" cy="' + y + '" r="19" fill="#2b79671a"/><circle cx="' + x + '" cy="' + y + '" r="11" fill="#176557" stroke="#fff" stroke-width="3"/><circle cx="' + x + '" cy="' + y + '" r="3" fill="#dcf0b2"/>';
      const name = court.name.length > 13 ? court.name.slice(0, 12) + '…' : court.name;
      const width = Math.max(105, name.length * 11 + 25);
      const labelX = Math.min(670 - width - 18, Math.max(18, x - width / 2));
      svg += '<rect x="' + labelX + '" y="' + (y + 23) + '" rx="7" width="' + width + '" height="32" fill="#fff" stroke="#d8e5ce"/><text x="' + (labelX + width / 2) + '" y="' + (y + 43) + '" text-anchor="middle" font-size="11" font-weight="700" fill="#285d49">' + esc(name) + '</text>';
    } else svg += '<circle cx="' + x + '" cy="' + y + '" r="6" fill="#8bb182" stroke="#fff" stroke-width="2"/>';
    svg += '</g>';
  });
  $('#courtMap').innerHTML = svg;
}

async function selectCourt(id) {
  const court = state.courts.find((item) => item.id === id);
  if (!court) return;
  state.selected = court;
  renderList();
  renderMap();
  const selectedItem = $('#courtList .selected');
  if (selectedItem && innerWidth > 760) {
    $('#courtList').scrollTop += selectedItem.getBoundingClientRect().top - $('#courtList').getBoundingClientRect().top - 10;
  }
  $('#openReport').disabled = false;
  $('#selectedOverview').innerHTML = '<div class="selected-top"><div><p class="place-category">' + esc(court.district) + ' / PUBLIC TENNIS COURT</p><h2>' + esc(court.name.replaceAll('>', ' · ')) + '</h2></div><a class="reservation-button" href="' + esc(court.reservation_url) + '" target="_blank" rel="noreferrer">공식 예약 보기 ↗</a></div><div class="info-row"><div><p>시설 이용</p><strong>' + esc(court.payment_description) + '</strong></div><div><p>대표 상품 이용시간</p><strong>' + esc(court.opening_time) + ' — ' + esc(court.closing_time) + '</strong></div><div><p>연결된 예약상품</p><strong>' + court.service_count + '개</strong></div></div><p class="official-status"><strong>' + esc(court.reservation_status) + '</strong> · 9월 28일 수집한 대표 상품의 접수 상태입니다.<br>실제 예약 가능 시간은 공식 예약 페이지를 확인하세요.</p>';
  const serviceCount = $('#selectedOverview .info-row > div:last-child strong');
  serviceCount.innerHTML = '<button id="openServices" class="service-count-button">' + court.service_count + '개 모두 보기 ↗</button>';
  $('#weatherContent').innerHTML = '<p class="empty">이 코트의 예보를 불러오고 있습니다.</p>';
  $('#weatherMode').textContent = '확인 중';
  $('#reportsContent').innerHTML = '<p class="empty">현장 제보를 확인하고 있습니다.</p>';
  await Promise.allSettled([loadWeather(id), loadReports(id)]);
}

async function loadWeather(id) {
  try {
    const weather = await api('/api/courts/' + encodeURIComponent(id) + '/weather');
    if (state.selected?.id !== id) return;
    const forecast = weather.forecast;
    const current = forecast.current;
    const code = current.weather_code;
    const description = code <= 1 ? '맑음' : code <= 3 ? '구름 많음' : code <= 48 ? '안개' : code <= 67 ? '비' : code <= 77 ? '눈' : code <= 82 ? '소나기' : '강수 가능';
    const symbol = code <= 1 ? '☀' : code <= 48 ? '☁' : '☂';
    const hourIndex = Math.max(0, forecast.hourly.time.findIndex((time) => time >= current.time.slice(0, 13) + ':00'));
    const times = forecast.hourly.time.slice(hourIndex, hourIndex + 5);
    const rain = forecast.hourly.precipitation_probability[hourIndex];
    $('#weatherMode').textContent = { live: '방금 갱신', cache: '15분 캐시', stale: '이전 캐시' }[weather.mode];
    $('#weatherContent').innerHTML = '<div class="weather-main"><div><div class="temperature">' + esc(current.temperature_2m) + '°</div><p class="weather-label">' + description + ' · ' + esc(state.selected.district) + '</p></div><span class="weather-symbol" aria-hidden="true">' + symbol + '</span></div><div class="weather-stats"><div>강수확률<strong>' + esc(rain ?? '—') + '%</strong></div><div>풍속<strong>' + esc(current.wind_speed_10m) + '<small> km/h</small></strong></div><div>강수량<strong>' + esc(current.precipitation) + '<small> mm</small></strong></div></div><div class="weather-hours">' + times.map((time, i) => '<div class="weather-hour">' + esc(time.slice(11, 16)) + '<b>' + esc(forecast.hourly.precipitation_probability[hourIndex + i]) + '%</b></div>').join('') + '</div><p class="weather-time">예보 기준 ' + esc(current.time.replace('T', ' ')) + ' (KST)<br>' + (weather.mode === 'stale' ? '갱신 실패 · 마지막 성공 ' : '조회 ') + esc(stamp(weather.fetched_at)) + ' · 모델 예보</p>';
  } catch (error) {
    if (state.selected?.id !== id) return;
    $('#weatherMode').textContent = '갱신 대기';
    $('#weatherContent').innerHTML = '<p class="empty error">' + esc(error.message) + '</p><button class="filter-button" id="retryWeather">예보 다시 불러오기</button>';
  }
}

async function loadReports(id) {
  try {
    const result = await api('/api/courts/' + encodeURIComponent(id) + '/reports');
    if (state.selected?.id !== id) return;
    $('#reportsContent').innerHTML = result.items.length ? result.items.slice(0, 3).map((report) =>
      '<div class="report-entry"><strong>' + labels[report.condition] + '</strong>' + (report.is_demo ? '<span class="report-demo">데모 제보</span>' : '') + '<p>' + esc(report.note || '추가 설명이 없습니다.') + '</p><small>' + esc(stamp(report.created_at)) + '</small>' + (report.is_mine ? '<button data-delete-report="' + report.id + '">내 제보 삭제</button>' : '') + '</div>'
    ).join('') : '<div class="empty-report"><span class="report-symbol">♧</span><strong>아직 현장 제보가 없어요</strong><p>오늘 코트를 방문하셨나요?<br>직접 본 상태를 이웃에게 알려 주세요.</p></div>';
  } catch (error) {
    if (state.selected?.id === id) $('#reportsContent').innerHTML = '<p class="empty error">' + esc(error.message) + '</p>';
  }
}

function setFavorites(value) {
  state.favoriteOnly = value;
  $('#onlyFavorites').setAttribute('aria-pressed', String(value));
  $('#exploreNav').classList.toggle('active', !value);
  $('#favoriteNav').classList.toggle('active', value);
  loadCourts();
}

let debounceTimer;
$('#searchInput').addEventListener('input', () => { clearTimeout(debounceTimer); debounceTimer = setTimeout(loadCourts, 220); });
$('#districtSelect').addEventListener('change', loadCourts);
$('#searchClear').addEventListener('click', () => { $('#searchInput').value = ''; loadCourts(); });
$('#onlyFavorites').addEventListener('click', () => setFavorites(!state.favoriteOnly));
$('#favoriteNav').addEventListener('click', () => setFavorites(true));
$('#exploreNav').addEventListener('click', () => setFavorites(false));
document.addEventListener('click', async (event) => {
  const favorite = event.target.closest('[data-favorite]');
  const select = event.target.closest('[data-select], [data-court]');
  const remove = event.target.closest('[data-delete-report]');
  try {
    if (favorite) {
      favorite.disabled = true;
      const court = state.courts.find((c) => c.id === favorite.dataset.favorite);
      await api('/api/favorites/' + encodeURIComponent(court.id), { method: court.is_favorite ? 'DELETE' : 'POST' });
      toast(court.is_favorite ? '즐겨찾기에서 해제했습니다.' : '이 코트를 즐겨찾기에 저장했습니다.');
      await loadCourts();
    } else if (select) await selectCourt(select.dataset.select || select.dataset.court);
    else if (remove) {
      remove.disabled = true;
      await api('/api/reports/' + remove.dataset.deleteReport, { method: 'DELETE' });
      await loadReports(state.selected.id);
      await loadCourts();
      toast('내 제보를 삭제했습니다.');
    } else if (event.target.closest('#retryWeather') && state.selected) await loadWeather(state.selected.id);
    else if (event.target.closest('#openServices') && state.selected) {
      $('#servicesContent').innerHTML = '<p class="empty">예약상품을 불러오고 있습니다.</p>';
      $('#servicesDialog').showModal();
      const detail = await api('/api/courts/' + encodeURIComponent(state.selected.id));
      $('#servicesContent').innerHTML = detail.services.map((service) => '<a class="service-row" href="' + esc(service.url) + '" target="_blank" rel="noreferrer"><strong>' + esc(service.title) + ' ↗</strong><span>' + esc(service.status) + ' · ' + esc(service.payment) + ' · ' + esc(service.opening_time) + '–' + esc(service.closing_time) + '</span></a>').join('');
    }
  } catch (error) { toast(error.message); if (favorite) favorite.disabled = false; if (remove) remove.disabled = false; }
});
$('#courtMap').addEventListener('keydown', (event) => {
  const target = event.target.closest('[data-select]');
  if (target && ['Enter', ' '].includes(event.key)) { event.preventDefault(); selectCourt(target.dataset.select); }
});
$('#openReport').addEventListener('click', () => {
  if (!state.selected) return;
  $('#reportForm').reset();
  $('#reportError').textContent = '';
  $('#reportCourtName').textContent = state.selected.name;
  $('#reportDialog').showModal();
});
$('#closeReport').addEventListener('click', () => $('#reportDialog').close());
$('#closeServices').addEventListener('click', () => $('#servicesDialog').close());
$('#reportForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!state.selected) return;
  $('#submitReport').disabled = true;
  const courtId = state.selected.id;
  try {
    await api('/api/courts/' + encodeURIComponent(courtId) + '/reports', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ condition: new FormData(event.target).get('condition'), note: $('#reportNote').value, is_demo: $('#isDemo').checked }),
    });
    $('#reportDialog').close();
    await loadReports(courtId);
    await loadCourts();
    toast('코트 상태가 저장되었습니다.');
  } catch (error) { $('#reportError').textContent = error.message; }
  finally { $('#submitReport').disabled = false; }
});
loadCourts();
