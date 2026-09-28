export function productProjects({ project, img, badge, stats, table, flow, app, bar }) {
  const node = (title, detail, highlight = false) => `<div class="diagram-box${highlight ? ' highlight' : ''}"><b>${title}</b><small>${detail}</small></div>`;

  project({
    name: 'GOLABA · 접수와 AI 검수의 분리',
    kicker: 'SERVICE ARCHITECTURE / GOLABA',
    category: 'MSA · 설계 검토',
    title: '접수는 먼저, AI 검수는 그다음에.',
    subtitle: '지원사업 신청의 처리시간과 서류 검수의 처리시간을 분리하는 구조를 검토했습니다.',
    role: '팀 백엔드 · 서비스 경계와 비동기 처리 설계 검토',
    pain: [
      '마감에 신청이 몰리면 다른 사업의 접수까지 지연될 수 있습니다.',
      'AI 검수를 기다리게 하면 신청자의 대기 시간이 길어집니다.',
      '담당자는 제출 서류를 직접 열어 반복 확인해야 합니다.',
    ],
    solution: [
      '신청 정보를 먼저 저장하고 접수 응답을 돌려주도록 설계했습니다.',
      'AI 검수는 Kafka 후처리로 분리하는 구조를 검토했습니다.',
      'AI가 검토 근거를 정리하고 담당자가 최종 판단하도록 했습니다.',
    ],
    takeaway: '접수와 검수의 시간·실패 범위를 나누는 것이 핵심이었습니다.',
    tags: ['Spring Boot', 'FastAPI', 'Kafka', 'REST', 'MSA'],
    stage: 'tint',
    visual: app('GOLABA', ['신청·검수 현황', '지원사업', '제출 서류', '검토 결과'], `
      <div class="app-head"><div><h3>신청·검수 현황</h3><p>접수 상태와 AI 검토 상태를 따로 확인합니다.</p></div>${badge('설계 화면', 'blue')}</div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin:18px 0 9px"><b style="font-size:14px">신청 처리 보드</b><span style="font-size:10px;color:#84919e">상태별 화면 구성 예시</span></div>
      ${table(['신청 구분', '접수 상태', 'AI 검토', '다음 처리'], [
        ['신규 신청', badge('접수 저장'), badge('검토 대기', 'amber'), '서류 확인'],
        ['서류 보완', badge('접수 유지'), badge('보완 필요', 'amber'), '보완 사유 확인'],
        ['담당자 확인', badge('접수 유지'), badge('근거 정리', 'blue'), '최종 판단'],
      ])}
      <div style="display:grid;grid-template-columns:1.1fr 1fr;gap:13px;margin-top:17px">
        <div class="ui-panel blue"><div class="ui-label">선택한 신청 · 검토 영역</div><h4>접수는 이미 저장되어 있습니다.</h4><p>신청서와 증빙 자료를 확인하고<br>AI가 정리한 근거를 검토합니다.</p></div>
        <div class="ui-panel" style="margin:0"><div class="ui-label">담당자 작업</div><p style="margin-bottom:13px">보완 사유 확인 → 신청자 안내<br>근거 확인 → 담당자 확정</p><span class="ui-button">검토 내용 열기</span></div>
      </div>
    `),
    caption: '<b>설계 화면</b> · 팀 자료의 접수·검수 분리 구조를 UI로 재구성했습니다. 상태는 표시 예시입니다.',
    features: [
      ['접수와 검수 분리', '사용자 응답과 긴 AI 작업의 경계 설정'],
      ['데이터 계약 검토', 'DTO·이벤트·DB 필드의 업무 의미 정리'],
      ['사람의 최종 판단', 'AI는 확인할 근거와 보완 사유 제공'],
    ],
    files: ['MSA/개인과제_서브노트.html', 'MSA/report-snapshots/team-p22.png'],
    note: '개인 서브노트에 백엔드 담당 및 설계 검토 경험이 기록되어 있습니다. 계획한 기능을 직접 완성했다거나 운영 검증을 마쳤다는 의미가 아닙니다.',
  });

  project({
    name: '3-tier 게시판 · 컨테이너 실행',
    kicker: 'CONTAINER OPERATIONS / THREE-TIER BOARD',
    category: 'DevOps · 구현 실습',
    title: '화면·서버·데이터를 같은 실행 환경으로.',
    subtitle: 'Nginx, Flask, PostgreSQL을 Docker Compose로 연결한 게시판입니다.',
    role: 'Web·WAS·DB 분리 실습 · Compose·상태 점검 구성',
    pain: [
      'Web·WAS·DB를 따로 띄우면 실행 순서와 연결이 어긋납니다.',
      '서버가 켜져도 요청을 처리할 준비가 됐는지 알기 어렵습니다.',
      '컨테이너를 다시 만들 때 게시글 데이터가 사라질 수 있습니다.',
    ],
    solution: [
      '세 계층을 Docker Compose로 묶어 함께 실행했습니다.',
      'healthcheck 결과에 따라 서비스 시작 순서를 연결했습니다.',
      'DB는 volume에 저장하고 서비스 재시작 정책을 설정했습니다.',
    ],
    takeaway: '실행 순서·준비 상태·데이터 보존을 배포 설정에 담았습니다.',
    tags: ['Docker Compose', 'Nginx', 'Flask', 'PostgreSQL', 'Healthcheck'],
    visual: `<div style="display:grid;grid-template-columns:1.6fr 1fr;gap:18px;width:100%;height:100%;min-height:0">
      <div class="screen-card board-shot">${img('workspace/Day2/ScreenShot/13_방법3_서버렌더링.png', 'Flask가 PostgreSQL 데이터로 렌더링한 실제 게시판 화면')}</div>
      <div style="display:flex;flex-direction:column;justify-content:center;gap:10px;text-align:center">
        <div class="diagram-label">DOCKER COMPOSE</div>
        ${node('Nginx', '화면 제공·요청 전달')}
        <div class="diagram-arrow">↓</div>
        ${node('Flask', 'REST API·서버 렌더링', true)}
        <div class="diagram-arrow">↓</div>
        ${node('PostgreSQL', '게시글 저장·조회')}
        <div style="font-size:13px;line-height:1.6;color:#637b8b;padding-top:9px">service_healthy<br>재시작 정책 · DB volume</div>
      </div>
    </div>`,
    caption: '<b>실제 실행 화면</b> · 서버 렌더링 게시판. 오른쪽은 Compose 구성 요약입니다.',
    features: [
      ['3개 서비스', 'Web·WAS·DB의 실행 책임 분리'],
      ['상태를 보고 시작', 'healthcheck와 서비스 의존성 설정'],
      ['데이터 지속성', '컨테이너와 DB 저장 공간의 수명 분리'],
    ],
    files: ['workspace/Day2/docker-compose.yml', 'workspace/Day2/WAS/app.py', 'workspace/Day2/종합 실습 2 - 3-tier 미니 게시판 Compose 전환.html'],
    note: '로컬 Docker Compose 실습입니다. Kubernetes 운영이나 운영 환경 장애 대응 성과를 주장하지 않습니다.',
  });

  project({
    name: 'HowToDo · 협업 사용설명서',
    kicker: 'PRODUCT EXPERIENCE / HOWTODO',
    category: 'Vue · 프론트엔드 프로토타입',
    title: '함께 일하는 방법을, 팀의 첫 화면에.',
    subtitle: '개인의 협업 성향에서 팀별 역할과 목표까지 이어지는 사용 흐름을 만들었습니다.',
    role: '협업 프로필·팀 보드 UI · Mock API·명세 설계',
    pain: [
      '새 팀에서는 서로의 협업 방식과 희망 역할을 알기 어렵습니다.',
      '소개 자료와 프로젝트 목표가 흩어져 있으면 역할 논의가 길어집니다.',
    ],
    solution: [
      '개인 프로필부터 팀 생성·참여·팀 보드까지 연결했습니다.',
      '역할 우선순위와 프로젝트 목표를 팀원 카드에 모았습니다.',
      'URL·QR 공유와 Mock API·명세를 함께 구성했습니다.',
    ],
    takeaway: '서로를 소개하는 정보를, 함께 일할 때 쓰는 정보로 연결했습니다.',
    tags: ['Vue 3', 'MSW', 'OpenAPI', 'DBML', 'Responsive UI'],
    stage: 'tint',
    visual: `<div class="screen-card">${img('WebService/report-assets/ui-refresh/home-desktop.png', 'HowToDo 협업 프로필 홈의 주요 영역 확대', 'screenshot crop')}</div>`,
    caption: '<b>실제 구현 화면</b> · Vue + MSW Mock API. 인증 서버와 실제 DB 연결은 후속 범위입니다.',
    features: [
      ['협업 프로필', '소개·협업 방식·링크를 단계별 작성'],
      ['팀별 역할과 목표', '희망 역할 검색·우선순위·팀원 상세'],
      ['공유와 API 계약', 'URL·QR 공유와 OpenAPI·DBML 설계'],
    ],
    files: ['WebService/README.md', 'WebService/src/views/HomeView.vue', 'WebService/src/views/TeamDetailView.vue', 'WebService/public/specs/API.yml', 'WebService/public/specs/HowToDo.dbml'],
    note: '브라우저는 HTTP 요청을 보내고 MSW가 응답합니다. 프론트엔드와 Mock API 구현이며 실제 인증 서버나 DB를 운영한 것은 아닙니다.',
  });

  project({
    name: 'SKALA Shop · 주문과 데이터 정합성',
    kicker: 'BACKEND ENGINEERING / SKALA SHOP',
    category: 'Spring Boot · REST API',
    title: '주문 한 번에, 네 가지 데이터가 함께.',
    subtitle: '주문·취소, 포인트·재고, 판매 이력을 하나의 거래 흐름으로 연결했습니다.',
    role: '상품·회원·주문 API · 트랜잭션·예외 처리·통합 테스트',
    pain: [
      '주문 한 번에 포인트·재고·주문·판매 이력이 함께 바뀝니다.',
      '일부만 저장되거나 취소가 누락되면 데이터가 서로 달라집니다.',
      '잘 팔리는 상품과 품절 임박 상품도 같은 흐름에서 확인해야 합니다.',
    ],
    solution: [
      '주문·취소를 트랜잭션으로 묶어 네 가지 데이터를 함께 처리했습니다.',
      '주문 전에 입력값과 재고·포인트 조건을 서비스에서 검증했습니다.',
      '판매 순위·품절 임박·최근 본 상품 조회를 API로 연결했습니다.',
    ],
    takeaway: '사용자에게 보이는 주문 결과와 저장된 데이터를 일치시켰습니다.',
    tags: ['Java 17', 'Spring Boot', 'JPA', 'H2', 'MockMvc'],
    stage: 'light',
    visual: `<div class="screen-card">${img('outputs/portfolio/shop-screen.png', 'SKALA Shop에서 실제 API 데이터로 표시한 상품 목록 화면', 'screenshot crop')}</div>`,
    caption: '<b>실제 구현 화면</b> · 상품 API를 실행해 캡처했습니다. 주문·취소 검증은 기존 테스트 기록 기준입니다.',
    features: [
      ['주문·취소 트랜잭션', '재고·포인트·주문·판매 이력을 함께 처리'],
      ['조회 기능 확장', '순판매량 순위·품절 임박·최근 본 상품'],
      ['API 검증', '입력 검증·공통 예외 응답·통합 테스트'],
    ],
    files: ['Spring/Online-shoppingmall/README.md', 'Spring/Online-shoppingmall/src/main/java/com/sk/skala/shopapi/service/CustomerService.java', 'Spring/Online-shoppingmall/src/test/java/com/sk/skala/shopapi/ShoppingMallFeatureIntegrationTest.java', 'Spring/Online-shoppingmall/src/test/java/com/sk/skala/shopapi/CustomerTransactionIntegrationTest.java'],
    note: 'H2 인메모리 DB를 사용하는 학습용 쇼핑몰입니다. 상품·주문 API와 화면 구현을 보여주며 결제 연동이나 운영용 인증 완성을 뜻하지 않습니다.',
  });

  project({
    name: 'CourtCast · 현장 제보와 코트 비교',
    kicker: 'LOCATION EXPERIENCE / COURTCAST',
    category: '서비스 흐름 · UI',
    title: '비가 오면, 다음 코트를 고를 수 있도록.',
    subtitle: '현장 제보와 예보의 출처를 구분해 주변 코트를 비교하는 서비스입니다.',
    role: '원본 앱·설계 자료 기반 · 탐색·제보·비교 흐름 정리',
    pain: [
      '코트에 도착한 뒤 비나 젖은 상태를 알면 다시 이동해야 합니다.',
      '넓은 지역의 예보만으로 현재 코트의 상황을 알기 어렵습니다.',
      '현장 제보인지 예보인지 모르면 다음 코트를 고르기 어렵습니다.',
    ],
    solution: [
      '현재 비 여부를 원탭으로 제보하고 주변 코트로 이동하게 했습니다.',
      '유효한 현장 제보를 우선 표시하고 없으면 예보로 보완했습니다.',
      '가까운 최대 5곳 비교와 즐겨찾기·알림 흐름을 연결했습니다.',
    ],
    takeaway: '출처와 시점을 보여주어 다음 코트를 고를 근거를 제공했습니다.',
    tags: ['Location UX', 'Weather', 'User Reports', 'Favorites', 'Notifications'],
    stage: 'green',
    visual: `<div class="phones">${[
      ['3', '현재 코트의 비 여부를 원탭으로 제보하는 CourtCast 화면'],
      ['4', '가까운 주변 코트와 예보 출처를 비교하는 CourtCast 화면'],
      ['8', '저장한 코트와 시간별 상태를 확인하는 CourtCast 즐겨찾기 화면'],
    ].map(([id, alt]) => `<div class="phone">${img(`WebService/Court/outputs/source-review/image${id}.png`, alt, '')}</div>`).join('')}</div>`,
    caption: '<b>원본 앱 화면</b> · 기상 정보는 합성 데모입니다. Google Maps는 추가 연동 계획입니다.',
    features: [
      ['원탭 현장 제보', '현재 코트의 비 여부를 빠르게 공유'],
      ['가까운 코트 비교', '주변 최대 5곳과 정보 출처를 함께 표시'],
      ['다음 방문 준비', '즐겨찾기·시간대별 상태·알림 규칙'],
    ],
    files: ['WebService/Court/CourtCast-UI-annotated-final.pptx', 'WebService/Court/outputs/technical-appendix.fragment.html', 'WebService/Court/outputs/CourtCast — 제품·서비스 소개.html'],
    note: '원본 앱 캡처와 제품 소개 자료를 기반으로 구성했습니다. 현재 기상 표시는 합성 데모이며 실시간 기상 연동 완료나 코트별 강수 예측 정확도를 주장하지 않습니다.',
  });

  project({
    name: '매출 EDA · 데이터에서 학습까지',
    kicker: 'DATA ENGINEERING / SALES ANALYTICS',
    category: 'Python · 데이터 분석',
    title: '분석하기 전에, 데이터부터 점검했습니다.',
    subtitle: '100만 행 매출 데이터를 정제하고, 분포 확인부터 회귀 모델 저장까지 연결했습니다.',
    role: '정제·집계·EDA·통계 검정 · Ridge Pipeline 구성',
    pain: [
      '결측치와 이상치가 섞이면 매출 집계와 모델 평가가 흔들립니다.',
      '분포를 확인하지 않으면 데이터 문제와 모델 문제를 구분하기 어렵습니다.',
      '학습과 재사용 때 전처리가 달라지면 예측 결과도 달라집니다.',
    ],
    solution: [
      'IQR·결측 기준으로 정제하고 분포·추이·상관관계를 확인했습니다.',
      '전처리와 Ridge를 하나의 Pipeline으로 묶어 평가했습니다.',
      '모델 저장·재로딩 전후에 예측 결과가 일치하는지 검증했습니다.',
    ],
    takeaway: '같은 전처리 기준을 분석·학습·재사용까지 유지했습니다.',
    tags: ['Pandas', 'Polars', 'DuckDB', 'scikit-learn', 'EDA'],
    stage: 'light',
    visual: `<div style="width:100%;height:100%;background:#fff;border-radius:8px;padding:6px;display:flex;align-items:center">${img('Python/Day2/outputs/eda_dashboard.png', '매출액 분포, 지역별 매출, 월별 추이, 변수 상관관계의 실제 EDA 결과')}</div>`,
    caption: '<b>실제 분석 결과</b> · 원본 그래프 비율 유지. 시각화는 고정 시드로 최대 10만 행을 표본 추출했습니다.',
    features: [
      ['100만 → 956,349행', 'IQR·집계 기준 결측으로 데이터 정제'],
      ['분포와 관계 확인', '지역·월별 분석과 통계 검정 연결'],
      ['R² 0.8426', '학습 16만·평가 4만 행의 Ridge 실습'],
    ],
    files: ['Python/Day2/practice3_analysis.py', 'Python/Day2/판교_1반_장현진.py', 'Python/Day2/실습4_결과보고서.html', 'Python/Day2/outputs/eda_dashboard.png'],
    note: '저장된 실습 보고서의 결과입니다. 입력 1,000,000행, 정제 956,349행이며 학습에는 최대 200,000행을 사용했습니다. 실제 매출 예측 서비스의 성과를 의미하지 않습니다.',
  });

  project({
    name: 'PostgreSQL · 실행계획 기반 튜닝',
    kicker: 'DATABASE PERFORMANCE / POSTGRESQL',
    category: '실행계획 · 반복 측정',
    title: '인덱스가 있는지보다, 쓰이는지를 봤습니다.',
    subtitle: '형변환·함수 조건·정렬이 실제 실행계획과 응답 시간에 미치는 영향을 비교했습니다.',
    role: 'SQL·인덱스 변경 실험 · 실행계획·반복 측정 분석',
    pain: [
      '인덱스가 있어도 형변환·함수 조건 때문에 전체 스캔이 발생했습니다.',
      '실행시간만 보면 어떤 연산이 병목인지 설명하기 어렵습니다.',
      '한 번의 측정값만으로는 캐시 영향을 구분하기 어렵습니다.',
    ],
    solution: [
      '실행계획에서 스캔·정렬·버퍼 접근을 직접 확인했습니다.',
      '조회 조건에 맞춰 함수·커버링·부분 인덱스를 비교했습니다.',
      '같은 조건에서 반복 측정해 시간과 실행계획 변화를 확인했습니다.',
    ],
    takeaway: '시간이 줄어든 이유를 스캔·정렬·Heap 접근의 변화로 설명했습니다.',
    tags: ['PostgreSQL', 'EXPLAIN ANALYZE', 'Index', 'Warm Cache'],
    visual: `<div class="chart-panel" style="padding:26px 30px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:22px"><h3 style="margin:0">조회 패턴별 실행시간 비교</h3>${badge('반복 측정 평균', 'blue')}</div>
      <div style="display:grid;gap:18px">
        ${[
          ['기본키 조회', '불필요한 형변환 → 직접 비교', '7.340', '0.064', 0.872],
          ['LOWER 함수 조건', '전체 스캔 → 커버링 인덱스', '6.105', '0.159', 2.604],
          ['최근 ACTIVE Top 100', '스캔·정렬 → 부분 인덱스', '5.645', '0.150', 2.657],
        ].map(([title, detail, before, after, width]) => `<div style="border-bottom:1px solid #e7edf1;padding-bottom:14px"><div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:11px"><b style="font-size:18px">${title}</b><small style="font-size:12px;color:#80909f">${detail}</small></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:25px">${bar('변경 전', `${before} ms`, 100, 'gray')}${bar('변경 후', `${after} ms`, width, 'green')}</div></div>`).join('')}
      </div>
      <p class="chart-note" style="margin-top:15px;font-size:12px">학습용 HR 데이터 약 50,000행 · warm-cache 평균 · 각 행의 변경 전을 100으로 정규화.<br>수치는 해당 실습 환경의 결과이며, 모든 조회나 운영 환경의 성능을 보장하지 않습니다.</p>
    </div>`,
    caption: '<b>저장된 측정값으로 재구성</b> · 원본 보고서의 반복 측정 평균을 비교했습니다.',
    features: [
      ['실제 선택 계획 확인', 'Seq Scan·Index Scan·Bitmap Scan 비교'],
      ['정렬과 Heap 접근', '부분·커버링 인덱스의 효과를 구분'],
      ['조건에 맞는 선택', '검색 범용성과 실행 비용을 함께 고려'],
    ],
    files: ['DB/종합실습3/내용확인용.html', 'DB/종합실습3/report-assets/q1-before-cast.png', 'DB/종합실습3/report-assets/q1-after-pk.png', 'DB/종합실습3/report-assets/q2-covering-1.png', 'DB/종합실습3/report-assets/q4-active-partial-index.png'],
    note: '약 50,000행 HR 데이터의 warm-cache 반복 측정입니다. 기본키 7.340→0.064ms, LOWER 커버링 6.105→0.159ms, ACTIVE Top100 5.645→0.150ms. 조건별 막대는 각 변경 전 시간을 기준으로 정규화했습니다.',
  });

  project({
    name: 'Weather Flow · 날씨 대시보드',
    kicker: 'FRONTEND ENGINEERING / WEATHER FLOW',
    category: 'Vue · 외부 API 연동',
    title: '날씨를 찾고, 저장하고, 비교하는 화면.',
    subtitle: '도시 검색에서 현재 날씨·단기 예보·대기질 조회까지 단계별로 확장했습니다.',
    role: '화면 구성·상태 관리·API 연동 · 반응형 UI',
    pain: [
      '검색·즐겨찾기·온도 단위가 화면마다 따로 관리되면 흐름이 끊깁니다.',
      '외부 API가 늦거나 실패하면 사용자는 현재 상태를 알기 어렵습니다.',
    ],
    solution: [
      '컴포넌트와 Router를 나누고 Pinia로 공통 설정을 관리했습니다.',
      '날씨·예보·대기질 API를 카드와 상세 화면으로 연결했습니다.',
      '로딩·빈 결과·오류를 구분해 화면에 현재 상태를 표시했습니다.',
    ],
    takeaway: 'Mockup에서 시작해 상태·라우팅·API·오류 처리를 확장했습니다.',
    tags: ['Vue 3', 'Pinia', 'Axios', 'Element Plus', 'Weather API'],
    stage: 'tint',
    visual: `<div class="weather-visual"><div class="screen-card weather-shot">${img('outputs/portfolio/weather-screen.png', 'Weather Flow 실제 앱의 도시 검색, 온도 단위, 서울과 부산 날씨 카드 화면')}</div><div class="weather-flow"><div class="ui-label">화면과 상태의 연결</div><h3>한 번 정한 설정을,<br>다음 화면에서도.</h3><div class="weather-step"><span>01</span><div><b>도시를 찾고 저장</b><p>검색 · 즐겨찾기 · 상세 조회</p></div></div><div class="weather-step"><span>02</span><div><b>설정을 함께 유지</b><p>Pinia로 섭씨·화씨 단위 공유</p></div></div><div class="weather-step"><span>03</span><div><b>요청 상태를 구분</b><p>불러오는 중 · 결과 없음 · 오류</p></div></div><div class="weather-end">현재 날씨 → 예보 → 대기질</div></div></div>`,
    caption: '<b>실제 구현 화면 · 샘플 데이터</b> · 기존 도시별 기온을 브라우저에 주입해 캡처했습니다.',
    features: [
      ['검색·즐겨찾기', '도시 목록과 상세 조회를 이어주는 UI'],
      ['공통 상태 관리', '화면 간 섭씨·화씨 설정을 일관되게 유지'],
      ['API 상태 구분', '현재 날씨·3시간 예보·대기질 연동'],
    ],
    files: ['Vue/skala-vue/src/components/practices/HandsOn/README.md', 'Vue/skala-vue/src/components/practices/HandsOn/07-weather-ui-library/README.md', 'Vue/skala-vue/src/components/practices/HandsOn/07-weather-ui-library/views/WeatherHomeView.vue', 'Vue/skala-vue/src/components/practices/HandsOn/07-weather-ui-library/api/weatherApi.js'],
    note: '07-weather-ui-library의 실제 UI입니다. 캡처에는 기존 weatherData.js의 샘플 기온을 사용했으며 외부 API의 실시간 응답을 보여주는 화면은 아닙니다. 원본 코드는 변경하지 않았습니다.',
  });

  project({
    name: 'HONBOT·자율주행 · 학습 경험의 연결',
    kicker: 'EARLIER EXPERIENCE / API & MODEL TRAINING',
    category: '사용자 제공 경험',
    title: '모델을 학습하고, 서비스와 연결한 경험.',
    subtitle: 'HONBOT의 API 연동과 자율주행 CNN 학습을 통해 서로 다른 AI 개발 경로를 경험했습니다.',
    role: 'ChatGPT API 연동 · TensorFlow CNN·데이터 보완 학습',
    pain: [
      'API 응답을 사용자의 질문과 서비스 화면 흐름에 맞춰야 했습니다.',
      '학습 설정만 바꿔서는 풀리지 않는 성능 문제도 있었습니다.',
    ],
    solution: [
      'HONBOT에서 질문과 ChatGPT API 응답을 연결하는 법을 익혔습니다.',
      '자율주행 CNN 학습에서 데이터 재수집·증강을 경험했습니다.',
      '모델 설정과 함께 입력 데이터의 품질·분포를 살펴봤습니다.',
    ],
    takeaway: 'API 연결과 직접 학습에서, 각각 점검해야 할 지점을 배웠습니다.',
    tags: ['ChatGPT API', 'TensorFlow', 'CNN', 'Data Augmentation'],
    visual: `<div class="two-visual" style="gap:16px">
      ${app('HONBOT / 영상 챗봇', [], `
        <div class="app-head" style="margin-bottom:13px"><h3 style="font-size:21px">HONBOT</h3>${badge('구성 예시', 'blue')}</div>
        <div style="height:106px;background:linear-gradient(135deg,#152b4b,#315b8c);border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#dfe9fa;position:relative;overflow:hidden">
          <div style="width:33px;height:33px;background:#a7bfdc;border-radius:50%;margin-bottom:5px"></div><div style="width:76px;height:34px;background:#8da8c9;border-radius:60px 60px 10px 10px"></div>
          <span style="position:absolute;bottom:9px;left:12px;font-size:10px;color:#e0e9f5">영상 대화 영역</span>
        </div>
        <div style="font-size:10px;color:#8c98a6;margin:10px 0 6px">대화 흐름 예시</div>
        <div style="background:#edf3ff;border-radius:8px 8px 0 8px;padding:10px 12px;margin-left:25px;font-size:12px;line-height:1.5">질문을 입력하면 어떻게 답하나요?</div>
        <div style="background:#f2f5f8;border-radius:8px 8px 8px 0;padding:10px 12px;margin:8px 20px 12px 0;font-size:12px;line-height:1.7;color:#52677d">API에 질문을 전달하고 응답을 표시합니다.</div>
        <div class="ui-input" style="display:flex;align-items:center;justify-content:space-between;padding:10px;color:#98a4b1">질문을 입력하세요<span class="ui-button" style="padding:5px 9px">↑</span></div>
      `)}
      ${app('자율주행 / 데이터 검토', [], `
        <div class="app-head" style="margin-bottom:13px"><h3 style="font-size:20px">데이터 검토</h3>${badge('구성 예시', 'blue')}</div>
        <div style="height:106px;background:#dce8ed;border-radius:8px;position:relative;overflow:hidden">
          <svg viewBox="0 0 400 160" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" role="img" aria-label="주행 데이터 검토 화면을 설명하는 도로 개념 이미지"><rect width="400" height="160" fill="#c9dfe9"/><path d="M0 75L400 80V160H0Z" fill="#8ca39a"/><path d="M182 76H218L335 160H65Z" fill="#687b89"/><path d="M190 82L114 160M210 82L286 160" stroke="#f1f4e8" stroke-width="3"/><path d="M200 87V96M200 105V120M200 133V158" stroke="#e0b75e" stroke-width="3"/><rect x="161" y="109" width="78" height="43" fill="none" stroke="#6fe4c0" stroke-width="2" stroke-dasharray="5 4"/></svg>
          <span style="position:absolute;bottom:8px;left:11px;font-size:10px;color:white;background:#334957aa;padding:3px 6px;border-radius:4px">주행 이미지 미리보기 · 개념 표현</span>
        </div>
        <div style="font-size:10px;color:#8c98a6;margin:10px 0 6px">학습 전 확인할 항목</div>
        ${table(['점검 영역', '확인 내용'], [
          ['품질·분포', '입력 품질·주행 상황 확인'],
          ['데이터 보완', '재수집·증강 검토'],
        ])}
        ${flow(['입력 확인', 'CNN 학습', '오류 분석'])}
      `)}
    </div>`,
    caption: '<b>경험 기반 설계 화면</b> · 사용자 설명을 UI로 재구성했습니다. 원본 구현 화면이나 실험 결과가 아닙니다.',
    features: [
      ['외부 API 연결', '모델 응답을 서비스 요청 흐름에 연결'],
      ['학습 데이터 보완', '재수집·증강으로 입력 품질을 점검'],
      ['다음 프로젝트로 연결', '모델·데이터·서비스를 함께 보는 관점'],
    ],
    files: [],
    note: '사용자가 제공한 HONBOT 및 자율주행 프로젝트 경험 설명을 요약했습니다. 이 작업 폴더에서는 두 프로젝트의 원본 코드와 수치 기록을 확인하지 못했으며 정량 성과를 추가하지 않았습니다.',
  });

  project({
    name: 'AI 서비스 운영 · AIOps 확장 설계',
    kicker: 'NEXT DESIGN / OBSERVABLE AI SERVICES',
    category: '향후 확장 제안',
    title: '느려진 이유와 비싸진 구간을 찾도록.',
    subtitle: '호출 기록과 서비스 상태 점검 경험을, AI 운영 관측과 원인 분석 구조로 확장합니다.',
    role: '프로젝트 경험 기반 · 운영 관측·AIOps 확장 설계',
    pain: [
      '전체 응답시간만 보면 검색·모델·DB 중 느린 곳을 알기 어렵습니다.',
      '총토큰만 보면 비용을 늘린 요청과 입력 문맥을 찾기 어렵습니다.',
      '로그가 흩어져 있으면 오류의 원인 후보를 확인하기 어렵습니다.',
    ],
    solution: [
      '요청 ID로 단계 시간·토큰·실패 유형을 함께 기록하도록 제안합니다.',
      '기준에서 벗어난 구간과 관련 로그를 먼저 모으도록 설계합니다.',
      'AI가 원인 후보와 근거를 정리해 운영자의 확인을 돕게 합니다.',
    ],
    takeaway: '기록을 먼저 연결하고, AI 분석은 확인할 근거와 함께 제시하겠습니다.',
    tags: ['Token Usage', 'Latency', 'Logs', 'Healthcheck', 'AIOps Design'],
    visual: app('AI Ops', ['실행 모니터', '요청 로그', '토큰·비용', '원인 검토'], `
      <div class="app-head"><h3>AI 실행 모니터</h3>${badge('설계 화면', 'amber')}</div>
      ${stats([['응답시간', '— <em>ms</em>'], ['입력·출력 토큰', '—'], ['실패 요청', '—']]).replaceAll('class="stat"', 'class="stat" style="padding:8px 10px"')}
      <div style="display:flex;justify-content:space-between;align-items:center;margin:10px 0 8px"><b style="font-size:14px">요청 상세</b><span style="font:10px ui-monospace,monospace;color:#8b98a5">request_id로 조회</span></div>
      ${table(['처리 단계', '기록할 지표', '확인할 근거'], [
        ['검색', '소요시간 · 결과 수', '선택된 문서·청크'],
        ['모델 호출', '응답시간 · 입출력 토큰', '모델·프롬프트 버전'],
        ['저장·응답', '처리시간 · 상태', '저장 결과·오류 유형'],
      ])}
      <div style="margin-top:13px;padding:14px 16px;border:1px solid #d7e3ff;border-radius:7px;background:#f2f6ff;font-size:13px;line-height:1.7;color:#4e6380"><b style="color:#2c5090">AI 분석 보조</b> · 원인 후보와 관련 로그 정리 → 운영자 확인</div>
      <p class="ui-note" style="margin-top:9px">수집 전 구성안 · 실행 기록을 연결하면 지표를 표시합니다.</p>
    `),
    caption: '<b>향후 확장 설계 화면</b> · 모니터링 지표는 수집 전으로 표시했습니다. 운영 실적이나 탐지 성능이 아닙니다.',
    features: [
      ['관측 단위 통일', '요청·단계·모델 호출을 같은 ID로 연결'],
      ['비용과 지연 분석', '입력·출력 토큰과 처리시간을 함께 확인'],
      ['근거가 있는 보조', '로그와 원인 후보를 운영자에게 전달'],
    ],
    files: ['LLM/code2/실습에 필요한 자료들/order_balance_api_token_usage.csv', 'DB/종합실습3/내용확인용.html', 'workspace/Day2/docker-compose.yml'],
    note: '호출 사용량 기록, DB 실행계획 분석, healthcheck 실습을 연결한 미래 설계 제안입니다. 실제 이상 탐지·로그 분석 AIOps를 구현하거나 운영했다고 주장하지 않습니다.',
  });
}
