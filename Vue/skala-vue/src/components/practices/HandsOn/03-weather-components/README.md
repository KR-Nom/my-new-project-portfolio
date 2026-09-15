# 과제 3: 날씨 Components

작성일: 2026-08-26 (수)

## 작업 목적

과제 2의 `WeatherComposition.vue`에 모여 있던 상태, 검색창, 날씨 카드, 즐겨찾기 목록을 역할별 Vue 컴포넌트로 분리했다.

기능을 새로 만드는 것이 아니라 기존 검색·선택·상세보기·즐겨찾기 동작을 유지하면서 다음 내용을 학습하는 것이 목적이다.

- 부모 컴포넌트의 상태 관리
- props를 이용한 부모에서 자식으로의 데이터 전달
- emits를 이용한 자식에서 부모로의 이벤트 전달
- `<slot>`을 이용한 공통 레이아웃 재사용
- 컴포넌트별 `<style scoped>` 분리

---

## 1. 컴포넌트 구성

```text
03-weather-components/components/
├── WeatherParent.vue
├── BaseDashboardCard.vue
├── SearchBar.vue
├── WeatherCard.vue
└── FavoriteCityList.vue
```

과제에서 요구한 네 컴포넌트에 기존 개인 기능인 즐겨찾기 목록을 `FavoriteCityList.vue`로 추가 분리하고 모두 `components` 폴더에 모았다.

| 컴포넌트 | 역할 |
| --- | --- |
| `WeatherParent.vue` | 모든 반응형 상태와 변경 함수 관리 |
| `BaseDashboardCard.vue` | 제목과 공통 박스 디자인 제공 |
| `SearchBar.vue` | 검색어 표시와 변경 이벤트 전달 |
| `WeatherCard.vue` | 날씨 객체 한 건 출력과 카드 이벤트 전달 |
| `FavoriteCityList.vue` | 즐겨찾기 목록 출력과 해제 이벤트 전달 |

---

## 2. 부모와 자식의 통신 구조

```text
WeatherParent
├─ query prop ───────────────▶ SearchBar
│  ◀──────── update-query emit
│
├─ weather/isFavorite props ─▶ WeatherCard
│  ◀──────── select-card emit
│  ◀──────── click-detail emit
│  ◀──────── toggle-favorite emit
│
├─ weatherList prop ─────────▶ FavoriteCityList
│  ◀──────── toggle-favorite emit
│
└─ slot content ─────────────▶ BaseDashboardCard
```

데이터는 부모에서 자식으로 내려가고, 사용자 동작은 자식이 이벤트로 부모에게 전달한다.

자식 컴포넌트는 전달받은 props를 직접 변경하지 않는다. 실제 상태 변경은 항상 `WeatherParent.vue`의 함수가 담당한다.

---

## 3. WeatherParent에서 상태 유지하기

기존 `WeatherComposition.vue`의 반응형 상태와 computed를 부모로 옮겼다.

```js
const weatherList = ref([...])
const searchQuery = ref('')
const selectedCityInfo = ref(null)
const favoriteCityIds = ref([])

const filteredWeatherList = computed(/* 검색 결과 */)
const favoriteWeatherList = computed(/* 즐겨찾기 결과 */)
```

다음 상태 변경 함수도 부모에 유지했다.

```text
updateSearchQuery()  검색어 변경
selectCity()         선택 도시 변경
showDetail()         상세보기 alert
toggleFavorite()     즐겨찾기 추가·제거
```

상태를 자식마다 나누지 않은 이유는 검색 결과, 선택 상태, 즐겨찾기 목록이 모두 같은 `weatherList`를 기준으로 계산되기 때문이다.

---

## 4. BaseDashboardCard와 slot

검색 영역과 날씨 목록 영역은 제목 아래에 내용이 들어가는 공통 박스 형태였다. 중복된 레이아웃을 `BaseDashboardCard.vue`로 분리했다.

```vue
<section class="dashboard-card">
  <h3>{{ icon }} {{ title }}</h3>
  <slot />
</section>
```

부모에서는 다음처럼 slot 안에 원하는 자식 컴포넌트를 배치한다.

```vue
<BaseDashboardCard icon="🔍" title="도시 검색">
  <SearchBar />
</BaseDashboardCard>
```

`BaseDashboardCard`는 내부에 어떤 기능이 들어오는지 알 필요가 없다. 제목과 박스 디자인만 담당한다.

---

## 5. SearchBar의 props와 emits

검색어는 부모 상태이므로 `SearchBar.vue`에서 직접 저장하지 않는다. 부모의 `searchQuery`를 `query` prop으로 전달받는다.

```vue
<SearchBar
  :query="searchQuery"
  @update-query="updateSearchQuery"
/>
```

자식 input은 prop 값을 표시하고 입력 이벤트가 발생하면 최신 문자열을 부모로 전달한다.

```js
const emit = defineEmits(['update-query'])

const updateQuery = (event) => {
  emit('update-query', event.target.value)
}
```

```html
<input :value="query" @input="updateQuery" />
```

이 흐름은 일반 input의 `v-model` 동작을 props와 emits로 직접 나눈 형태다.

---

## 6. WeatherCard의 props와 emits

`WeatherCard.vue`는 날씨 객체 한 건과 즐겨찾기 여부만 전달받는다.

```js
defineProps({
  weather: Object,
  isFavorite: Boolean,
})
```

카드에서 상태를 직접 변경하지 않고 사용자 동작을 부모로 전달한다.

```js
defineEmits([
  'select-card',
  'click-detail',
  'toggle-favorite',
])
```

부모는 computed 검색 결과를 반복하면서 각 카드에 객체를 전달한다.

```vue
<WeatherCard
  v-for="weather in filteredWeatherList"
  :key="weather.id"
  :weather="weather"
  :is-favorite="favoriteCityIds.includes(weather.id)"
  @select-card="selectCity"
  @click-detail="showDetail"
  @toggle-favorite="toggleFavorite"
/>
```

이 구조 덕분에 `WeatherCard`는 검색 방식이나 전체 배열 구조를 몰라도 전달받은 도시 한 건을 출력할 수 있다.

---

## 7. 개인 컴포넌트 FavoriteCityList

기존 즐겨찾기 기능을 과제의 추가 컴포넌트로 분리했다.

부모의 `favoriteWeatherList` computed 결과를 props로 받고, 해제 버튼을 누르면 도시 객체를 다시 부모로 전달한다.

```vue
<FavoriteCityList
  :weather-list="favoriteWeatherList"
  @toggle-favorite="toggleFavorite"
/>
```

즐겨찾기 목록 자체는 상태를 소유하지 않는다. 원본 상태인 `favoriteCityIds`는 부모에 있으므로 날씨 카드와 즐겨찾기 목록이 같은 상태를 공유한다.

---

## 8. 컴포넌트별 스타일 분리

기존에는 모든 CSS가 `WeatherComposition.vue` 하나에 있었다. 컴포넌트를 분리하면서 각 요소를 실제로 렌더링하는 파일로 스타일을 이동했다.

```text
WeatherParent       전체 화면, 목록 간격, 상태 안내
BaseDashboardCard   공통 박스와 제목
SearchBar           input과 검색 문구
WeatherCard         카드, 버튼, 온도 라벨
FavoriteCityList    즐겨찾기 목록과 해제 버튼
```

모든 컴포넌트가 `<style scoped>`를 사용하므로 한 컴포넌트의 `button`, `li`, `input` 스타일이 다른 컴포넌트에 의도치 않게 적용되지 않는다.

---

## 9. 트러블슈팅 (직접 구현하면서 겪은 문제)

과제 2의 한 파일을 여러 컴포넌트로 나누는 과정에서 데이터가 화면에 나오지 않거나 버튼 이벤트가 부모까지 같이 실행되는 문제를 하나씩 확인했다.

### 9-0. prop 이름을 다르게 작성해 카드 값이 `undefined`로 나온 문제

부모에서는 `:weather="weather"`로 전달했는데 자식 prop 이름을 다르게 생각해 카드 값이 나오지 않았다. 부모의 바인딩 이름과 자식의 `defineProps` 이름을 `weather`로 통일해 해결했다.

### 9-1. 자식에서 prop을 직접 변경하는 문제

문제가 되는 방향:

```vue
<input v-model="query" />
```

`query`는 부모가 전달한 prop이므로 자식이 직접 수정하면 단방향 데이터 흐름이 깨지고 Vue 경고가 발생할 수 있다.

해결:

```vue
<input :value="query" @input="updateQuery" />
```

자식은 `update-query` 이벤트만 보내고 부모가 `searchQuery.value`를 변경하도록 분리했다.

### 9-2. emit 이름이 부모와 자식에서 다른 문제

자식이 `update-query`를 보냈는데 부모가 `@updateQuery`처럼 다른 이름을 듣고 있으면 이벤트가 실행되지 않는다.

해결:

```text
자식: emit('update-query', value)
부모: @update-query="updateSearchQuery"
```

템플릿 이벤트 이름은 kebab-case로 통일했다.

### 9-3. slot 안의 자식이 BaseDashboardCard 상태라고 생각하는 문제

`SearchBar`가 시각적으로 `BaseDashboardCard` 안에 있어도 스크립트상 부모는 `WeatherParent`다. BaseDashboardCard를 통해 검색어를 다시 전달하려고 하면 불필요한 props와 emits 단계가 생긴다.

해결:

`WeatherParent` 템플릿에서 `SearchBar`와 `WeatherCard`를 직접 바인딩하고, `BaseDashboardCard`는 slot과 디자인만 담당하게 했다.

### 9-4. 버튼을 눌렀는데 카드 선택까지 실행되는 문제

상세보기와 즐겨찾기 버튼은 클릭 가능한 카드 내부에 있다. 버튼 이벤트가 부모 요소로 버블링되면 버튼 클릭과 카드 선택이 함께 실행된다.

해결:

```vue
<button @click.stop="$emit('click-detail', weather)">
```

두 버튼 모두 `.stop`을 적용했다.

### 9-5. 컴포넌트 분리 후 스타일이 사라지는 문제

기존 부모의 scoped 스타일은 새 자식 컴포넌트 내부 요소에 일반적으로 그대로 적용되지 않는다. 파일만 분리하고 CSS를 부모에 남겨두면 카드나 input 스타일이 사라질 수 있다.

해결:

input 스타일은 `SearchBar`, 카드 스타일은 `WeatherCard`처럼 실제 DOM을 렌더링하는 파일로 함께 이동했다.

### 9-6. 자식이 weather 객체를 직접 수정하는 문제

prop으로 받은 `weather.temp`나 `weather.status`를 자식에서 직접 변경하면 부모의 원본 배열까지 영향을 받을 수 있다.

해결:

`WeatherCard`는 객체를 읽기만 하고, 선택 시 객체를 이벤트로 부모에 전달한다. 부모의 `selectCity()`가 spread 문법으로 얕은 복사본을 저장한다.

```js
selectedCityInfo.value = { ...weather }
```

### 9-7. 이벤트마다 전달하는 값의 형태가 다른 문제

선택 이벤트는 객체, 상세보기 이벤트는 이름과 상태처럼 서로 다른 형태로 전달하면 부모 함수의 매개변수를 기억하기 어려워진다.

해결:

`select-card`, `click-detail`, `toggle-favorite` 이벤트 모두 날씨 객체 한 건을 payload로 전달하도록 통일했다.

### 9-8. 즐겨찾기 상태가 두 컴포넌트에서 달라지는 문제

`WeatherCard`와 `FavoriteCityList`가 각각 즐겨찾기 배열을 만들면 같은 도시의 상태가 서로 달라질 수 있다.

해결:

`favoriteCityIds`는 `WeatherParent`에 하나만 두었다. 두 자식은 같은 부모 상태에서 계산된 props를 전달받고 변경 요청만 emit한다.

### 9-9. 이전 과제와 새 과제가 동시에 화면에 나오는 문제

`App.vue`에서 `WeatherComposition`과 `WeatherParent`를 동시에 렌더링하면 비슷한 화면이 두 번 출력되고 콘솔 감시 로그도 중복된다.

해결:

과제 2 컴포넌트는 비교용 파일로 유지하되 템플릿에서는 주석 처리하고 `WeatherParent`만 렌더링했다.

---

## 10. 실제 구현 순서

1. `WeatherComposition.vue`를 참고해 `WeatherParent.vue`에 기존 상태와 함수를 옮겼다.
2. 공통 박스 구조를 `BaseDashboardCard.vue`와 slot으로 분리했다.
3. 검색 input을 `SearchBar.vue`로 분리했다.
4. `query` prop과 `update-query` emit을 연결했다.
5. 날씨 카드 한 건을 `WeatherCard.vue`로 분리했다.
6. 날씨 props와 선택·상세보기·즐겨찾기 emits를 연결했다.
7. 즐겨찾기 목록을 `FavoriteCityList.vue`로 추가 분리했다.
8. 각 요소의 CSS를 해당 컴포넌트의 scoped style로 이동했다.
9. `App.vue`에는 과제 3의 `WeatherParent`만 연결해 이전 과제 화면과 겹치지 않게 했다.

---
