# 날씨 Mockup HandsOn 작업 기록

## 작업 목적

Vue 수업에서 배운 `ref`, `v-for`, `v-if`, `v-model`, 이벤트 처리를 한 화면에서 직접 사용하기 위해 날씨 Mockup을 만들었다.

완성 코드를 한 번에 작성한 것이 아니라 화면 뼈대를 먼저 만든 뒤 데이터 출력, 조건 처리, 입력값 연결, 클릭 이벤트 순서로 기능을 추가했다. 이후 화면을 직접 확인하며 변수 오타, 이벤트 충돌, 반복 위치, 화면 크기와 CSS 우선순위 문제를 해결했다.

## 1. 화면 뼈대 만들기

처음에는 `WeatherMockup.vue`에 제목, 도시 검색 input, 입력값 확인 영역, 지역별 날씨 목록을 넣을 빈 `<ul>`과 `<li>`를 만들었다.

```html
<h3>도시 검색</h3>
<input type="text" placeholder="검색할 도시 이름 입력" />

<h3>지역별 날씨 현황</h3>
<ul>
  <li></li>
</ul>
```

한 번에 모든 기능을 넣기보다 필요한 화면 영역을 먼저 나누고 각 영역에 Vue 문법을 하나씩 연결하는 방식으로 진행했다.

## 2. 날씨 데이터 준비하기

`script setup`에서 Vue의 `ref`를 불러오고 날씨 배열을 만들었다.

```js
import { ref } from 'vue'

const weatherList = ref([
  { id: 'city_01', name: '서울', temp: 28, status: '맑음' },
  { id: 'city_02', name: '부산', temp: 24, status: '비' },
  { id: 'city_03', name: '수원', temp: 26, status: '구름' },
])
```

- `id`: Vue가 각 카드를 구분할 때 사용하는 고유값
- `name`: 도시 이름
- `temp`: 기온 조건을 판단할 값
- `status`: 상세보기 alert에 표시할 날씨 상태

처음에는 데이터와 상세보기 함수를 주석으로 준비해 두고, 기본 화면을 확인한 뒤 주석을 해제하면서 연결했다.

## 3. `v-for`로 카드 반복 출력하기

도시마다 `<li>`를 직접 작성하지 않고 `v-for`로 배열을 반복했다.

```html
<li v-for="weather in weatherList" :key="weather.id"></li>
```

`weather`는 반복할 때마다 현재 도시 객체 하나를 가리킨다. 카드 안에서는 `weather.name`, `weather.temp`, `weather.status`로 값을 꺼냈다.

### 당시 수정 과정: 날씨 값이 제대로 나오지 않음

반복 변수는 `weather`로 선언했지만 출력 부분에 `wheather`라고 적은 오타가 있었다.

```html
<!-- 잘못 작성한 코드 -->
<strong>{{ wheather.name }}</strong>
<p>{{ wheather.temp }}</p>
```

`weather`와 `wheather`는 서로 다른 변수이므로 선언되지 않은 값을 찾게 된다. 반복문에서 선언한 이름과 똑같이 수정해 해결했다.

```html
<strong>{{ weather.name }}</strong>
<p>{{ weather.temp }}</p>
```

이 과정에서 `v-for`의 반복 변수 이름은 내부에서도 철자를 정확히 맞춰야 한다는 점을 확인했다.

## 4. 기온에 따라 상태 나누기

현재 기온이 25도 이상인지 확인하여 더움과 선선함 중 하나만 출력했다.

```html
<span v-if="weather.temp >= 25" class="weather-label hot"> 🔥 더움 (25도 이상) </span>
<span v-else class="weather-label cool"> ❄️ 선선함 (25도 미만) </span>
```

처리 순서는 다음과 같다.

1. 현재 카드의 `weather.temp`를 확인한다.
2. 25 이상이면 `v-if`의 더움 문구를 보여준다.
3. 25 미만이면 `v-else`의 선선함 문구를 보여준다.

### 당시 수정 과정: 선선함도 빨간 배경으로 표시됨

처음에는 각 `span`에 inline style을 직접 작성했다. 선선함 글자는 파란색이었지만 배경은 더움과 같은 빨간 계열이라 상태 구분이 잘되지 않았다.

그래서 공통 스타일과 상태별 스타일을 분리했다.

```css
.weather-label.hot {
  color: #ffffff;
  background: #ff6572;
}

.weather-label.cool {
  color: #ffffff;
  background: #45b9ef;
}
```

조건 판단은 `v-if`가 담당하고, 색상 표현은 CSS 클래스가 담당하도록 역할을 나눴다.

## 5. 검색 input과 값 연결하기

검색어를 저장할 `text`를 만들고 input에 `v-model`을 연결했다.

```js
const text = ref('')
```

```html
<input v-model="text" type="text" placeholder="검색할 도시 이름 입력" />

<h3>검색 중인 도시: <strong>{{ text }}</strong></h3>
```

별도의 입력 이벤트 함수를 만들지 않아도 사용자가 한글 도시 이름을 입력하면 `text`가 갱신되고 화면의 `{{ text }}`도 바로 바뀐다.

## 6. 카드 클릭으로 도시 선택하기

선택된 도시를 기억하기 위해 `selectedCity`를 만들었다.

```js
const selectedCity = ref('')
```

각 카드에 클릭 이벤트를 연결해 현재 도시 이름을 저장했다.

```html
<li v-for="weather in weatherList" :key="weather.id" @click="selectedCity = weather.name"></li>
```

클릭 전에는 기본 안내를 보여주고, 클릭 후에는 선택된 도시를 보여주도록 나눴다.

```html
<p v-if="selectedCity" class="selected-message">{{ selectedCity }}이 선택되었습니다.</p>
<span v-else class="selected-message"> 카드를 클릭하거나 검색해 보세요. </span>
```

### 당시 수정 과정: 선택 문구가 카드마다 반복됨

처음에는 `selected-message`를 `v-for`가 적용된 `<li>` 내부에 넣었다. `v-for` 내부의 요소는 배열 개수만큼 반복되므로 선택 결과도 각 카드 안에 나타날 수 있었다.

선택 결과는 개별 카드 내용이 아니라 전체 목록의 결과이므로 `</ul>` 아래로 이동했다.

```html
</ul>
<p class="selected-message">선택 결과</p>
```

이 과정에서 반복되어야 하는 카드 내용과 한 번만 나와야 하는 전체 결과의 위치를 구분했다.

## 7. 상세보기 alert 만들기

상세보기 버튼을 누르면 현재 카드의 도시 이름과 날씨 상태가 나오도록 함수를 작성했다.

```js
const showDetail = (cityName, status) => {
  window.alert(`${cityName}의 현재 날씨는 [${status}] 상태입니다.`)
}
```

버튼에서는 현재 반복 중인 `weather`의 값을 함수에 전달했다.

```html
<button @click.stop="showDetail(weather.name, weather.status)">상세보기</button>
```

### 당시 수정 과정: 버튼과 카드 클릭이 함께 실행됨

상세보기 버튼은 클릭 이벤트가 있는 `<li>` 내부에 있다. `.stop`이 없으면 버튼을 클릭했을 때 이벤트가 부모 카드까지 전달된다.

그 결과 한 번의 클릭으로 alert와 도시 선택이 함께 실행될 수 있다. 이 현상을 이벤트 버블링이라고 하며, 두 역할을 분리하기 위해 `@click.stop`을 사용했다.

- 카드 클릭: `selectedCity` 변경
- 상세보기 클릭: alert만 실행

## 8. 화면이 너무 좁게 보이는 문제 해결하기

기능을 만든 뒤 화면을 확인하니 날씨 Mockup이 모바일 카드처럼 지나치게 좁게 표시됐다.

첫 번째 원인은 컴포넌트에 있던 `max-width: 520px`이었다. 화면이 넓어져도 컴포넌트가 520px 이상 커질 수 없었다.

두 번째 원인은 Vue 기본 `main.css`였다. 큰 화면에서 `#app`이 2열 grid로 설정되어 날씨 컴포넌트가 전체 화면이 아니라 한 칸만 사용하고 있었다.

```css
#app {
  display: grid;
  grid-template-columns: 1fr 1fr;
}
```

컴포넌트 너비만 키우지 않고 부모 `#app`의 레이아웃도 확인해 전체 너비를 사용할 수 있도록 했다. 여백과 글자 크기는 `clamp()`를 사용해 화면 크기에 따라 최소값과 최대값 사이에서 변하게 했다.

```css
font-size: clamp(20px, 2.2vw, 28px);
```

이 문제를 통해 자식 컴포넌트가 작게 보이면 해당 요소뿐 아니라 부모의 `width`, `max-width`, `grid` 설정도 함께 확인해야 한다는 점을 배웠다.

## 9. 선택 메시지 글자가 계속 작은 문제 해결하기

선택 메시지의 글자 크기를 키웠지만, 도시를 선택한 뒤 나오는 `선택되었습니다` 문구는 계속 작게 표시됐다.

원인은 기존 CSS 선택자였다.

```css
.handson-section > p {
  font-size: 13px;
}
```

선택 후 메시지가 `<p class="selected-message">`였기 때문에 위 규칙의 영향을 받았다. 단순한 `.selected-message`보다 `.handson-section > p`의 우선순위가 높았다.

선택 메시지를 더 구체적으로 지정해 해결했다.

```css
.handson-section > .selected-message {
  font-size: clamp(16px, 1.5vw, 19px);
}
```

이 과정에서 CSS는 아래쪽에 작성했다고 무조건 적용되는 것이 아니라 선택자의 구체성과 우선순위도 확인해야 한다는 점을 알게 됐다.

## 10. 전체 구현 순서

1. 제목, 검색창, 목록 영역으로 화면 뼈대를 만들었다.
2. `ref`로 날씨 데이터 배열을 선언했다.
3. `v-for`와 `:key`로 도시 카드를 반복 출력했다.
4. 반복 변수의 `wheather` 오타를 찾아 `weather`로 수정했다.
5. `v-if`, `v-else`로 기온 상태를 나눴다.
6. `v-model`로 검색어를 실시간 출력했다.
7. `selectedCity`를 만들고 카드 클릭 이벤트를 연결했다.
8. 선택 안내 문구를 반복문 바깥으로 이동했다.
9. 상세보기 함수에 도시 이름과 상태를 전달했다.
10. `.stop`으로 버튼과 카드의 클릭 동작을 분리했다.
11. 더움과 선선함 라벨의 색상을 분리했다.
12. 부모 레이아웃과 컴포넌트 너비를 확인해 반응형으로 조정했다.
13. CSS 우선순위 문제를 찾아 선택 안내 글자 크기를 수정했다.

## 이번 실습에서 배운 점

- Vue 템플릿의 변수 이름은 `script`에서 선언한 이름과 정확히 같아야 한다.
- `v-for` 내부 요소는 데이터 개수만큼 모두 반복된다.
- 전체 목록의 결과는 반복문 바깥에 두어야 한 번만 출력된다.
- `v-model`로 input과 반응형 값을 연결할 수 있다.
- 중첩된 클릭 요소에서는 이벤트 버블링을 고려해야 한다.
- `.stop`으로 부모에 전달되는 클릭 이벤트를 막을 수 있다.
- 화면 크기 문제는 컴포넌트와 부모 레이아웃을 함께 확인해야 한다.
- CSS가 예상대로 적용되지 않으면 선택자 우선순위를 확인해야 한다.

## 트러블슈팅 (실제로 겪은 문제)

### `weatherList`에서 첫 번째 도시만 보이거나 값이 출력되지 않음

- 원인: `v-for`가 반복되는 요소의 위치와 닫는 태그를 제대로 맞추지 못했고, 반복 변수 `weather`를 `wheather`로 잘못 작성했다.
- 확인: 배열에는 3개 이상 들어 있는데 화면에는 한 카드만 나오거나 콘솔에 변수를 찾을 수 없다는 메시지가 표시됐다.
- 해결: `<li v-for="weather in weatherList" :key="weather.id">` 구조를 다시 맞추고 카드 내부 변수명을 모두 `weather`로 통일했다.

### 선선함 라벨도 더움과 같은 색으로 보임

- 원인: 조건문은 정상인데 두 span에 비슷한 inline style을 사용했다.
- 해결: `hot`, `cool` 클래스를 따로 만들고 선선함은 파란 계열로 분리했다.

### 선택 문구가 카드마다 반복됨

- 원인: 전체 선택 결과를 `v-for`가 적용된 `<li>` 안에 작성했다.
- 해결: 선택 메시지를 `</ul>` 아래로 옮겨 목록 전체에서 한 번만 렌더링되게 했다.

### 상세보기 버튼을 누르면 카드 선택도 함께 실행됨

- 원인: 버튼 클릭 이벤트가 부모 카드까지 전달되는 이벤트 버블링이 발생했다.
- 해결: 상세보기 버튼에 `@click.stop`을 적용했다.

### 화면 너비와 선택 문구 글자 크기가 바뀌지 않음

- 원인: 컴포넌트의 `max-width`뿐 아니라 기본 `main.css`의 `#app` grid와 더 강한 CSS 선택자가 함께 적용되고 있었다.
- 해결: 부모 레이아웃까지 확인하고 `.handson-section > .selected-message`처럼 실제 요소에 맞는 선택자를 사용했다.

## 추후 진행

- 기본 예제 외에 개인 날씨 데이터 추가
