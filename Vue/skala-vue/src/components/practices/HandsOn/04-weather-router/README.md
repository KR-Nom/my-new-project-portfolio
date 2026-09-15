# 과제 4: 날씨 Router

작성일: 2026-08-26 (수)

## 작업 목적

과제 3의 날씨 컴포넌트를 여러 주소의 View로 나누고 Vue Router로 연결했다.

```text
/                    날씨 메인
/about               서비스 소개
/favorites           즐겨찾기 도시
/weather/city_01     서울 상세
등록되지 않은 주소     404
```

## 핵심 개념

- `RouterLink`: 사용자가 누르는 이동 링크
- `RouterView`: 현재 주소의 View가 표시되는 자리
- `router.push()`: 함수에서 주소 이동
- `useRoute()`: 현재 주소의 값 읽기
- Lazy Loading: 해당 주소에 방문할 때 View 파일 불러오기
- Catch-all Route: 등록되지 않은 모든 주소 처리

## 파일 역할

```text
src/
├── App.vue                    내비게이션과 RouterView
├── router/index.js            주소 규칙
└── views/
    ├── WeatherHomeView.vue    날씨 대시보드
    ├── WeatherDetailView.vue  도시 상세
    ├── WeatherAboutView.vue   프로젝트 소개
    ├── WeatherFavoriteView.vue 개인 추가 View
    └── NotFoundView.vue       404
```

## 1. Router 전역 연결 확인

`main.js`에는 기존부터 다음 연결이 있었다.

```js
import router from './router'
app.use(router)
```

따라서 Router를 다시 설치하지 않고 route와 View만 작성했다.

## 2. Route 규칙 작성

`router/index.js`에서 주소와 View를 연결했다. 모든 View는 Lazy Loading을 적용했다.

```js
{
  path: '/',
  component: () => import('../views/WeatherHomeView.vue'),
}
```

루트 주소 `/`에서 날씨 대시보드를 보여주고 `/weather`는 같은 화면의 alias로 연결했다. Catch-all Route는 배열 마지막에 배치했다.

## 3. App을 Router 화면으로 변경

기존에는 `App.vue`가 `WeatherParent`를 직접 출력했다. 과제 4에서는 내비게이션과 View 자리만 유지한다.

```vue
<RouterLink to="/">날씨 대시보드</RouterLink>
<RouterLink to="/favorites">즐겨찾기 도시</RouterLink>
<RouterLink to="/about">서비스 소개</RouterLink>

<RouterView />
```

주소가 바뀌면 `RouterView` 안의 페이지가 바뀐다.

## 4. 날씨 홈과 Programmatic Navigation

`WeatherHomeView.vue`는 과제 3의 부모 상태와 자식 컴포넌트를 재사용한다.

기존 상세보기 alert는 제거하고 다음처럼 변경했다.

```js
const router = useRouter()

const showDetail = (weather) => {
  router.push(`/weather/${weather.id}`)
}
```

서울 상세보기를 누르면 `/weather/city_01`로 이동한다.

## 5. 동적 상세 경로

라우터의 `:cityId`는 주소마다 바뀌는 값이다.

```js
{
  path: '/weather/:cityId',
  component: () => import('../views/WeatherDetailView.vue'),
}
```

상세 View는 현재 주소에서 ID를 읽고 Mock Data에서 도시를 찾는다.

```js
const route = useRoute()

const selectedWeather = computed(() => {
  return weatherList.find(
    (weather) => weather.id === route.params.cityId,
  )
})
```

존재하지 않는 도시 ID가 들어오면 상세 정보 대신 도시를 찾을 수 없다는 안내를 표시한다.

## 6. 소개·즐겨찾기·404 View

- `WeatherAboutView`: HandsOn 독립 컴포넌트의 역할 소개
- `WeatherFavoriteView`: 본인 추가 View로 즐겨찾기 목록 분리
- `NotFoundView`: 등록되지 않은 주소 안내

Catch-all Route:

```js
{
  path: '/:pathMatch(.*)*',
  component: () => import('../views/NotFoundView.vue'),
}
```

## 트러블슈팅 (직접 구현하면서 겪은 문제)

과제 3 화면을 View와 Route로 옮기면서 주소는 바뀌는데 화면이 그대로이거나 상세 도시를 찾지 못하는 문제를 확인했다.

### `cityId`를 받아왔는데 상세 도시가 `undefined`로 나온 문제

처음에는 Route의 `:cityId`와 코드에서 읽는 변수 이름을 정확히 맞추지 못했고, ID를 도시 이름과 비교하려고 했다. `route.params.cityId`와 `weather.id`를 비교하도록 수정한 뒤 상세 도시가 출력됐다.

### Router 화면을 단순화하면서 이전 과제 기능이 빠진 문제

처음에는 Router 개념만 남기기 위해 날씨 데이터를 3개로 줄이고 watch와 즐겨찾기를 제거했다. 하지만 과제 4는 새 과제를 다시 만드는 것이 아니라 과제 1~3의 결과를 발전시키는 단계였다.

그래서 8개 도시, 검색, 선택, watch, watchEffect, 즐겨찾기 기능을 모두 복원하고 상세보기 동작만 alert에서 페이지 이동으로 변경했다.

### 상세보기를 눌러도 alert만 나오는 문제

원인: 과제 3의 `showDetail()`이 남아 있음.

해결: `useRouter()`와 `router.push()`로 교체했다.

### 상세 페이지에서 도시가 나오지 않는 문제

원인: route에서 읽은 값은 `cityId`인데 Mock Data의 `name`과 비교함.

해결: `weather.id === route.params.cityId`로 같은 종류의 값을 비교했다.

### 메뉴를 눌러도 화면이 바뀌지 않는 문제

원인: `App.vue`에 `RouterView`가 없거나 RouterLink 주소와 route path가 다름.

해결: App에 `RouterView`를 배치하고 `/weather` 주소를 통일했다.

### 정적 페이지가 도시 상세 경로와 겹치는 문제

원인: `/weather/:cityId` 같은 동적 경로와 정적 경로의 구분을 고려하지 않음.

해결: `/about`, `/favorites` 같은 정적 route를 동적 상세 route보다 먼저 정의했다.

### 모든 주소가 404로 가는 문제

원인: Catch-all Route를 routes 배열 앞쪽에 배치함.

해결: Catch-all Route를 항상 마지막에 배치했다.

### 즐겨찾기 View로 이동하면 선택 상태가 사라지는 문제

원인: 즐겨찾기 상태가 메인 View 안에만 있으면 다른 View에서 접근할 수 없음.

해결: `weatherData.js`에 8개 도시와 즐겨찾기 ID를 분리해 두 View가 같은 반응형 상태를 사용했다.

### App에 날씨 화면이 두 번 나오는 문제

원인: `WeatherParent` 직접 출력과 `RouterView`를 동시에 사용함.

해결: App에서는 내비게이션과 `RouterView`만 출력했다.

## 구현 순서

1. 기존 `main.js`의 Router 연결을 확인했다.
2. 날씨 주소와 Lazy Loading route를 작성했다.
3. `WeatherHomeView`로 기존 대시보드 기능을 옮겼다.
4. 상세보기를 `router.push()`로 변경했다.
5. `WeatherDetailView`에서 `cityId`를 읽었다.
6. 소개·즐겨찾기·404 View를 추가했다.
7. App에 RouterLink와 RouterView를 배치했다.
8. `스칼라뷰` 정보 없음 카드로 Catch-all 404 이동을 확인할 수 있게 연결했다.
