# 장현진 포트폴리오

사용자의 조작이 **API 요청·데이터 저장·재조회**로 이어지는 6개 서비스를 정리했습니다. AI 기능은 검색, 계산, 생성, 사용자의 확인 단계를 나누어 연결하고, 실행 근거와 구현 제약을 함께 기록했습니다.

[Figma 발표자료](https://www.figma.com/slides/BtEeOASUuWzEkWpycXmhEb) · [포트폴리오 HTML](./portfolio/index.html) · [실행 검증 기록](./portfolio/VERIFICATION.md) · [GitHub 프로필](https://github.com/KR-Nom)

## 대표 서비스

| 프로젝트 | 해결하려는 문제와 서비스 흐름 | 구현 구성 |
|---|---|---|
| [Order Balance](./LLM/order-balance/web/) | 재고·판매·예산을 함께 보고 발주 초안 생성 → 수량 조정 → AI 설명 확인 → 확정·CSV 출력 | 웹 UI · FastAPI · SQLite · 제약 기반 계산 · 로컬 Qwen |
| [DocLens](./LLM/rag/web/) | PDF를 추가하고 질문 → 관련 페이지 검색 → 답변과 출처 확인 → 질의 이력 조회 | 웹 UI · FastAPI · E5 임베딩 · FAISS · Qwen · SQLite |
| [ToonVoice](./projects/toonvoice/) | 웹툰 이미지 → 한국어 OCR → 대사·인물·목소리·속도 편집 → WAV 생성·내보내기 | 웹 UI · FastAPI · SQLite · macOS Vision/음성 엔진 |
| [HowToDo](./WebService/) | 공통 협업 프로필과 팀별 역할·목표를 분리하고, 초대·팀 보드·공개범위를 관리 | Vue 3 · Node.js · SQLite · 쿠키 세션 · 팀 권한 |
| [CourtCast](./WebService/Court/) | 공공 테니스장 검색 → 공식 예약상품 확인 → 날씨·현장 제보 비교 → 즐겨찾기 저장 | 웹 UI · FastAPI · SQLite · 서울 공공데이터 · Open-Meteo |
| [SKALA Shop](./Spring/Online-shoppingmall/) | 상품 선택 → 포인트 주문 → 취소, 재고·주문 내역·판매순위를 함께 반영 | HTML/JavaScript · Spring Boot · JPA · H2 파일 DB |

각 링크의 README에 실행 명령, 데이터 출처, 저장 위치와 현재 제한을 적었습니다. 서버와 DB가 필요한 서비스이므로 GitHub에서 HTML 파일만 열면 전체 기능이 실행되는 방식은 아닙니다. ToonVoice의 OCR·음성 생성은 macOS에서 실행합니다.

## 기존 경험과 이번 구현

| 프로젝트 | 기존 작업·학습 자료 | 이번 포트폴리오에서 추가·검증한 부분 |
|---|---|---|
| Order Balance | 발주 에이전트 역할·프롬프트 설계, CrewAI 노트북과 합성 CSV 실행 기록 | 계산을 분리한 웹 검토 흐름, 수량 검증, 로컬 AI 설명, 확정 상태, SQLite 이력, CSV 출력 |
| DocLens | pypdf 추출·청크 분할·임베딩·FAISS 기반 문서 QA 실습 | PDF 업로드, 로컬 임베딩·생성모델 연결, 문서·벡터·질의 이력 저장, 페이지별 근거 표시 |
| ToonVoice | 새로 구성한 웹툰 보이스 스튜디오 UI 콘셉트 | 실제 OCR·시스템 음성·WAV·파형·SQLite 연결 |
| HowToDo | Vue 화면, MSW API 계약, OpenAPI·논리 DBML | 실제 Node API·SQLite·비밀번호 해시·세션·팀별 권한·공개범위 처리 |
| CourtCast | 기존 화면 자료와 서비스 구상 | 서울 공식 시설 데이터·날씨 호출·캐시·제보·즐겨찾기를 연결한 신규 서비스 |
| SKALA Shop | Spring REST·JPA와 주문·취소·재고·포인트 처리 | 파일 H2 지속성, 비밀번호 해시, 주문 화면 동기화와 실제 실행 검증 |

이번 서비스 확장은 **AI 코딩 도구의 도움을 받아 구현·검증**했습니다. 새로 추가한 서버·DB·엔진 연결을 과거 프로젝트의 완료 실적으로 소급하지 않습니다. 기존 노트북의 결과 수치와 현재 웹서비스의 실행 기록도 구분합니다.

## 확인한 실행 범위

| 서비스 | 현재 확인한 검증 |
|---|---|
| HowToDo | 실제 HTTP·SQLite 테스트 **12개**. 브라우저 프로필 저장·DB 일치와 서버 프로세스 재시작 지속성 |
| SKALA Shop | Gradle 테스트 **18개** + 실제 HTTP·파일 DB·프로세스 재시작 확인 **7개**. 브라우저 주문·취소 |
| CourtCast | API 테스트 **7개**. 검색·제보·즐겨찾기·날씨 캐시와 브라우저 저장·재시작 |
| ToonVoice | 실제 macOS OCR·음성 엔진을 실행하는 통합 테스트 **2개**. 브라우저 편집·WAV 생성·재조회 |
| Order Balance | 계산·수량·예산·확정 상태·CSV 테스트 **7개**. 브라우저 수정·저장·재조회와 로컬 AI 설명의 금액·수량 대조 |
| DocLens | 입력·청크 검증 **4개** + 실제 NIST PDF 48페이지 검색·답변·원문 대조·DB 저장·재시작·다운로드 확인 |

서로 다른 종류의 검증을 단일 성능 점수로 합산하지 않았습니다. 테스트 명령과 공개된 JSON·코드 근거는 [VERIFICATION.md](./portfolio/VERIFICATION.md)에 연결했습니다. 실제 AI 화면은 [Local AI Runtime](./projects/local-ai-runtime/README.md)의 Qwen3 1.7B 4-bit와 multilingual-e5-small을 사용했습니다. 확인한 답변·설명은 각각 단일 사례이며 정확도 벤치마크가 아닙니다. 외부 OpenAI 경로는 이번 실행에서 인증 실패로 완료 검증하지 않았습니다.

## 이전 실습과 참고 자료

대표 서비스를 만들며 참고한 학습·설계 자료를 함께 보존합니다. 아래 자료 모두가 현재 대표 서비스에 완성된 기능으로 포함된다는 뜻은 아닙니다.

| 분야 | 자료 |
|---|---|
| AI 파이프라인 | [Order Balance 노트북·CSV](./LLM/order-balance/) · [RAG 실습](./LLM/rag/) · [Developer Prompt ER / LangChain](./Langchain/) |
| 모델 학습 | [Text-to-SQL · LoRA](./sLLM/) · [CNN 학습 비교](https://github.com/KR-Nom/skala-python-deep-learning) |
| 클라이언트·API 연결 | [QuizFlash](./Answer/) · [Weather Flow](./Vue/skala-vue/src/components/practices/HandsOn/) · [HONBOT·자율주행 경험 설명](./projects/ai-experience/) |
| 데이터·운영 | [GOLABA 설계](./MSA/) · [3-tier 게시판](./workspace/Day2/) · [매출 EDA](https://github.com/KR-Nom/skala-python-day2) · [PostgreSQL 튜닝](./DB/종합실습3/) · [AIOps 화면 설계](./projects/aiops/) |
| 이전 프론트엔드 | [HowToDo의 Vue·MSW 단계 기록](./WebService/README.frontend-history.md) · [CourtCast 원래 화면 갤러리](./WebService/Court/index.html) |

## 포트폴리오 열기

[Figma 발표자료](https://www.figma.com/slides/BtEeOASUuWzEkWpycXmhEb)에서 전체 흐름을 보고, [HTML](./portfolio/index.html)을 내려받아 브라우저에서 확인할 수 있습니다. HTML 편집·PDF 저장 방법은 [사용 안내](./portfolio/README.md)를 참고하세요.

API 키·비밀 설정·실행 DB·세션·가상환경·의존성·빌드 파일은 공개 소스에서 제외합니다. 각 서비스는 로컬 실행과 포트폴리오 검증 범위이며, 공개 운영에 필요한 인증·운영 설정은 프로젝트별 README에서 구분했습니다.
