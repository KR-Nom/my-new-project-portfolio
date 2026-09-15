# My New Project — Portfolio

학습과 팀 프로젝트에서 만든 결과물을 분야별로 정리한 저장소입니다. 각 링크에서 구현 범위, 실행 방법, 검증 기록과 한계를 확인할 수 있습니다. 교육 원본·제출 압축본·비밀 설정·생성 파일은 공개 대상에서 제외합니다.

## 대표 프로젝트

| 분야 | 프로젝트 | 대표 내용 |
|---|---|---|
| 웹 서비스 | [HowToDo](./WebService/README.md) | 협업 프로필·팀 보드 Vue 프로토타입, MSW Mock API, OpenAPI·DBML 설계 |
| 백엔드 | [SKALA Shop API](./Spring/Online-shoppingmall/README.md) | 상품·회원·주문 REST API, 재고·포인트 트랜잭션, 통합 테스트 |
| 프론트엔드 | [Weather Flow](./Vue/skala-vue/src/components/practices/HandsOn/README.md) | Vue 날씨 화면을 Composition API부터 API·UI·배포까지 단계별 확장 |
| AI 앱 | [Developer Prompt ER](./Langchain/README.md) | LangChain 구조화 출력과 원본·개선 Prompt 답변 비교 |
| LLM | [Text-to-SQL sLLM](./sLLM/COLAB_GPU_GUIDE.md) | LoRA/SFT 학습과 모델 비교, 재현용 노트북·가이드 |
| MSA | GOLABA 실습 (공개 검토 중) | Spring 서비스, Vue, Eureka, Kafka, MariaDB를 조합한 교육용 MSA. 고정 인증 설정을 정리한 뒤 반영 예정 |
| 인프라 | [3-tier 게시판](./workspace/Day2/docker-compose.yml) | Web·WAS·DB 분리와 Docker Compose 전환 |

## 데이터·실습 프로젝트

| 분야 | 위치 | 내용 |
|---|---|---|
| PostgreSQL | [DB 종합실습](./DB/종합실습4/) | 스키마·시드·쿼리 최적화, 함수·프로시저·트리거 |
| Python·EDA | [Python 프로젝트 모음](https://github.com/KR-Nom?tab=repositories&q=skala-python) | 데이터 처리, 특성공학, 분석 리포트, 딥러닝 모델링 |
| Vue | [Vue 실습](./Vue/skala-vue/) | 기초 문법부터 날씨 대시보드까지 구현 단계 |
| Spring | [Spring 실습](./Spring/) | 쇼핑몰, 주식 거래, 서비스 설정 예제 |

Python 실습 일부는 [Day 1](https://github.com/KR-Nom/skala-python-day1), [Day 2](https://github.com/KR-Nom/skala-python-day2), [Day 3](https://github.com/KR-Nom/skala-python-day3), [EDA](https://github.com/KR-Nom/skala-python-eda-practice), [딥러닝](https://github.com/KR-Nom/skala-python-deep-learning) 저장소에도 독립적으로 공개되어 있습니다.

### HowToDo — 협업 사용설명서

프로필 작성·공개 범위·팀 생성/참여·팀 보드를 연결한 Vue 프로토타입입니다. 화면은 실제 HTTP 요청을 보내고 MSW가 Mock API로 응답하며, OpenAPI와 DBML로 향후 백엔드 연결 지점을 설계했습니다. 데스크톱·모바일 화면과 16:9 발표 HTML을 함께 제공합니다. 실제 인증 서버나 DB 연동은 구현하지 않았습니다.

[코드와 실행 방법](./WebService/README.md) · [데스크톱 화면](./WebService/report-assets/ui-refresh/home-desktop.png) · [모바일 화면](./WebService/report-assets/ui-refresh/home-390.png)

### Developer Prompt ER — 질문 개선 AI 앱

사용자의 개발 질문에서 빠진 맥락을 구조화 출력으로 진단하고, 사용자가 보완 내용을 직접 채운 뒤 원본·개선 질문의 답변을 같은 모델로 비교합니다. 모델 평가의 한계와 API 사용 비용을 문서에 명시했습니다.

[코드와 실행 방법](./Langchain/README.md) · [학습 노트북](./Langchain/1반_장현진_P023.ipynb)

### Text-to-SQL sLLM — 특화 모델 실습

SQL 생성 데이터셋과 LoRA/SFT 학습 노트북, 실행·비교 노트북을 묶었습니다. Colab GPU 실행 순서와 작은 데이터셋에서의 성능 해석 한계를 함께 기록했습니다. 학습 데이터와 실험 결과는 실제 서비스 성능을 보증하지 않습니다.

공개용 비교 노트북은 로컬 경로와 실행 로그가 담긴 출력 셀을 비워 두었습니다. 코드는 그대로이며, 결과는 가이드에 따라 직접 재현할 수 있습니다.

[실행 가이드](./sLLM/COLAB_GPU_GUIDE.md) · [학습 노트북](./sLLM/실습_LoRA_SFT_파인튜닝.ipynb)

### Web·WAS·DB 3-tier 게시판

Nginx Web, Python WAS, PostgreSQL DB를 Docker Compose로 분리했습니다. Day 1 구조에서 Day 2 환경변수·헬스 체크·서비스 간 연결을 보완한 과정을 비교할 수 있습니다.

[Day 1 Compose](./workspace/Day1/docker-compose.yml) · [Day 2 Compose](./workspace/Day2/docker-compose.yml)

### PostgreSQL 종합실습

전자상거래 스키마와 시드 데이터를 기반으로 SQL 분석·인덱스 전후 성능 비교·PL/pgSQL 함수/프로시저/트리거를 실습했습니다. 실제 운영 데이터가 아닌 교육용 데이터입니다.

[쿼리·성능 비교](./DB/종합실습4/Script-12.sql) · [PL/pgSQL 실습](./DB/종합실습4/PLpgSQL_기초_함수_프로시저_트리거_통합실습.sql)

### 1. SKALA Shop API

Spring Boot 기반 온라인 쇼핑몰입니다. 상품·회원·주문 API를 계층형 구조로 구현하고, JWT Cookie 인증과 트랜잭션 기반 주문·취소 흐름을 구성했습니다.

- **기술:** Java 17, Spring Boot 3.3, Spring Data JPA, H2, Gradle, Docker
- **핵심 구현:** 상품·회원 CRUD, 주문/취소, 판매 순위, 재고 부족 조회, 최근 본 상품
- **설계 포인트:** `Controller → Service → Repository` 책임 분리, 전역 예외 처리, 주문과 포인트 변경의 트랜잭션 일관성
- **검증:** 통합 테스트와 Docker 실행 환경 제공

[프로젝트 코드와 실행 방법 보기](./Spring/Online-shoppingmall/README.md)

### 2. Weather Flow

Vue 기본 문법부터 외부 API 연동과 배포까지 한 날씨 대시보드를 8단계로 발전시킨 프론트엔드 프로젝트입니다.

- **기술:** Vue 3, Composition API, Vue Router, Pinia, Axios, Element Plus, Vite
- **핵심 구현:** 도시 검색, 즐겨찾기, 섭씨·화씨 전환, 날씨 예보, 대기질 조회, 반응형 화면
- **학습 흐름:** Mockup → Composition API → 컴포넌트 분리 → Router → Store → API → UI Library → Deployment
- **안정성:** 로딩·빈 결과·API 실패 상태를 분리하고 API Key는 환경변수로 관리

[단계별 구현 내용 보기](./Vue/skala-vue/src/components/practices/HandsOn/README.md)

## 실행 요약

### SKALA Shop API

```bash
cd Spring/Online-shoppingmall
export JWT_SECRET="$(openssl rand -hex 32)"
./gradlew bootRun
```

### Weather Flow

```bash
cd Vue/skala-vue
npm install
npm run dev
```

Weather Flow의 실시간 날씨 조회에는 프로젝트 폴더의 `.env`에 다음 환경변수가 필요합니다.

```dotenv
VITE_OPENWEATHER_API_KEY=your_api_key
```

실제 인증정보, 로컬 환경 파일, 빌드 결과물과 교육 원본 자료는 저장소에서 제외합니다.

## 공개 범위

`LOL`에는 상세 게임 프로필·매치 데이터가 있어 비공개로 유지합니다. `spring-ai`와 별도 `skala-vue` 폴더는 외부/중첩 저장소이므로 이 모노레포에 복사하지 않았습니다. MSA 실습은 고정 DB 인증 설정과 브라우저 측 OAuth 클라이언트 비밀값 처리를 정리하기 전까지 공개 포트폴리오 소스에서 보류합니다. PDF·ZIP·교육 원본과 생성된 빌드 파일 역시 제외합니다.
