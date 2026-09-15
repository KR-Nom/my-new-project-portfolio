# HowToDo — 협업 사용설명서

새로운 팀이 서로의 관심사와 협업 방식을 빠르게 이해하도록 돕는 Vue 3 프론트엔드 프로토타입입니다. 실제 백엔드, 데이터베이스, 인증 서버는 사용하지 않습니다.

## 화면 구성과 반응형 UI

밝은 중립색 배경과 인디고 포인트로 버튼·선택 상태를 구분합니다. 데스크톱은 사이드 메뉴, 모바일은 하단 메뉴를 사용하며 저장 버튼은 모바일 메뉴 위에 배치합니다.

- 홈: 실제 프로필 요약, 협업 시작 안내, 참여 중인 팀
- 프로필 작성: 나를 소개하기 → 협업 방식 → 링크와 공유의 3단계, 단계 간 입력 유지
- 팀 보드: 이름·희망 역할 검색, 역할 우선순위와 프로젝트 목표 중심 카드
- 팀별 프로필: 역할 1–3순위 변경, 목표·링크 작성
- 공통 동작: 로딩·오류·재시도, 중복 제출 방지, 공유창 포커스 관리, 복사 실패 안내

[데스크톱 홈](report-assets/ui-refresh/home-desktop.png)과 [모바일 홈](report-assets/ui-refresh/home-390.png)에서 새 UI를 확인할 수 있습니다. 화면 검수 기록은 `report-assets/ui-refresh/checks.json`, 재검수 스크립트는 `scripts/verify-ui.mjs`입니다. 스크립트는 로그인된 독립 브라우저 세션과 `127.0.0.1:5174` 개발 서버를 사용합니다.

발표 HTML/PDF에도 새 Vue UI의 실제 화면을 반영했습니다. 프로필 공유와 팀 초대는 각각 URL·QR을 전달하는 화면과 받는 사람이 도착하는 화면을 구분해 보여줍니다.

## HowToDo 발표자료

[편집 가능한 HTML](HowToDo_presentation_report.html)을 제공합니다. 제출용 PDF는 공개 저장소에 포함하지 않았습니다. SK 오렌지·레드 기반 16:9 템플릿에 인디고 UI 캡처를 반영한 총 25장 구성입니다.

- 1–2장: 표지와 목차
- 3–12장: 기획 배경·Pain Point, 서비스 소개, 신규 가입·재방문 UI 흐름과 기능별 화면
- 13–14장: 개인 공개 프로필 URL·QR 공유와 팀 초대 URL·QR 활용
- 15–24장: Appendix 구분, 시스템 액터, 액터별 UI 흐름, 전체 ERD, 전체 API 목록, 공통 전역 설정, 공통 스키마, Swagger 실행, 레포 구조, 개선 사항
- 25장: 마무리

기획 배경과 Pain Point에는 제공 이미지를 크게 배치하고, 서비스 설명에는 실제 역할 입력·팀원 카드·공통 프로필 화면을 사용했습니다. URL·QR 공유는 보내는 사람의 공유 모달과 받는 사람의 공개 프로필 또는 팀 확인 화면을 함께 배치했습니다.

6장은 큰 회원가입·프로필 캡처 아래에 두 입구가 합류하는 전체 서비스 흐름을 표시합니다. `처음 이용: 회원가입 → 처음 쓰는 나의 프로필(작성·미리보기)`와 `다시 방문: 로그인`이 `홈·내 팀`에서 만나고, `팀 생성·참여 → TEAM BOARD → 팀원 상세`까지 이어집니다. 프로필 저장 후에는 미리보기를 확인한 뒤 홈 메뉴로 이동하며, 팀 생성·참여 구간에서 팀별 역할·목표 작성도 다룹니다. 이미 참여한 팀은 `홈·내 팀 → TEAM BOARD` 지름길로 바로 열 수 있어 로그인할 때마다 프로필을 다시 작성하거나 팀에 다시 참여하지 않습니다.

17장의 전체 UI 흐름도는 공통 로그인 사용자·팀원·팀 생성자·비회원 방문자의 4개 영역으로 구성했습니다. 화면은 실선 박스, 모달은 점선 박스로 구분하고 실제 Vue 경로와 이동·복귀 화살표를 표시했습니다. 로그인과 가입의 서로 다른 도착 화면, 홈에서 내 팀으로의 분기, 팀 보드의 수정·초대·삭제 선택을 구분합니다.

18장의 ERD는 PK뿐 아니라 일반 컬럼에도 `user_name`, `profile_tagline`, `team_name`, `member_goal`처럼 도메인 접두사를 사용합니다. FK는 참조하는 식별자 이름을 유지하며, 8개 테이블·33개 필드·8개 관계와 DBML의 타입·길이를 일치시켰습니다. API·Mock의 기존 필드명은 그대로이며, 향후 DB 매핑이 필요합니다.

최종 점검에서는 25장의 문구를 Vue 경로·MSW 처리·API.yml·DBML과 대조했습니다. 제작 방식을 설명하던 캡션은 기능의 목적과 사용자 행동으로 바꾸고, 로컬 저장·권한 검사·초대 코드의 현재 한계는 구체적으로 남겼습니다. 브라우저와 PDF 검수 스크립트는 화면 잘림, 경로 누락, 제작 설명 문구, 인쇄 도구 노출, PDF의 16:9 비율과 QR 두 개를 확인합니다.

전체 PDF 미리보기와 PDF 검수 기록은 로컬 제작 자료로 유지합니다. 공개 저장소에서는 [데스크톱 홈](report-assets/ui-refresh/home-desktop.png)과 [모바일 홈](report-assets/ui-refresh/home-390.png)으로 대표 UI를 확인할 수 있습니다.

## 실행 방법

```bash
npm install
npm run dev
```

프로덕션 빌드는 `npm run build`로 확인합니다. 체험 계정은 로그인 화면에 기본 입력되어 있으며 비밀번호는 `1234`입니다.

## 전체 UI Flow

- 처음 이용: `회원가입 → 처음 쓰는 나의 프로필`. 프로필 저장 후 미리보기로 이동합니다.
- 다시 방문: `로그인 → HOME`. 기존 프로필과 참여 팀에서 이어서 이용합니다.
- 팀 협업: `홈·내 팀 → 팀 생성·참여 → TEAM BOARD → 팀원 상세/내 팀 프로필 수정`.

로그인 없이 `/p/hyeonjin`에 접속하면 PUBLIC 개인 프로필을 확인할 수 있습니다. 공개 화면에는 팀별 역할과 프로젝트 정보가 노출되지 않습니다.

### URL·QR 공유 흐름과 현재 제약

- 개인 프로필: `내 사용설명서 → 링크 복사 / QR로 공유 → /p/:token`. `PUBLIC` 설정에서만 외부 공유할 수 있으며, 받는 사람은 로그인 없이 공통 프로필을 열람합니다. `TEAM_ONLY`·`PRIVATE` 설정에서는 외부 공유가 비활성화됩니다.
- 팀 초대: `TEAM BOARD → 팀원 초대 → /join/:code`. 로그인된 사용자가 링크를 열면 코드가 자동 입력·확인되고, 팀 정보를 확인한 뒤 참여하면 역할·목표 작성 화면으로 이동합니다. 코드만 전달받은 경우 직접 입력할 수도 있습니다.
- 비로그인 상태로 초대 링크를 열면 로그인 화면으로 이동합니다. 현재 로그인 후에는 홈으로 이동하므로, 초대 링크를 다시 열거나 코드를 입력해야 합니다. 로그인 후 초대 화면으로 자동 복귀하는 기능은 아직 구현하지 않았습니다.

QR은 공유창에 표시된 URL을 그대로 인코딩합니다. 현재 캡처의 `127.0.0.1:5174`는 로컬 개발 주소이므로 외부 휴대전화에서 이 개발 서버로 접속할 수 없습니다. 또한 Mock 데이터는 브라우저별 localStorage에 독립적으로 저장되어 새로 작성·수정한 데이터가 기기 간에 동기화되지 않습니다. 외부 기기에서 실제 데이터를 공유하려면 접근 가능한 배포 주소와 Backend 연동이 필요합니다.

## 주요 화면

- HOME: 내 프로필 작성 상태와 참여 팀 요약
- 프로필 편집/미리보기: 태그 중심 입력, 공개 범위, URL 복사와 동일 URL을 인코딩한 QR 공유
- TEAM BOARD: 5명의 희망 역할과 프로젝트 목표를 카드로 비교
- 팀원 상세: 팀별 정보와 개인 협업 사용설명서를 구분해 표시
- 팀 생성/참여: OWNER 관계 생성 및 초대 코드 확인 후 참여

## Mock API 구조 (MSW)

화면 컴포넌트는 `src/mocks`를 직접 참조하지 않습니다. `src/services/authApi.js`, `profileApi.js`, `teamApi.js`가 실제 `/api/...` HTTP 요청을 보내며, 브라우저의 MSW Service Worker가 `src/mocks/handlers.js`에서 응답합니다. Chrome DevTools Network 탭에서 GET·POST·PATCH·DELETE 요청, 상태 코드, Request Payload와 Mock Response를 확인할 수 있습니다. 변경 데이터는 localStorage에 저장되어 새로고침 후에도 유지됩니다.

## 향후 Backend 연결

실제 Backend 연결 시 `src/main.js`의 `enableMocking()` 호출과 `src/mocks` 폴더를 제거합니다. Service Layer는 이미 `/api/...`로 요청하므로 Vite proxy 또는 배포 환경의 API 주소만 설정하면 됩니다. 이후 `x-user-id` Mock 헤더를 실제 Authorization 토큰으로 교체합니다.

### Network 탭 확인 순서

1. Chrome DevTools에서 Network 탭을 열고 `Fetch/XHR`을 선택합니다.
2. 로그인하면 `POST /api/auth/login`과 `GET /api/profiles/me`, `GET /api/teams`가 표시됩니다.
3. 프로필 저장 시 `PATCH /api/profiles/me`, 팀 생성 시 `POST /api/teams`를 확인합니다.
4. OWNER가 팀 정보를 수정하거나 삭제하면 각각 `PATCH /api/teams/{id}`, `DELETE /api/teams/{id}`가 표시됩니다.

## Swagger / OpenAPI

개발 서버 실행 후 `/api-docs`에서 Swagger UI를 열 수 있습니다. 로그인 없이 접근 가능하며, 우측 `Authorize` 버튼에 Mock 사용자 ID `1`을 입력하면 인증이 필요한 API도 `Try it out`으로 실행할 수 있습니다. 원본 명세는 브라우저의 `/specs/API.yml` 또는 프로젝트의 `public/specs/API.yml`에서 확인합니다.

## 설계 명세 파일

상세 주석이 포함된 API 명세와 논리 데이터 모델의 실행 원본은 `public/specs/`에 있습니다. API 파일명은 `API.yml`로 통일했으며 Swagger도 이 파일을 읽습니다.

```text
public/specs/
├── API.yml         # Swagger에서 읽는 OpenAPI 명세
└── HowToDo.dbml    # ERD 작성용 논리 데이터 모델
```

- [OpenAPI YAML 원본](public/specs/API.yml): 실행 중인 앱에서는 `/specs/API.yml`로 열거나 다운로드합니다.
- [DBML 원본](public/specs/HowToDo.dbml): 실행 중인 앱에서는 `/specs/HowToDo.dbml`로 열거나 다운로드합니다.

제출용 복사본과 PDF는 공개 저장소에 포함하지 않았습니다. 실행 원본인 [API.yml](public/specs/API.yml)과 [HowToDo.dbml](public/specs/HowToDo.dbml)에서 설계 내용을 확인할 수 있습니다.

DBML은 제공된 SKALA 데이터 모델의 구성을 참고해 공개 범위 Enum, 핵심 테이블, 연결 테이블, 관계와 제약 설명을 구분했습니다. 현재 Mock의 저장 방식과 향후 관계형 DB 설계를 구별하며, 실제 Backend·DB를 새로 구현한 것은 아닙니다.

`ruby scripts/check-specs.rb`로 YAML 구문·참조 58개, MSW와 API 20개 경로 대응, DBML의 8개 테이블·33개 필드·8개 관계, 발표 ERD 및 제출본 일치를 검사합니다. 이 스크립트의 DBML 검사는 구조·타입 대조이며, 별도로 임시 `@dbml/cli`의 PostgreSQL 변환으로 정식 DBML 파싱과 역할 순위 CHECK 생성을 확인했습니다. 검증용 SQL은 DB에 실행하지 않았고 프로젝트 의존성도 추가하지 않았습니다.

참고자료용 `SKALA*.yml`·`SKALA*.dbml` 파일은 기존 위치에 유지합니다.
