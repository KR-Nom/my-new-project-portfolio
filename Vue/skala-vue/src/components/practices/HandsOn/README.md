# Vue 날씨 HandsOn

Vue 날씨 과제를 기본 Mockup과 Composition API 확장 단계로 나누어 구현했다.

## 과제 1: 날씨 Mockup

- `ref` 배열에 도시 날씨 데이터 8개 저장
- `v-for`와 `:key`로 날씨 카드 반복 출력
- `v-if`, `v-else`로 25도 기준 더움·선선함 표시
- `v-model`로 검색 input 값 출력
- 카드 선택 상태와 상세보기 alert 구현
- `.stop`으로 버튼과 카드 클릭 이벤트 분리

컴포넌트: `WeatherMockup.vue`
과제 폴더: [01-weather-mockup](./01-weather-mockup/README.md)

## 과제 2: 날씨 Composition

- 과제 1 컴포넌트를 복사해 별도 파일로 확장
- `computed`로 도시 검색 결과 계산
- 검색 결과가 없을 때 안내 문구 출력
- 선택 도시 객체를 spread 문법으로 얕은 복사
- `watch`로 선택 도시의 이전·현재 값 감시
- `watchEffect`로 검색어와 필터 결과 자동 감시
- 개인 기능으로 즐겨찾기 상태·computed·watcher 구현

컴포넌트: `02-weather-composition/WeatherComposition.vue`
상세 작업 기록: [02-weather-composition/README.md](./02-weather-composition/README.md)

## 과제 3: 날씨 Components

- 과제 2의 기능을 유지하면서 역할별 컴포넌트로 분리
- 부모가 모든 반응형 상태와 변경 함수 관리
- props로 부모 데이터를 자식에게 전달
- emits로 자식 이벤트를 부모에게 전달
- `<slot>`으로 공통 대시보드 박스 재사용
- 개인 기능인 즐겨찾기 목록을 추가 컴포넌트로 분리
- 컴포넌트마다 `<style scoped>` 적용

부모 컴포넌트: `03-weather-components/components/WeatherParent.vue`
상세 작업 기록: [03-weather-components/README.md](./03-weather-components/README.md)

## 과제 4: 날씨 Router

- `RouterLink`와 `RouterView`로 페이지 이동 구조 구성
- View 파일에 Lazy Loading 적용
- 상세보기 alert를 `router.push()`로 변경
- `:cityId` 동적 경로에서 도시 Mock Data 조회
- 소개·404 페이지와 Catch-all Route 추가
- 개인 View로 즐겨찾기 도시 목록 분리
- 등록되지 않은 `스칼라뷰` 상세보기로 404 화면 확인

메인 View: `04-weather-router/views/WeatherHomeView.vue`
상세 작업 기록: [04-weather-router/README.md](./04-weather-router/README.md)

## 과제 5: 날씨 Store

- 과제 4의 8개 도시·검색·즐겨찾기·Router 기능 유지
- Pinia Store로 섭씨·화씨 설정 공유
- getter로 단위 이름과 기호 계산
- action으로 단위 변경
- 메인 카드와 상세 화면에 화씨 변환식 적용
- 개인 기능으로 단위 변경 횟수 추가

Store: `05-weather-store/stores/configStore.js`
상세 작업 기록: [05-weather-store/README.md](./05-weather-store/README.md)

## 과제 6: 날씨 Axios

- Axios로 OpenWeatherMap 현재 날씨 API 호출
- 8개 도시의 Mock 기온을 실제 날씨로 변경
- 상세 페이지에 3시간 간격 Forecast API 추가
- Open-Meteo 외부 API로 PM10·PM2.5·대기질 지수 표시
- 로딩·성공·실패 상태 분리
- 기존 검색·즐겨찾기·Router·온도 단위 Store 유지

API 모듈: `06-weather-axios/api/`
상세 작업 기록: [06-weather-axios/README.md](./06-weather-axios/README.md)

## 과제 7: 날씨 UI Library

- Element Plus 설치 및 전역 등록
- 기존 과제 형식에서 벗어난 Weather Flow 대시보드 제작
- Input·Card·Button·Tag·Alert·Skeleton·Switch 적용
- 메인과 상세 화면의 반응형 Grid 구성
- 과제 6의 Router·Store·Axios·Forecast·대기질 기능 유지

상세 작업 기록: [07-weather-ui-library/README.md](./07-weather-ui-library/README.md)
