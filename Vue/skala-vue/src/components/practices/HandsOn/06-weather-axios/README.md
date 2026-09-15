# 과제 6: 날씨 Axios

작성일: 2026-08-27 (목)

## 작업 목적

과제 5의 8개 도시, 검색, 선택, 즐겨찾기, Router와 온도 단위 Store를 유지하면서 Mock 날씨를 외부 API의 실제 데이터로 발전시켰다.

- OpenWeatherMap 현재 날씨 API 적용
- OpenWeatherMap 3시간 간격 Forecast API 추가
- Open-Meteo 대기질 API 추가
- 로딩·성공·실패 상태 구분

## 파일 구조

```text
06-weather-axios/
├── api/
│   ├── weatherApi.js          현재 날씨와 단기 예보 요청
│   └── airQualityApi.js       미세먼지와 대기질 요청
├── components/
│   ├── UnitToggler.vue
│   └── WeatherCard.vue
├── data/weatherData.js        8개 도시·좌표·즐겨찾기 상태
├── stores/configStore.js      섭씨·화씨 공통 상태
├── router/index.js
└── views/
    ├── WeatherHomeView.vue    8개 도시의 실제 날씨
    └── WeatherDetailView.vue  현재 날씨·예보·대기질
```

## 실제 구현 순서

### 1. 과제 5를 복사해 과제 6 분리

이전 과제 기능이 빠지지 않도록 `05-weather-store`를 `06-weather-axios`로 복사했다. 새 API 기능은 과제 6 폴더 안에서만 추가했다.

### 2. Axios 설치

```bash
npm install axios
```

Axios는 외부 서버에 HTTP 요청을 보내고 JSON 응답을 객체로 받아오는 역할을 한다.

### 3. Postman으로 현재 날씨 요청 확인

Vue에 연결하기 전에 Postman에서 요청 주소와 응답 구조를 먼저 확인했다.

```text
GET https://api.openweathermap.org/data/2.5/weather
```

| Params | 역할 |
|---|---|
| `lat`, `lon` | 도시 위도와 경도 |
| `appid` | OpenWeatherMap API Key |
| `units=metric` | 섭씨 사용 |
| `lang=kr` | 한글 날씨 설명 |

응답에서 사용한 값:

```js
response.data.main.temp
response.data.main.humidity
response.data.weather[0].description
response.data.wind.speed
```

### 4. API Key를 환경변수로 분리

실제 Key는 Vue 파일에 직접 작성하지 않고 프로젝트 루트 `.env`에 저장했다.

```env
VITE_OPENWEATHER_API_KEY=발급받은_KEY
```

코드에서는 다음처럼 읽었다.

```js
const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY
```

### 5. API 요청 함수를 View와 분리

`weatherApi.js`에서 Axios 요청을 처리하고 View에는 응답 데이터만 반환했다.

```js
const response = await axios.get(WEATHER_URL, {
  params: {
    lat: latitude,
    lon: longitude,
    appid: API_KEY,
    units: 'metric',
    lang: 'kr',
  },
})

return response.data
```

### 6. 8개 도시의 실제 날씨 적용

각 도시에 위도와 경도를 추가하고 메인 화면이 열릴 때 8개 요청을 함께 실행했다.

```js
const apiWeatherList = await Promise.all(
  weatherList.value.map((weather) =>
    fetchCurrentWeather(weather.lat, weather.lon),
  ),
)
```

검색, 선택, 즐겨찾기 기능은 그대로 두고 카드의 `temp`와 `status`만 API 응답으로 변경했다. 요청에 실패하면 기존 Mock 데이터를 표시한다.

실제 여름 기온에서는 모든 도시가 25도 이상으로 표시될 수 있어 상태 라벨을 세 단계로 나눴다.

- 32℃ 이상: 폭염
- 25℃ 이상 32℃ 미만: 더움
- 25℃ 미만: 선선함

화씨로 화면 단위를 변경해도 상태 판단은 API에서 받은 원본 섭씨 값을 기준으로 한다.

### 7. 상세 페이지에 현재 날씨 적용

Router의 `cityId`로 선택한 도시 좌표를 찾고 현재 날씨를 요청했다. 기온, 날씨 설명, 습도와 풍속을 출력하고 과제 5의 섭씨·화씨 Store도 유지했다.

### 8. OpenWeatherMap Forecast API 추가

현재 날씨 API와 별도로 Forecast API를 호출했다.

```text
GET https://api.openweathermap.org/data/2.5/forecast
```

응답의 `list`는 3시간 간격 예보 배열이다. 화면이 너무 길어지지 않도록 앞의 5개만 표시했다.

```js
forecastList.value.slice(0, 5)
```

### 9. 기타 외부 API로 Open-Meteo 적용

OpenWeatherMap 이외의 외부 API로 Open-Meteo Air Quality API를 선택했다. 별도 Key 없이 기존 도시 좌표를 재사용할 수 있고 날씨 대시보드와도 잘 어울렸다.

```text
GET https://air-quality-api.open-meteo.com/v1/air-quality
```

표시한 정보:

- 미세먼지 `PM10`
- 초미세먼지 `PM2.5`
- 미국 대기질 지수 `US AQI`
- AQI 기준 좋음·보통·민감군 주의·나쁨·매우 나쁨

## 로딩과 오류 처리

API 통신 전후의 화면 상태를 구분했다.

```js
isLoading.value = true

try {
  // Axios 요청
} catch (error) {
  // 오류 문구 저장
} finally {
  isLoading.value = false
}
```

OpenWeatherMap과 Open-Meteo의 오류 상태를 분리했다. 대기질 API만 실패했을 때 현재 날씨와 Forecast까지 사라지지 않게 하기 위해서다.

## 트러블슈팅 (직접 구현하면서 겪은 문제)

Postman과 Vue에서 API를 연결하면서 Params 이름을 잘못 입력하거나 JSON의 중첩 위치를 정확히 확인하지 않아 값이 화면에 나오지 않는 문제를 순서대로 해결했다.

### 응답은 성공했는데 온도가 화면에 나오지 않은 문제

처음에는 온도를 `response.data.temp`에서 찾았지만 값이 나오지 않았다. Postman JSON을 다시 확인해 온도가 `main` 객체 안에 있다는 것을 찾고 `response.data.main.temp`로 수정했다.

### 날씨 설명을 읽을 때 오류가 난 문제

`weather`를 객체라고 생각해 `response.data.weather.description`으로 작성했다. 실제 응답은 배열이어서 `response.data.weather[0].description`으로 수정했고, 응답 전에는 값이 없으므로 데이터가 준비된 뒤 template을 렌더링하도록 했다.

### Forecast를 현재 날씨와 같은 구조로 처리해 값이 안 나온 문제

현재 날씨에서 사용한 `response.data.main` 접근을 Forecast에도 그대로 적용했지만 값이 나오지 않았다. Forecast는 `response.data.list` 배열 안에 각 시간의 `main`과 `weather`가 있다는 것을 확인하고 앞의 5개 항목을 반복하도록 수정했다.

### 두 API의 좌표 변수명을 섞어서 요청한 문제

OpenWeatherMap에서 사용한 `lat`, `lon`을 Open-Meteo 요청에도 그대로 넣으려고 했다. Postman에서 확인한 Params를 기준으로 Open-Meteo에는 `latitude`, `longitude`를 전달하도록 API 파일을 따로 분리했다.

### Postman 요청이 `401 Invalid API key`로 실패한 문제

처음에는 Postman 주소창에 현재 날씨 URL과 좌표 URL 두 개를 붙여 넣었다. 이후 기본 URL만 남겼지만 Params가 비어 있어 `appid`가 서버로 전달되지 않았다.

해결 과정:

1. 주소를 `/data/2.5/weather` 하나만 사용했다.
2. `lat`, `lon`, `appid`, `units`, `lang`를 Params에 각각 입력했다.
3. Authorization은 `No Auth`로 두었다.

### 위도를 입력했는데 요청이 잘못된 문제

위도 Key를 `lat`이 아니라 `let`으로 입력했다. Postman 주소에도 `?let=`으로 만들어지는 것을 확인하고 `lat`으로 수정했다.

### 내 API Key가 Active인데도 `401`이 나온 문제

계정 이메일 인증과 Key 상태는 정상이었지만 API 서버에서 바로 인식하지 못했다. 실습에 사용이 허용된 Key로 먼저 기능을 구현하고, 개인 Key가 활성화되면 `.env` 값만 교체할 수 있게 구성했다.

### `.env`에 Key를 넣었는데 Vue에서 읽지 못한 문제

`.env`를 `06-weather-axios` 폴더 안에 만들었다. Vite는 프로젝트 루트의 `.env`를 읽으므로 파일을 프로젝트 최상위로 옮겼다. `.env`를 수정한 뒤에는 개발 서버도 다시 실행해야 한다.

### 현재 날씨와 Forecast의 차이를 구분하기 어려웠던 문제

`/weather`는 현재 시점 한 건을 반환하고 `/forecast`는 앞으로의 3시간 간격 데이터를 `list` 배열로 반환한다. 현재 날씨 응답의 필드를 더 출력하는 것과 별도 Forecast API를 추가하는 것은 다른 작업임을 구분했다.

### API 하나가 실패하면 상세 화면 전체가 사라지는 문제

날씨 API와 대기질 API의 로딩 및 오류 상태를 따로 관리했다. 따라서 Open-Meteo가 실패하더라도 OpenWeatherMap의 현재 날씨와 예보는 계속 확인할 수 있다.

## 실행 흐름

```text
메인 화면 진입
→ 8개 도시 좌표로 현재 날씨 요청
→ 실제 기온과 날씨 카드 출력
→ 상세보기 클릭
→ 현재 날씨 + Forecast 요청
→ Open-Meteo 대기질 별도 요청
→ 상세 날씨·3시간 예보·미세먼지 출력
```
