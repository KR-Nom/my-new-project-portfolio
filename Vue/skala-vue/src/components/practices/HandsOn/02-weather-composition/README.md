# 과제 2: 날씨 Composition

작성일: 2026-08-25 (화)

## 작업 목적

과제 1에서 만든 `WeatherMockup.vue`를 복사하여 `WeatherComposition.vue`를 만들고, 기존 UI를 유지하면서 Composition API의 `computed`, `watch`, `watchEffect`를 단계적으로 적용했다.

이번 과제에서는 완전히 새로운 화면을 만드는 것보다 지금까지 작성한 다음 예제들을 조합하는 방식을 사용했다.

- `ReactiveRef.vue`: `ref()` 상태 선언
- `ComputedBasic.vue`: `computed()` 선언과 캐싱
- `WatchersBasic.vue`: 단일 반응형 값 `watch()` 감시
- `WeatherMockup.vue`: 날씨 카드, 조건부 렌더링, 클릭 이벤트

---

## 1. Mockup을 복사해 새 컴포넌트 만들기

과제 1 결과를 보존하고 비교하기 위해 기존 파일을 직접 변경하지 않고 새 컴포넌트로 분리했다.

```text
HandsOn/
├── WeatherMockup.vue
└── WeatherComposition.vue
```

복사 후 화면 제목을 `과제 2: 날씨 (컴포지션)`으로 변경하고 `App.vue`에서 새 컴포넌트를 불러왔다.

이 방식의 장점은 과제 2에서 오류가 발생했을 때 과제 1의 동작과 코드를 바로 비교할 수 있다는 점이다.

---

## 2. Mockup의 날씨 데이터 재사용하기

도시 데이터 8개 추가는 과제 1의 `WeatherMockup.vue`에서 마지막에 완료했다. 과제 2에서는 해당 배열과 카드 UI를 함께 복사해 사용하고, 데이터 자체보다 Composition API를 적용하는 데 집중했다.

따라서 두 컴포넌트는 같은 `{ id, name, temp, status }` 구조와 도시 8개를 사용하며, 검색·감시·즐겨찾기 기능의 유무로 차이를 구분한다.

---

## 3. 복사 후 남은 변수 이름 문제

검색 input은 새 변수인 `searchQuery`와 연결했지만 출력 영역에는 과제 1의 `text`가 남아 있었다.

```html
<!-- 잘못 남아 있던 코드 -->
<input v-model="searchQuery" />
<strong>{{ text }}</strong>
```

`text`는 새 컴포넌트에 선언되지 않았으므로 input과 출력에서 같은 상태를 사용하도록 수정했다.

```html
<input v-model="searchQuery" />
<strong>{{ searchQuery }}</strong>
```

파일을 복사해 확장할 때는 화면 구조뿐 아니라 이전 변수 이름이 남아 있는지도 확인해야 한다는 점을 알게 됐다.

---

## 4. 선택 도시를 객체로 저장하고 얕은 복사하기

처음에는 `selectedCityInfo`라는 이름을 사용하면서 실제 값은 `weather.name` 문자열만 저장했다.

```html
@click="selectedCityInfo = weather.name"
```

변수의 역할이 선택 도시의 전체 정보이므로 도시 객체를 저장하도록 변경했다. 원본 날씨 객체와 선택 상태가 같은 참조를 공유하지 않도록 spread 문법으로 얕은 복사했다.

```js
const selectCity = (weather) => {
  selectedCityInfo.value = { ...weather }
}
```

```html
<li @click="selectCity(weather)">
```

현재 날씨 객체의 속성은 문자열과 숫자뿐이므로 깊은 복사까지는 필요하지 않았다.

선택 문구에서는 객체의 `name`을 사용했다.

```html
{{ selectedCityInfo.name }}이 선택되었습니다.
```

---

## 5. 먼저 `v-for + v-if`로 검색 원리 확인하기

검색 기능을 처음부터 JavaScript `filter()`로 완성하지 않고, 이미 학습한 `v-for`와 `v-if`로 먼저 동작을 확인했다.

```html
<template v-for="weather in weatherList" :key="weather.id">
  <li v-if="searchQuery === '' || weather.name.includes(searchQuery)">
    <!-- 날씨 카드 -->
  </li>
</template>
```

처리 순서는 다음과 같았다.

1. `v-for`가 도시 8개를 순회한다.
2. 검색어가 비어 있으면 모든 도시를 표시한다.
3. 검색어가 있으면 도시 이름에 포함된 경우만 표시한다.

같은 요소에 `v-for`와 `v-if`를 함께 붙이지 않고 바깥쪽 `<template>`에 `v-for`를 배치했다.

---

## 6. 검색 로직을 computed로 이동하기

템플릿에서 검색 원리를 확인한 뒤 과제 요구사항에 맞게 검색 결과를 `filteredWeatherList` computed로 옮겼다.

```js
const filteredWeatherList = computed(() => {
  if (searchQuery.value === '') {
    return weatherList.value
  }

  return weatherList.value.filter((weather) =>
    weather.name.includes(searchQuery.value),
  )
})
```

템플릿은 계산 방법을 알 필요 없이 computed 결과만 반복한다.

```html
<li v-for="weather in filteredWeatherList" :key="weather.id">
```

이 과정을 통해 역할을 다음처럼 나눴다.

```text
script의 computed: 어떤 도시를 보여줄지 계산
template의 v-for: 계산된 도시를 화면에 반복 출력
```

검색 결과가 없으면 배열 길이가 `0`이 되므로 `v-if`, `v-else`로 안내 문구를 표시했다.

```html
<ul v-if="filteredWeatherList.length > 0">
  <!-- 검색된 카드 -->
</ul>
<p v-else>검색 결과와 일치하는 도시가 없습니다.</p>
```

---

## 7. 선택 도시를 watch로 감시하기

`selectedCityInfo`의 이전 값과 현재 값을 비교하기 위해 `watch`를 사용했다.

```js
watch(selectedCityInfo, (newCity, oldCity) => {
  const oldCityName = oldCity?.name ?? '선택 없음'

  console.log(
    `[watch 감지] 선택 도시 변경: ${oldCityName} → ${newCity.name}`,
  )
})
```

첫 선택에서는 이전 값이 `null`이므로 optional chaining과 null 병합 연산자로 `선택 없음`을 표시했다.

```text
선택 없음 → 서울
서울 → 부산
```

선택 객체를 매번 얕은 복사하므로 같은 도시를 다시 클릭해도 새로운 객체가 할당되어 watch가 실행된다.

---

## 8. 검색 상태를 watchEffect로 감시하기

`watchEffect`에서는 검색어와 computed 검색 결과를 직접 사용했다.

```js
watchEffect(() => {
  const cityNames = filteredWeatherList.value
    .map((weather) => weather.name)
    .join(', ')

  console.log(
    `[watchEffect 자동 호출] 현재 검색어 "${searchQuery.value}"의 검색 결과: ${filteredWeatherList.value.length}개 (${cityNames || '검색 결과 없음'})`,
  )
})
```

`watchEffect`는 내부에서 읽은 `searchQuery`와 `filteredWeatherList`를 자동으로 추적한다. 컴포넌트가 처음 실행될 때 한 번 호출되고 검색어가 변경될 때 다시 실행된다.

### watch와 watchEffect 역할 구분

| 기능 | 사용한 API | 선택 이유 |
| --- | --- | --- |
| 선택 도시 변경 | `watch` | 이전 도시와 현재 도시를 비교해야 함 |
| 검색 상태 변경 | `watchEffect` | 내부에서 사용하는 검색어와 결과를 자동 추적 |

선택 도시를 `watchEffect`로 감시할 수도 있지만 이전 값을 인자로 받을 수 없으므로 `서울 → 부산` 같은 변경 과정을 바로 표현하기 어렵다.

---

## 9. 개인 기능으로 즐겨찾기 추가하기

과제의 개인 반응형 상태·computed·watcher 요구사항을 즐겨찾기 기능으로 구현했다.

### 반응형 상태

원본 도시 객체를 중복 저장하지 않고 도시 ID만 저장한다.

```js
const favoriteCityIds = ref([])
```

### 추가와 제거

현재 ID가 있으면 `filter()`로 제거하고, 없으면 spread로 새 배열에 추가한다.

```js
const toggleFavorite = (weather) => {
  const isFavorite = favoriteCityIds.value.includes(weather.id)

  if (isFavorite) {
    favoriteCityIds.value = favoriteCityIds.value.filter(
      (cityId) => cityId !== weather.id,
    )
    return
  }

  favoriteCityIds.value = [...favoriteCityIds.value, weather.id]
}
```

`push()`로 기존 배열을 직접 변경하지 않고 매번 새 배열을 할당했다. 이 방식은 watch에서 이전 배열과 현재 배열을 비교하기 쉽다.

### computed

저장된 ID를 원본 도시 객체와 연결한다.

```js
const favoriteWeatherList = computed(() => {
  return weatherList.value.filter((weather) =>
    favoriteCityIds.value.includes(weather.id),
  )
})
```

### watcher

```js
watch(favoriteCityIds, (newIds, oldIds) => {
  console.log(`[즐겨찾기 watch] ${oldIds.length}개 → ${newIds.length}개`)
})
```

즐겨찾기 버튼에는 `.stop`을 적용해 카드 선택 이벤트가 함께 실행되지 않도록 했다.

---

## 10. 실제 구현 순서

1. `WeatherMockup.vue`를 복사해 `WeatherComposition.vue`를 만들었다.
2. Mockup에서 완성한 도시 데이터 8개를 그대로 재사용했다.
3. 복사 후 남은 `text` 변수를 `searchQuery`로 수정했다.
4. `selectedCityInfo`에 이름 대신 도시 객체의 얕은 복사본을 저장했다.
5. `v-for + v-if`로 검색 원리를 먼저 확인했다.
6. 검색 로직을 `filteredWeatherList` computed로 이동했다.
7. 검색 결과가 없을 때 안내 문구를 추가했다.
8. `watch`로 선택 도시의 이전 값과 현재 값을 감시했다.
9. `watchEffect`로 검색어와 검색 결과를 자동 추적했다.
10. 개인 기능으로 즐겨찾기 상태, computed, watcher를 구현했다.
11. 즐겨찾기 버튼과 목록을 화면에 연결했다.

## 11. 트러블슈팅 (실제로 겪은 문제)

### 복사한 화면에서 검색어가 입력돼도 표시되지 않음

- 원인: input은 `searchQuery`를 사용했지만 출력 부분에는 과제 1의 `text`가 남아 있었다.
- 해결: 입력과 출력이 같은 `searchQuery`를 바라보도록 변수명을 통일했다.

### `selectedCityInfo.name`이 화면에 나오지 않음

- 원인: 변수 이름은 도시 정보 객체처럼 만들었지만 실제로는 `weather.name` 문자열만 저장했다.
- 해결: `selectedCityInfo.value = { ...weather }`로 도시 객체를 얕은 복사해 저장했다.

### 검색 조건을 작성했는데 모든 카드가 나오거나 하나도 나오지 않음

- 원인: `weatherList`와 `weatherList.value`, `searchQuery`와 `searchQuery.value`를 script 안에서 구분하지 못했다.
- 해결: script의 computed 안에서는 ref에 `.value`를 붙이고, template에서는 `.value` 없이 사용했다.

### computed를 만들었는데 화면에서 검색 결과가 바뀌지 않음

- 원인: `filter()` 결과를 반환하지 않거나 `filteredWeatherList()`처럼 일반 함수로 호출했다.
- 해결: computed callback에서 배열을 `return`하고 template에서는 `filteredWeatherList`로 반복했다.

### count 같은 값을 바꿨는데 computed의 console이 다시 찍히지 않음

- 원인: computed는 자신이 읽는 반응형 값이 변경되고, 계산 결과가 실제로 다시 필요할 때 실행된다. 관련 없는 상태를 변경하면 재실행되지 않는다.
- 해결: 어떤 값을 감시하려는지 먼저 구분하고, 단순 실행 확인은 일반 함수나 `watch`를 사용했다.

### watch 첫 실행에서 이전 도시 이름을 읽다가 오류가 남

- 원인: 첫 선택 전의 `oldCity`는 `null`인데 바로 `oldCity.name`에 접근했다.
- 해결: `oldCity?.name ?? '선택 없음'`으로 값이 없는 경우를 처리했다.

### 즐겨찾기를 눌렀는데 카드 선택도 함께 변경됨

- 원인: 과제 1의 상세보기 버튼과 같은 이벤트 버블링 문제였다.
- 해결: 즐겨찾기 버튼에도 `.stop`을 적용했다.

### 트러블슈팅을 통해 배운 점

- 파일을 복사하면 이전 변수 이름이 남아 있는지 확인해야 한다.
- 변수 이름과 실제 저장하는 데이터의 역할이 일치해야 한다.
- 단순한 객체는 spread를 이용한 얕은 복사로 원본과 선택 상태를 분리할 수 있다.
- 검색 원리를 템플릿에서 확인한 후 computed로 역할을 옮길 수 있다.
- computed는 함수처럼 호출하지 않고 반응형 값으로 사용한다.
- 이전 값과 현재 값이 모두 필요하면 `watch`가 적합하다.
- 여러 반응형 의존성을 자동 추적하려면 `watchEffect`가 적합하다.
- `filter()`는 원본을 변경하지 않고 새 배열을 반환하므로 결과를 재할당해야 한다.
- 자식 버튼의 클릭과 카드 클릭을 분리하려면 `.stop`이 필요하다.

## 12. 현재 제한사항

즐겨찾기는 Vue의 `ref` 배열에 저장되므로 브라우저를 새로고침하면 초기화된다. 과제 범위에는 영구 저장 요구사항이 없어 `localStorage`는 추가하지 않았다.
