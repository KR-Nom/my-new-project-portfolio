# 과제 5: 날씨 Store

작성일: 2026-08-27 (목)

## 작업 목적

과제 4의 8개 도시, 검색, 선택, 즐겨찾기, 상세 페이지와 Router 기능을 그대로 유지하면서 Pinia Store로 섭씨·화씨 설정을 여러 화면에서 함께 사용했다.

## 파일 역할

```text
05-weather-store/
├── components/
│   ├── UnitToggler.vue       온도 단위 변경 버튼
│   └── WeatherCard.vue       Store 단위를 적용한 날씨 카드
├── stores/configStore.js     공통 온도 단위 상태
├── data/weatherData.js       8개 도시와 즐겨찾기 상태
├── router/index.js           과제 5 Route 규칙
└── views/                    메인·상세·즐겨찾기·소개·404 화면
```

## 구현 순서

1. 과제 4 폴더를 복사해 이전 기능이 사라지지 않게 했다.
2. `configStore.js`에 기본값이 `celsius`인 `unit` state를 만들었다.
3. `unitSymbol` getter에서 섭씨는 `℃`, 화씨는 `℉`를 반환했다.
4. `toggleUnit` action에서 두 단위를 서로 바꾸었다.
5. `UnitToggler`를 내비게이션 옆에 배치했다.
6. 메인 날씨 카드와 상세 View가 같은 Store를 읽도록 연결했다.
7. 개인 기능으로 단위 이름 getter와 변경 횟수 state를 추가했다.

## Store 핵심

```js
const unit = ref('celsius')
const unitSymbol = computed(() => (unit.value === 'celsius' ? '℃' : '℉'))

const toggleUnit = () => {
  unit.value = unit.value === 'celsius' ? 'fahrenheit' : 'celsius'
}
```

- state는 여러 컴포넌트가 함께 기억할 값이다.
- getter는 state를 이용해 필요한 값을 계산한다.
- action은 state를 변경하는 함수다.

## 온도 변환 방식

날씨 데이터의 원본은 섭씨로 유지하고 화씨를 선택했을 때 표시 값만 `Math.round((rawTemp * 9) / 5 + 32)`로 계산했다. 원본까지 바꾸면 단위를 여러 번 누를 때 이미 변환된 값을 다시 변환할 수 있기 때문이다.

## 트러블슈팅 (직접 구현하면서 겪은 문제)

온도 단위를 Store로 옮기는 과정에서 버튼의 글자는 바뀌지만 온도 숫자는 그대로이거나 상세 화면에는 단위가 적용되지 않는 문제를 확인했다.

### Store의 `unit` 값이 있는데 조건문이 동작하지 않은 문제

Store 파일 내부와 컴포넌트 template에서 `.value`를 사용하는 위치를 혼동했다. Store 내부에서는 `unit.value`로 변경하고 template에서는 `configStore.unit`으로 사용하도록 정리했다.

### Store 이름을 다르게 import해서 단위 버튼이 동작하지 않은 문제

Store 파일에서 `useConfigStore`를 export했지만 컴포넌트에서 이름과 상대경로를 제대로 맞추지 못해 함수를 찾지 못했다. export 이름, import 이름과 과제 5 폴더 경로를 같은 기준으로 수정했다.

### 메인에서 바꾼 단위가 상세 화면에 유지되지 않는 문제

각 컴포넌트가 별도의 `ref`를 가지면 서로 다른 값을 기억한다. 두 화면 모두 `useConfigStore()`를 호출해 하나의 상태를 사용했다.

### 기호만 바뀌고 숫자는 그대로인 문제

`unitSymbol`만 연결해서 생긴 문제였다. 카드와 상세 View에 `displayTemp` computed를 만들고 화씨일 때 변환식을 적용했다.

### 과제 4 기능이 사라지는 문제

Store 예제만 새로 만들지 않고 과제 4를 먼저 복사한 뒤 온도 단위 기능만 추가해 8개 도시, 검색, 즐겨찾기와 Router를 유지했다.

### Store를 찾을 수 없다는 오류가 나는 문제

`main.js`의 `app.use(createPinia())`를 유지하고 각 파일에서 과제 5의 `configStore` 경로를 사용했다.

### 정보가 없는 카드에서 계산 오류가 나는 문제

`null` 온도를 변환식에 넣지 않도록 computed에서 먼저 확인하고 실제 온도가 있을 때만 계산했다.
