# HowToDo · 팀 협업 사용설명서

여러 팀에서 쓰는 **공통 프로필**과 팀마다 달라지는 **희망 역할·목표**를 분리하는 웹서비스입니다. Vue 화면에서 저장하면 Node.js API를 거쳐 SQLite 파일에 반영되며, 다른 브라우저에서도 로그인해 같은 데이터를 조회합니다.

## 기존 작업과 이번 확장

| 구분 | 구현 범위 |
|---|---|
| 기존 Vue 프로젝트 | 로그인·가입 화면, 3단계 프로필 편집, 팀 보드와 검색, 역할 순위, 공유 링크·QR, MSW API 계약, 8개 테이블 논리 설계 |
| 이번 포트폴리오 서비스 확장 | Node.js HTTP API 23개 operation, SQLite 8개 도메인 테이블 + sessions, 실제 인증·권한·입력 검증, 파일 저장, API 통합 테스트와 브라우저 검증 |

새 백엔드는 포트폴리오 제작 과정에서 AI 코딩 도구의 도움을 받아 추가·검증했습니다. 기존 프론트엔드 당시 실제 Backend/DB를 구현했다고 소급해서 설명하지 않습니다. 기존 문서는 [프론트엔드 단계 기록](README.frontend-history.md)에 보관했습니다.

## 실행

Node.js **26 이상**을 사용합니다. 서버는 내장 `node:http`, `node:sqlite`, `node:crypto`만 사용합니다. 프론트 의존성은 기존 `package-lock.json` 기준입니다.

```bash
npm ci
# 터미널 1: API, 기본 127.0.0.1:8314
npm run server
# 터미널 2: Vue, 기본 127.0.0.1:5179
npm run dev
```

브라우저: http://127.0.0.1:5179. 로그인 화면에 미리 입력된 `hyeonjin@example.com` / `1234`는 공개 시연용 계정입니다. 예시 인물·이메일·팀 데이터가 첫 실행에만 생성됩니다. 실제 사용자 정보는 넣지 않은 로컬 포트폴리오 실행본입니다.

빌드한 화면을 API와 같은 포트에서 제공하려면 `npm run build && npm start` 후 http://127.0.0.1:8314 를 엽니다.

### 설정

| 변수 | 기본값 | 용도 |
|---|---|---|
| `HOWTODO_DB` | `data/howtodo.sqlite` | 파일 저장 위치. 종료·재시작 시 유지 |
| `PORT` | `8314` | API 포트 |
| `HOWTODO_SEED` | `true` | 빈 DB에 예시 데이터 생성. `false`는 가입으로 시작 |
| `HOWTODO_ORIGINS` | 추가값 없음 | 허용할 프론트 Origin을 쉼표로 추가 |
| `HOWTODO_SECURE_COOKIE` | `false` | HTTPS 배포 시 `true`로 설정 |
| `VITE_ENABLE_MOCKS` | 비활성 | `true`일 때만 과거 MSW 모드 사용 |

실제 API가 기본 모드이며, 이전 방문에서 설치된 MSW 서비스워커도 해제합니다. SQLite·세션 파일과 `node_modules`는 Git에 포함하지 않습니다. 과거 MSW 모드에서는 아래의 서버 보안 기능이 동작하지 않습니다.

## 기능과 데이터 흐름

1. **가입·로그인**: 이메일 정규화·중복 검사 → salt를 사용한 scrypt 비밀번호 해시 → 난수 세션. 브라우저에는 HttpOnly/SameSite=Lax 쿠키, DB에는 세션 토큰의 SHA-256 해시만 저장합니다. 사용자 응답에 비밀번호·해시를 넣지 않습니다.
2. **프로필 저장**: Vue 3단계 입력 → PATCH → 서버 검증 → 프로필·관심사 관계를 하나의 트랜잭션으로 저장합니다. ID와 공유 토큰은 클라이언트 수정 대상이 아닙니다.
3. **팀 협업**: 팀 생성과 소유자 참여를 함께 저장합니다. 초대 코드 참여에는 `(team_id,user_id)` UNIQUE를 적용하고, 희망 역할은 연결 테이블의 순위로 저장합니다.
4. **권한과 공유**: 팀원만 팀·멤버 조회, 소유자만 팀 수정·삭제. PUBLIC은 공유 URL로 열람, TEAM_ONLY는 같은 팀만 열람, PRIVATE 공통 프로필은 본인만 열람합니다. PRIVATE여도 팀별 역할·목표는 팀에 표시됩니다.
5. **지속성**: 프로필·팀·역할·세션을 실제 SQLite 파일에 저장합니다. 팀 삭제 시 연결된 멤버·역할 데이터는 FK cascade로 정리합니다.

`localStorage.manual_user`는 화면 표시용 캐시이며 인증 수단이 아닙니다. `x-user-id`를 임의로 보내도 인증되지 않습니다. 링크의 http/https 검사, 길이·선택 개수 검증, JSON 크기 제한, 로그인 요청 제한, 쓰기 요청 Origin 검사도 서버에서 처리합니다.

## 실행 검증

```bash
npm run test:api
npm run build
```

[API 검증 JSON](report-assets/full-stack/api-verification.json): 임시 파일 DB와 별도 서버 프로세스를 사용한 **12개 테스트 통과**. 인증 위조 거부, 해시·세션, 회원 중복, 팀 권한, 초대 중복, 역할 순위, 공개범위, 잘못된 입력의 부분 저장 방지, Origin 검사, 실제 프로세스 재시작 지속성, FK cascade, 로그아웃 세션 폐기를 확인했습니다. 테스트는 자체 임시 DB만 삭제합니다.

[브라우저 검증 JSON](report-assets/full-stack/browser-verification.json): 실제 로그인 → 프로필 편집 폼 저장 → 미리보기에서 변경 내용 확인 → SQLite 직접 조회 일치 → 팀 보드 5명 표시. MSW 미사용, 1440px·390px 가로 넘침 없음, 런타임 오류 없음으로 확인했습니다.

## 소스와 명세

- [실제 서버](server/server.mjs), [DB 처리](server/database.mjs), [실행 SQL 스키마](server/schema.sql)
- [실제 API 명세](public/specs/ServiceAPI.json): `/api-docs`에서 실행 가능. 수정 후 `node server/write-openapi.mjs`로 갱신
- [원래 MSW 명세](public/specs/API.yml), [원래 논리 DBML](public/specs/HowToDo.dbml): 프론트 단계의 설계 이력이며 현재 실행 명세는 위 파일을 사용

이 실행본은 로컬 포트폴리오 서비스입니다. 공개 배포 전에는 시연 계정을 제거하고, HTTPS·운영 도메인·세션 설정·백업·복구를 별도로 구성해야 합니다. Node 내장 SQLite API의 사용 방식은 [공식 문서](https://nodejs.org/api/sqlite.html)를 따릅니다.
