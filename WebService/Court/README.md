# CourtCast

서울 공공 테니스장을 검색하고 공식 예약상품, 날씨 예보, 사용자 현장 제보를 함께 확인하는 **프론트엔드 + FastAPI + SQLite 서비스**입니다.

2026-09-28에 기존 화면 설계를 바탕으로 **새로 구현**했습니다. 기존 Calgary 중심 UI 갤러리는 [index.html](index.html)과 screenshots 폴더에 보존했습니다. 기존 화면의 합성 날씨·제보와 이번 실제 데이터는 별개입니다.

## 실행

Python 3.11 이상에서 실행합니다.

~~~bash
cd WebService/Court
python -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python -m uvicorn backend.app:app --host 127.0.0.1 --port 8313
~~~

브라우저에서 http://127.0.0.1:8313 을 엽니다. API 명세는 /docs 입니다. 개발 검수에는 저장소 밖 기존 Langchain/.venv를 활용했습니다. API 키·로그인·지도 토큰 없이 동작합니다.

## 구현된 기능

- 공식 테니스장 **36개 장소 그룹**, 연결 예약상품 **336건**을 SQLite에 적재합니다.
- 이름·자치구 검색, 즐겨찾기 필터, 좌표 기반 SVG 위치도와 예약상품별 공식 링크를 제공합니다.
- 익명 브라우저 세션별 즐겨찾기 추가·삭제를 DB에 저장합니다.
- 마른 상태 / 젖음 / 물웅덩이 / 이용 제한과 설명을 제출하면 백엔드 검증 후 DB에 저장·조회합니다. 작성한 브라우저에서 삭제할 수 있습니다.
- 데모 제보는 별도 표시하고 실제 현장 제보 건수에서 제외합니다. 초기 DB에 가짜 사용자·제보·후기·평점·사용 가능 상태를 넣지 않습니다.
- 시설 좌표로 Open-Meteo를 실제 호출하고 **15분 TTL 캐시**를 DB에 저장합니다.
- 정상 호출은 방금 갱신, 유효 캐시는 15분 캐시, 호출 실패 시 마지막 성공값은 이전 캐시로 표시합니다. 캐시도 없으면 오류와 재시도 버튼을 표시합니다.
- 예보 기준 시각·조회 시각·출처를 표시하고 모델 예보와 현장 제보를 구분합니다.
- 1600px 데스크톱 및 390px 모바일 레이아웃을 제공합니다.

## 데이터 출처와 범위

시설 출처: [서울특별시 열린데이터광장 — 서울시 체육시설 공공서비스예약 정보, OA-2266](https://data.seoul.go.kr/dataList/OA-2266/S/1/datasetView.do). **2026-09-28** 공식 JSON 다운로드로 수집했습니다. 이용허락은 **공공누리 제1유형, 출처표시 (상업적 이용 및 변경 가능)**입니다.

다운로드 URL은 POST https://datafile.seoul.go.kr/bigfile/iot/sheet/json/download.do 입니다. 아래는 인증키 없이 제공되는 공식 사이트의 공개 폼입니다. SAMPLE_VIEW는 비밀키가 아닌 공개 폼 고정 문자열입니다.

~~~text
srvType=S
infId=OA-2266
serviceKind=0
pageNo=1
ssUserId=SAMPLE_VIEW
strWhere=
strOrderby=
filterCol=MINCLASSNM
txtFilter=테니스장
~~~

원문 테니스장 예약상품 341건을 장소명+좌표로 묶은 39그룹에서 서울 외 고양시, 좌표 누락, 원문 장소명에 테스트가 포함된 그룹을 제외했습니다. **36개 장소 그룹 및 예약상품 336건**을 저장했습니다. 서울 전체 테니스장 수나 물리적 코트 총수를 뜻하지 않습니다. 접수상태·이용시간은 수집 시점의 상품 정보이며 실제 잔여 시간은 공식 예약 페이지에서 확인합니다.

data/courts.json 및 data/services.json에는 필드명 정규화와 장소 묶음을 적용했습니다. data/provenance.json에 공식 URL·요청·원 다운로드 SHA-256·제외사유·라이선스를 기록했습니다. 전화번호와 긴 원문 설명은 앱 seed에서 제외했습니다. 원본 이미지 URL은 보존했지만 이번 앱에서 불러오지 않습니다.

날씨는 [Open-Meteo 공식 Forecast API](https://open-meteo.com/en/docs)를 사용합니다. 데이터는 [CC BY 4.0](https://open-meteo.com/en/licence)이며 화면에 Weather data by Open-Meteo.com 링크를 표시합니다. [무료 API 이용조건](https://open-meteo.com/en/terms)은 **비상업용**이고 1일 10,000회·시간당 5,000회·분당 600회 미만입니다. 이 앱은 광고·과금 없는 개인 학습용입니다.

[공식 GitHub](https://github.com/open-meteo/open-meteo) 및 [공식 Forecast OpenAPI 명세](https://github.com/open-meteo/open-meteo/blob/main/openapi/forecast.yml)로 요청 형식·필드·출처를 확인했습니다. 소프트웨어는 AGPL-3.0이며 코드를 복제하지 않았습니다. API 데이터 라이선스와 소프트웨어 라이선스는 구분합니다.

위치도는 공식 좌표를 정규화한 자체 SVG이며 외부 지도 타일이나 임의 도로·행정경계를 사용하지 않습니다.

## 구조

~~~text
Court/
  backend/app.py          FastAPI / SQLite / 날씨 캐시
  frontend/               동작하는 HTML·CSS·JavaScript
  data/                   공식 시설·예약상품 seed와 출처
  tests/test_api.py       임시 DB 기반 API 테스트
  runtime/                실행 SQLite DB (Git 제외)
  index.html              기존 정적 화면 갤러리
  screenshots/            기존 화면 자료
~~~

DB 테이블: courts, reservation_services, reports, favorites, weather_cache. COURTCAST_DB 환경변수로 테스트 DB 경로를 지정할 수 있습니다. 익명 쿠키는 HttpOnly/SameSite=Lax이며 DB에는 세션 해시만 저장합니다. DB와 세션 정보는 커밋하지 않습니다.

## 검증

~~~bash
python -m unittest discover -s tests -v
~~~

7개 API 테스트로 실제 seed, 검색, 제보 저장·조회·작성자 삭제, 즐겨찾기 세션 격리·중복 추가, 입력 검증, 타 사이트 쓰기 차단, 날씨 TTL·호출 실패 캐시·캐시 없는 오류, 예약상품 연결을 확인했습니다.

브라우저에서 검색 → 즐겨찾기 → 데모 제보 → SQLite 행 확인 → Uvicorn 종료·재시작 → 재접속까지 수행해 제보·즐겨찾기·날씨 캐시 지속성을 확인했습니다. 검수 제보는 검증 후 작성자 삭제 기능으로 제거했습니다.

## 운영 범위

로컬 학습용이며 예약을 대신 접수하지 않습니다. 시설 원본은 수집일의 스냅샷입니다. 날씨는 네트워크가 있어야 갱신되고 예보 격자 좌표가 시설 좌표와 다를 수 있습니다. 익명 제보의 운영자 검수·신원 확인·대규모 남용 방지는 공개 운영 전 별도 설계가 필요합니다.
