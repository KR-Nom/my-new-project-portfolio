// Editable HTML counterparts of the latest native Figma About and GOLABA slides.
export const css = `
.add-about,.add-golaba{font-family:var(--font);letter-spacing:-.35px}
.add-about *,.add-golaba *{box-sizing:border-box}
.add-about h2,.add-about h3,.add-about h4,.add-about p,.add-golaba h2,.add-golaba h3,.add-golaba p{margin:0}
.add-signature{position:absolute;left:0;top:0;width:11px;height:1080px;background:#ea002c}
.add-about{background:#f6f6f3;color:#25282d}
.add-about .ab-eyebrow{position:absolute;left:64px;top:34px;color:#e86a17;font:700 17px/1.4 Arial,var(--font);letter-spacing:1px}
.add-about .ab-name{position:absolute;left:64px;top:64px;font-size:57px;line-height:1.4;font-weight:750;letter-spacing:-2px}
.add-about .ab-degree{position:absolute;left:452px;top:86px;font-size:23px;line-height:1.4;color:#616770}
.add-about .ab-purpose{position:absolute;left:64px;top:158px;font-size:23px;line-height:1.4;color:#616770}
.add-about .ab-header-rule{position:absolute;left:64px;right:64px;top:208px;height:1px;background:#d9dcdd}
.add-about .ab-columns{position:absolute;left:64px;top:245px;width:1792px;display:grid;grid-template-columns:546px 546px 560px;column-gap:70px}
.add-about .ab-column{position:relative;min-width:0}
.add-about .ab-column+.ab-column:before{content:"";position:absolute;left:-38px;top:13px;width:1px;height:728px;background:#d9dcdd}
.add-about .ab-column-heading{font:700 27px/1.35 Arial,var(--font);letter-spacing:.25px;color:#e86a17;margin-bottom:27px}
.add-about .ab-column:nth-child(2) .ab-column-heading{color:#ea002c}
.add-about .ab-list{display:flex;flex-direction:column}
.add-about .ab-experience .ab-list{gap:36px}
.add-about .ab-education .ab-list{gap:24px}
.add-about .ab-awards .ab-list{gap:25px}
.add-about .ab-entry{display:flex;flex-direction:column;gap:7px}
.add-about .ab-date{font:400 17px/1.35 Arial,var(--font);color:#e86a17;letter-spacing:.1px}
.add-about .ab-education .ab-date{color:#ea002c}
.add-about .ab-title{font-size:25px;line-height:1.4;font-weight:700;letter-spacing:-.6px}
.add-about .ab-role{font-size:20px;line-height:1.4;font-weight:500}
.add-about .ab-summary{font-size:20px;line-height:1.5;color:#616770;letter-spacing:-.4px}
.add-about .ab-education .ab-title{font-size:24px}
.add-about .ab-education .ab-summary,.add-about .ab-awards .ab-summary{font-size:19px;line-height:1.45}
.add-about .ab-awards .ab-title{font-size:23px;line-height:1.4}
.add-about .ab-issuer{font-size:17px;line-height:1.4;color:#ea002c}
.add-golaba{background:#fff8f2;color:#25282d}
.add-golaba .go-heading{position:absolute;left:64px;top:48px;width:1128px}
.add-golaba .go-num{font:750 64px/1.45 Arial,var(--font);color:#e67626;letter-spacing:-2px}
.add-golaba .go-title{position:absolute;left:142px;top:1px;font:750 60px/1.45 Arial,var(--font);letter-spacing:-2px}
.add-golaba .go-definition{font-size:28px;line-height:1.45;font-weight:600;margin-top:14px;letter-spacing:-.7px}
.add-golaba .go-screen{position:absolute;left:64px;top:250px;width:1128px;height:704px;margin:0}
.add-golaba .go-screen img{display:block;width:100%;height:100%;object-fit:contain}
.add-golaba .go-screen figcaption{position:absolute;left:0;top:720px;width:1128px;font-size:17px;line-height:1.45;color:#8a7567}
.add-golaba .go-details{position:absolute;left:1250px;top:105px;width:606px;display:flex;flex-direction:column;gap:27px}
.add-golaba .go-subtitle{font-size:27px;line-height:1.45;font-weight:700;letter-spacing:-.65px}
.add-golaba .go-detail h3{font:700 15px/1.45 Arial,var(--font);letter-spacing:.15px;margin:0 0 9px}
.add-golaba .go-detail h3{color:#e67626}
.add-golaba .go-detail ol{margin:0;padding-left:29px;font-size:24px;line-height:1.5;letter-spacing:-.55px}
.add-golaba .go-detail li{padding-left:1px}
.add-golaba .go-detail p{font-size:21px;line-height:1.5;letter-spacing:-.45px}
.add-golaba .go-detail.go-stack p{font-size:20px;color:#7b746e}
.add-github{position:absolute;left:64px;top:1020px;width:1792px;color:#656b73;font:400 17px/1.45 Arial,var(--font);text-decoration:none;letter-spacing:0}

`;

const github = (path) => `https://github.com/KR-Nom/my-new-project-portfolio/tree/main/${path}`;
const footer = (path) => `<a class="add-github" href="${github(path)}" target="_blank" rel="noopener">${github(path)}</a>`;
const section = (prefix, title, body, cls = '') => `<section class="${prefix}-detail ${cls}"><h3>${title}</h3>${body}</section>`;

export function renderAbout(asset) {
  return `<div class="sheet" id="about"><section class="slide add-about" contenteditable="true">
<div class="add-signature"></div><p class="ab-eyebrow">ABOUT ME</p><h2 class="ab-name">장현진</h2>
<p class="ab-degree">전남대학교 전기및반도체공학 학사 · 2018.03–2026.02</p><p class="ab-purpose">경험 · 교육 · 수상</p><div class="ab-header-rule"></div>
<div class="ab-columns">
<section class="ab-column ab-experience"><h3 class="ab-column-heading">EXPERIENCE</h3><div class="ab-list">
<article class="ab-entry"><p class="ab-date">2026.02–2026.05</p><h4 class="ab-title">대신기공 · 폴란드 Płock 플랜트</h4><p class="ab-role">QC 인턴</p><p class="ab-summary">Hydro Test 문서·검사 데이터 관리<br>PICS·WIR·MTC·ISO 대조 및 Sheets 자동화</p></article>
<article class="ab-entry"><p class="ab-date">2022.03–2025.06</p><h4 class="ab-title">전남대학교 R.O.B LAB</h4><p class="ab-role">학부연구생 및 실험실장</p><p class="ab-summary">RNN·LSTM 시계열 예측, 전처리·정규화 비교<br>6개월 실험실장: 세미나·발표·협업 운영</p></article>
<article class="ab-entry"><p class="ab-date">2023.10–2023.11</p><h4 class="ab-title">ICT이노베이션스퀘어<br>우수교육생 국외연수</h4><p class="ab-role">미국 뉴욕</p><p class="ab-summary">글로벌 ICT 기업·스타트업 실무 공유<br>LinkedIn 재직자 세션 · IBM 로봇개·코드 교육</p></article>
</div></section>
<section class="ab-column ab-education"><h3 class="ab-column-heading">EDUCATION</h3><div class="ab-list">
<article class="ab-entry"><p class="ab-date">2026.07–현재</p><h4 class="ab-title">SKALA 4기 · SK AX</h4><p class="ab-role">생성형 AI 서비스 개발 과정</p><p class="ab-summary">Java·Spring·DB · Python·ML/DL · LLM/RAG<br>AI 에이전트·서빙·AIOps · Docker·K8s·MSA</p></article>
<article class="ab-entry"><p class="ab-date">2024.07–2024.08</p><h4 class="ab-title">수도권 ICT이노베이션스퀘어</h4><p class="ab-role">Deep Dive Fullstack + GenAI Course</p><p class="ab-summary">웹 개발·크롤링·OpenAI API·n8n 자동화<br>AWS·Docker·Git·Linux 개발·배포 환경</p></article>
<article class="ab-entry"><p class="ab-date">2024.03–2024.05</p><h4 class="ab-title">패스트캠퍼스</h4><p class="ab-role">나도 할 수 있는 Java&amp;Spring<br>웹 개발 종합반</p><p class="ab-summary">Java·Spring 서버·웹 애플리케이션 구현 기초</p></article>
<article class="ab-entry"><p class="ab-date">2023.06–2023.07</p><h4 class="ab-title">호남 ICT이노베이션스퀘어</h4><p class="ab-role">AI융합 개발과정 전남대 특별반</p><p class="ab-summary">전처리·회귀·앙상블·군집화·PCA · CNN·RNN</p></article>
</div></section>
<section class="ab-column ab-awards"><h3 class="ab-column-heading">AWARDS</h3><div class="ab-list">
<article class="ab-entry"><h4 class="ab-title">전남대학교 자유학기 성과발표회 대상</h4><p class="ab-issuer">2025.01 · 전남대학교 총장상</p><p class="ab-summary">온도 감지 충전 · Arduino·NFC·UART</p></article>
<article class="ab-entry"><h4 class="ab-title">일취월장 프로그램 우수상</h4><p class="ab-issuer">2024.12 · 전남대학교 글로벌교육원장상</p><p class="ab-summary">여수캠퍼스 2024학년도 2학기 학습법 우수 활동</p></article>
<article class="ab-entry"><h4 class="ab-title">대학생 무한도전 프로젝트 장려상</h4><p class="ab-issuer">2024.09 · 전남인재평생교육진흥원</p><p class="ab-summary">LinkLike SNS형 플랫폼 · 팀장·기획·개발</p></article>
<article class="ab-entry"><h4 class="ab-title">수도권 ICT이노베이션스퀘어<br>Deep Dive 프로젝트 우수상</h4><p class="ab-issuer">2024.08 · 수도권 ICT이노베이션스퀘어</p><p class="ab-summary">시각장애인 AI 웹툰 안내 · 텍스트 추출·TTS</p></article>
<article class="ab-entry"><h4 class="ab-title">전남권 사회문제해결<br>아이디어 공모전 대상</h4><p class="ab-issuer">2023.07 · 호남 ICT이노베이션스퀘어</p><p class="ab-summary">폐교·유휴공간 스마트팜 · Python·회귀·PyQt5</p></article>
</div></section>
</div></section></div>`;
}

export function renderGolaba(asset) {
  return `<div class="sheet" id="golaba"><section class="slide add-golaba" contenteditable="true"><div class="add-signature"></div>
<header class="go-heading"><span class="go-num">07</span><h2 class="go-title">GOLABA</h2><p class="go-definition">신청 접수와 서류 사전 점검을 분리하는 지원사업 플랫폼.</p></header>
<figure class="go-screen"><img src="${asset('outputs/portfolio-additions/golaba/golaba-implemented.png')}" alt="GOLABA 새 실행본의 지원사업 신청 화면"><figcaption>실제 실행 화면 · 합성 지원사업과 규칙 기반 서류 점검</figcaption></figure>
<div class="go-details"><p class="go-subtitle">마감일의 신청 집중과<br>반복 서류 검토를 함께 고려한 설계</p>
${section('go', 'PAIN POINT', '<ol><li>긴 서류 처리가 신청 접수까지 지연시킴</li><li>누락된 증빙과 보완 사유를 반복 확인</li></ol>')}
${section('go', 'SOLUTION', '<ol><li>신청과 점검 작업을 DB에 저장해 후속 처리</li><li>증빙 누락·분량 규칙 확인 후 보완 요청</li><li>담당자가 제출 내용과 사유를 보고 승인</li></ol>')}
${section('go', 'ROLE', '<p>기존 MSA: 백엔드 경계·데이터 계약 검토<br>이번 구현: 신청·점검·승인 흐름의 UI와 API</p>')}
${section('go', 'TECH STACK', '<p>이번 구현: FastAPI · SQLite · JavaScript<br>기존 설계: Spring Boot · Kafka · MariaDB</p>', 'go-stack')}
</div>${footer('projects/golaba')}</section></div>`;
}
