# 과제 8: 날씨 Deployment

작성일: 2026-08-27 (목)

## 작업 목적

과제 7에서 완성한 날씨 서비스를 배포 가능한 상태로 점검하고 Vite로 정적 파일을 만든 뒤 Vercel에 Hosting한다.

## 과제 요구사항

```text
Source Code 품질관리
├── ESLint 오류 제거
└── API Key를 환경변수로 분리하고 Git에서 제외

Build & Deployment
├── Vite Production Build
└── 정적 파일을 Hosting한 후 실제 화면 확인
```

## 1. ESLint 품질 점검

이 저장소에는 과제 1부터 7까지의 학습 코드가 함께 있다. 이전 학습 예제 전체가 아니라 실제 배포되는 `App.vue`, `main.js`, 과제 7 폴더를 검사 대상으로 지정했다.

```bash
npm run lint
```

엄격한 비교 연산자를 사용하도록 `eqeqeq` 규칙을 추가하고, 수업에서 반응형 상태 변화를 확인하는 `console.log`는 허용했다.

## 2. API Key 분리

OpenWeatherMap API Key는 Vue 파일에 직접 작성하지 않고 `.env`에서 읽는다.

```js
const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY
```

실제 `.env`는 Git에서 제외하고 필요한 변수 이름만 `.env.example`에 기록했다.

```env
VITE_OPENWEATHER_API_KEY=발급받은_API_KEY
```

Vite의 `VITE_` 환경변수는 브라우저에서 API 요청을 보내기 위한 값이므로 배포 서버에도 같은 이름으로 등록한다.

## 3. Vite Build

```bash
npm run build
```

빌드가 완료되면 `dist/`에 브라우저가 읽을 수 있는 HTML, JavaScript, CSS, 이미지와 영상이 생성된다. `dist/`는 다시 만들 수 있는 산출물이므로 Git에는 올리지 않는다.

## 4. Vercel 배포 설정

Vue Router의 `/weather/:cityId`, `/favorites`, `/about` 주소에서 새로고침해도 `index.html`을 다시 읽도록 `vercel.json`에 Rewrite를 설정했다.

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Vercel 프로젝트 설정에는 다음 값을 등록한다.

```text
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Environment Variable: VITE_OPENWEATHER_API_KEY
```

## 배포 주소

- Production: [오늘의 날씨](https://skala-vue-weather-handson.vercel.app)
- Hosting: Vercel
- 배포 대상: 과제 7 날씨 UI Library 완성본

메인 주소와 `/weather/city_01` 상세 주소의 HTTP 응답을 확인했고, OpenWeatherMap 요청도 정상 응답하는 것을 확인했다.

## 프런트엔드 환경변수의 제한

`.env`를 Git에서 제외하면 저장소에 API Key가 그대로 올라가는 것은 막을 수 있다. 다만 `VITE_`로 시작하는 값은 Vue가 브라우저용 JavaScript에 포함하므로 배포된 웹에서는 완전한 비밀이 아니다. 이번 과제는 브라우저에서 OpenWeatherMap을 직접 호출하는 정적 웹 구조이므로 Vercel에는 공개 Config로 등록했다.

API Key를 완전히 숨겨야 하는 서비스라면 브라우저가 OpenWeatherMap을 직접 호출하지 않고 별도의 Backend API가 대신 요청하도록 구조를 변경해야 한다.

## 구현 순서

1. 배포 대상 코드의 ESLint와 Oxlint 오류를 확인했다.
2. API Key가 `.env`에만 존재하는지 확인했다.
3. `.env.example`과 Git 제외 규칙을 정리했다.
4. Vite Build로 `dist/` 정적 파일을 생성했다.
5. Vue Router 새로고침을 위한 Vercel Rewrite를 추가했다.
6. Vercel 환경변수 등록 후 Production 배포를 진행했다.

## 트러블슈팅

### 전체 학습 폴더를 Lint하면서 제출 코드와 무관한 오류가 나온 문제

저장소에는 수업 중 오류를 확인하려고 작성한 Basic 예제와 이전 과제가 함께 있었다. 전체 `src`를 검사하면 현재 배포 화면과 관계없는 예제까지 오류로 처리되므로, Lint 명령의 대상을 현재 실행 진입점과 과제 7 폴더로 제한했다.

### 로컬에서는 상세 주소가 열리지만 배포 후 새로고침하면 404가 나온 문제

Vue Router는 브라우저에서 주소를 바꾸지만 Vercel 서버는 `/weather/city_01` 파일을 찾으려고 한다. 모든 요청을 `index.html`로 연결하는 Rewrite를 추가해 Router가 주소를 다시 처리하도록 했다.

### 로컬에서는 날씨가 나오지만 배포 화면에서는 API 요청이 실패한 문제

로컬 `.env`는 Git에 올리지 않으므로 Vercel이 API Key를 알 수 없다. Vercel 프로젝트의 Environment Variables에 `VITE_OPENWEATHER_API_KEY`를 별도로 등록해야 한다.
