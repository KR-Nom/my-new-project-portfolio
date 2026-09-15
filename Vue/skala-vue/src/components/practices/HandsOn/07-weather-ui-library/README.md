# 과제 7: 날씨 UI Library

작성일: 2026-08-27 (목)

## 작업 목적

과제 6의 Router, Store, Axios, Forecast와 대기질 기능은 유지하고 Element Plus를 이용해 과제 예시 화면에서 벗어난 개인 날씨 대시보드로 재구성했다.

## 선정한 UI Library

Element Plus는 Vue 3에서 사용할 수 있고 Card, Button, Input, Tag, Alert, Skeleton, Switch를 한 라이브러리에서 제공해 선택했다.

```bash
npm install element-plus
```

`main.js`에서 전역으로 등록했다.

```js
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

app.use(ElementPlus)
```

## UI 제작 과정

이번 과제의 화면 방향과 기능 배치는 직접 구상했다. 하늘을 주제로 한 전체 배경, 도시별 대표 사진, 사진 위 노란색 즐겨찾기, 날씨 상태를 나타내는 원형 아이콘, 카드 우측 하단의 상세보기 버튼, 카드 Hover 시 선택한 도시를 강조하는 방식 등을 아이디어로 정리한 뒤 화면에 적용했다.

Element Plus에서 제공하는 Card, Button, Input, Switch 등의 기본 UI Component는 외부 UI Library를 활용했다. 외부 Library를 제외한 반응형 배치, 색상, 여백, 그림자, Hover 효과와 같은 세부 CSS 구현과 코드 정리에는 AI의 도움을 받았다. 이 과정에서 AI가 임의로 화면을 정한 것이 아니라, 직접 제시한 디자인 방향을 기준으로 결과를 확인하고 위치와 색상을 계속 수정하며 완성했다.

```text
직접 정한 부분
├── 전체 하늘 테마와 화면 분위기
├── 도시 대표 사진을 사용하는 카드 구성
├── 즐겨찾기와 상세보기 버튼 위치
├── 기온 상태별 원형 색상 표현
└── 상세보기·즐겨찾기·서비스 소개 화면 구성

AI의 도움을 받은 부분
├── 직접 정한 아이디어를 CSS 코드로 작성
├── 반응형 화면 크기와 간격 조정
├── Hover·그림자·투명도 세부 값 조정
└── 반복되는 스타일 정리와 빌드 오류 확인
```

상세 화면의 날씨 배경 영상은 Pexels에서 무료 제공되는 영상을 웹용 저용량 MP4로 내려받아 로컬 자산으로 사용했다.

- 맑음: [The Rays Of Sun In A Clear Sky](https://www.pexels.com/video/the-rays-of-sun-in-a-clear-sky-2605326/)
- 흐림: [Blue Sky with Clouds Moving](https://www.pexels.com/video/blue-sky-with-clouds-moving-4496903/)
- 비: [Time Lapse of Raindrops Falling on a Window Glass](https://www.pexels.com/video/time-lapse-of-raindrops-falling-on-a-window-glass-10651122/)

## 주요 변경 내용

- 과제 6을 `07-weather-ui-library`로 복사해 이전 버전 보존
- 헤더를 Weather Flow 브랜드와 반응형 메뉴로 변경
- 검색창을 `el-input`으로 변경
- 날씨 목록을 2열 반응형 카드 대시보드로 변경
- 카드에 `el-card`, `el-button`, `el-tag` 적용
- 단위 변경을 `el-switch`로 변경
- 로딩에 `el-skeleton`, 오류에 `el-alert` 적용
- 상세 화면을 현재 날씨·단기 예보·대기질 패널로 재구성
- OpenWeather의 `icon` 코드로 도시별 현재 날씨 이미지 출력
- 맑음·구름·비와 기온을 조합해 카드와 상세 화면의 색상 자동 변경
- 상세 현재 날씨 카드에 맑음·흐림·비 상태별 반복 배경 영상 적용
- 서울·부산·수원·인천·대구·대전·광주·제주의 대표 이미지를 로컬 자산으로 추가
- 대표 도시 사진 위에 API에서 받은 현재 날씨 정보를 함께 표시

## 날씨 조합별 화면 표현

API의 한글 설명만 비교하지 않고 `weather[0].main`의 영문 분류와 원본 섭씨 기온을 함께 사용했다.

- 맑음 + 더움: 주황·노랑
- 구름 + 더움: 탁한 주황·회색
- 비 + 더움: 습한 청록·코랄
- 비 + 선선함: 짙은 파랑
- 구름 + 선선함: 푸른 회색

카드의 큰 배경 이미지는 8개 도시의 특징이 보이도록 생성한 로컬 이미지이며, 현재 날씨 아이콘은 OpenWeather 응답의 `icon` 코드로 구성했다.

```js
`https://openweathermap.org/img/wn/${icon}@2x.png`
```

```text
assets/cities/
├── seoul.png
├── busan.png
├── suwon.png
├── incheon.png
├── daegu.png
├── daejeon.png
├── gwangju.png
└── jeju.png
```

## 화면 구성

```text
공통 헤더
├── Weather Flow 브랜드
├── 날씨·즐겨찾기·서비스 소개 메뉴
└── 섭씨·화씨 Switch

메인
├── 검색 Hero 영역
├── 실시간 날씨 카드 Grid
└── 선택 도시 안내

상세
├── 현재 기온 요약
├── 3시간 간격 Forecast
└── PM10·PM2.5·AQI
```

## 트러블슈팅 (직접 구현하면서 겪은 문제)

### Element Plus를 설치했는데 태그만 나오고 디자인이 적용되지 않은 문제

라이브러리만 설치하고 CSS를 불러오지 않아 컴포넌트 모양이 적용되지 않았다. `element-plus/dist/index.css`를 `main.js`에 import해 해결했다.

### 과제 7 화면을 만들었는데 계속 과제 6이 출력된 문제

폴더만 복사하고 `main.js`의 Router와 `App.vue`의 UnitToggler import가 과제 6 경로로 남아 있었다. 두 경로를 모두 `07-weather-ui-library`로 변경했다.

### 검색창의 입력값이 부모 상태에 반영되지 않은 문제

`el-input`은 기존 input의 `@input` 처리와 전달 값이 달랐다. `:model-value`와 `@update:model-value`를 사용해 `update-query` emit으로 부모에 전달했다.

### Switch를 눌렀는데 Store 단위가 바뀌지 않은 문제

Switch의 boolean 값과 Store의 `celsius`, `fahrenheit` 문자열을 그대로 연결하려 했다. Switch 변경 이벤트에서는 기존 `toggleUnit()` action을 호출하고 현재 Store 값을 boolean으로 비교했다.

### UI Library를 적용하면서 기존 카드 클릭 기능이 같이 실행된 문제

Element Plus 버튼도 클릭 가능한 카드 안에 있으므로 이벤트가 카드로 전달됐다. 즐겨찾기와 상세보기 버튼에 `.stop`을 유지해 카드 선택과 버튼 기능을 분리했다.

### 화면을 넓혔더니 모바일에서 카드가 너무 작아진 문제

데스크톱의 2열·5열 grid를 작은 화면에도 그대로 적용했다. media query에서 날씨 카드는 1열, Forecast는 2열 후 1열로 변경했다.

### 날씨 설명만 비교해서 색상이 제대로 바뀌지 않은 문제

`lang=kr` 때문에 `온흐림`, `실비`처럼 설명이 다양하게 들어와 한글 문자열 비교가 일정하지 않았다. API의 `main` 값인 `Clear`, `Clouds`, `Rain`, `Drizzle`을 기준으로 테마를 나누고 기온 조건을 추가했다.
