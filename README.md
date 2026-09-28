# 장현진 포트폴리오

사용자의 조작이 **API 요청·데이터 저장·재조회**로 이어지는 9개 프로젝트를 정리했습니다. AI 기능은 검색, 계산, 생성, 사용자의 확인 단계를 나누어 연결하고, 실행 근거와 구현 제약을 함께 기록했습니다.

[Figma 참고자료](https://www.figma.com/slides/BtEeOASUuWzEkWpycXmhEb) · [13장 포트폴리오 HTML](./portfolio/index.html) · [실행 검증 기록](./portfolio/VERIFICATION-13.md) · [GitHub 프로필](https://github.com/KR-Nom)

## 대표 서비스

| 프로젝트 | 해결하려는 문제와 서비스 흐름 | 구현 구성 |
|---|---|---|
| [Order Balance](./LLM/order-balance/web/) | 재고·판매·예산을 함께 보고 발주 초안 생성 → 수량 조정 → AI 설명 확인 → 확정·CSV 출력 | 웹 UI · FastAPI · SQLite · 제약 기반 계산 · 로컬 Qwen |
| [DocLens](./LLM/rag/web/) | PDF를 추가하고 질문 → 관련 페이지 검색 → 답변과 출처 확인 → 질의 이력 조회 | 웹 UI · FastAPI · E5 임베딩 · FAISS · Qwen · SQLite |
| [ToonVoice](./projects/toonvoice/) | 웹툰 이미지 → 한국어 OCR → 대사·인물·목소리·속도 편집 → WAV 생성·내보내기 | 웹 UI · FastAPI · SQLite · macOS Vision/음성 엔진 |
| [HowToDo](./WebService/) | 공통 협업 프로필과 팀별 역할·목표를 분리하고, 초대·팀 보드·공개범위를 관리 | Vue 3 · Node.js · SQLite · 쿠키 세션 · 팀 권한 |
| [CourtCast](./WebService/Court/) | 공공 테니스장 검색 → 공식 예약상품 확인 → 날씨·현장 제보 비교 → 즐겨찾기 저장 | 웹 UI · FastAPI · SQLite · 서울 공공데이터 · Open-Meteo |
| [SKALA Shop](./Spring/Online-shoppingmall/) | 상품 선택 → 포인트 주문 → 취소, 재고·주문 내역·판매순위를 함께 반영 | HTML/JavaScript · Spring Boot · JPA · H2 파일 DB |
| [GOLABA](./projects/golaba/) | 지원사업 신청 → 규칙 기반 서류 점검 → 보완 제출 → 담당자 승인 | HTML/JavaScript · FastAPI · SQLite 작업 큐 |
| [HONBOT](./projects/honbot/) | 강의 시청 중 질문 → 해당 시점 근거로 AI 답변 → 북마크·복습·학습 피드백 | HTML/JavaScript · FastAPI · SQLite · 로컬 Qwen |
| [RC 주행 데이터 스튜디오](./projects/line-tracing-car/) | 카메라 이미지·조향·스로틀 값 조회와 업로드 → 세션별 CNN 학습·추론 | HTML/JavaScript · FastAPI · SQLite · TensorFlow |

각 링크의 README에 실행 명령, 데이터 출처, 저장 위치와 현재 제한을 적었습니다. 서버와 DB가 필요한 서비스이므로 GitHub에서 HTML 파일만 열면 전체 기능이 실행되는 방식은 아닙니다. ToonVoice의 OCR·음성 생성은 macOS에서 실행합니다.

## 추가 프로젝트의 구현 범위

이번에 [GOLABA](./projects/golaba/)·[HONBOT](./projects/honbot/)·[RC 주행 데이터 스튜디오](./projects/line-tracing-car/)를 별도 실행본으로 추가했습니다. 과거 프로젝트 경험과 이번 구현은 각 README에서 구분합니다. [GOLABA 원본 MSA 자료](./MSA/)의 Kafka·서비스별 DB 설계는 새 로컬 실행본의 SQLite 작업 큐와 구분합니다. RC 원본 차량의 펌웨어·실물 주행 성능은 이번 데이터 도구에서 검증하지 않았습니다.

제출용 [13장 HTML](./portfolio/index.html)에는 경험·교육·수상, 9개 프로젝트, 마지막 연락처와 전체 GitHub 주소를 담았습니다. 프로젝트 하단 URL은 위 실행 코드의 폴더로 연결됩니다. Figma는 초기 설계 참고자료이며 HTML의 최신 13장 구성과 동기화되지 않을 수 있습니다.

## 기존 경험과 이번 구현

| 프로젝트 | 기존 작업·학습 자료 | 이번 포트폴리오에서 추가·검증한 부분 |
|---|---|---|
| Order Balance | 발주 에이전트 역할·프롬프트 설계, CrewAI 노트북과 합성 CSV 실행 기록 | 계산을 분리한 웹 검토 흐름, 수량 검증, 로컬 AI 설명, 확정 상태, SQLite 이력, CSV 출력 |
| DocLens | pypdf 추출·청크 분할·임베딩·FAISS 기반 문서 QA 실습 | PDF 업로드, 로컬 임베딩·생성모델 연결, 문서·벡터·질의 이력 저장, 페이지별 근거 표시 |
| ToonVoice | 사용자 제공 이력: 2024.08 Deep Dive 프로젝트 우수상, 시각장애인을 위한 웹툰 텍스트 추출·TTS 연계 서비스 개발 | 기존 경험을 바탕으로 새 ToonVoice 웹 UI·FastAPI·SQLite·macOS OCR/음성·WAV·파형 구현·검증 |
| HowToDo | Vue 화면, MSW API 계약, OpenAPI·논리 DBML | 실제 Node API·SQLite·비밀번호 해시·세션·팀별 권한·공개범위 처리 |
| CourtCast | 기존 화면 자료와 서비스 구상 | 서울 공식 시설 데이터·날씨 호출·캐시·제보·즐겨찾기를 연결한 신규 서비스 |
| SKALA Shop | Spring REST·JPA와 주문·취소·재고·포인트 처리 | 파일 H2 지속성, 비밀번호 해시, 주문 화면 동기화와 실제 실행 검증 |
| GOLABA | 지원사업 플랫폼의 백엔드 경계·이벤트·데이터 계약 검토 | 합성 공고·신청·규칙 점검·보완·담당자 승인 UI/API/SQLite 작업 큐 |
| HONBOT | 영상 챗봇의 ChatGPT API 연동 학습 | 자체 제작 강의 영상·시점별 Q&A·로컬 모델 호출·질문/복습 DB |
| RC 주행 데이터 | 3D 프린팅 차체·조이스틱 주행·CNN 학습 경험 | 공개 이미지·조작값 검토와 ZIP 수집, 세션 분리 CNN 학습·추론 도구 |

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
| GOLABA | API·DB 통합 테스트 **8개**. 접수→보완→승인, 작업 큐 복구·권한과 모바일 확인 |
| HONBOT | API·DB 통합 테스트 **11개**. 로컬 Qwen의 실제 답변, 근거·복습 저장과 오류 후 재시도 확인 |
| RC 주행 데이터 | 데이터·API 테스트 **10개**. 합성 시험 입력으로 1 epoch TensorFlow 학습·모델 저장·추론 확인 |

서로 다른 종류의 검증을 단일 성능 점수로 합산하지 않았습니다. 테스트 명령과 공개된 코드 근거는 [최신 검증 안내](./portfolio/VERIFICATION-13.md)와 각 프로젝트 README에 연결했습니다. 실제 AI 화면은 [Local AI Runtime](./projects/local-ai-runtime/README.md)의 Qwen3 1.7B 4-bit와 multilingual-e5-small을 사용했습니다. 확인한 답변·설명은 각각 단일 사례이며 정확도 벤치마크가 아닙니다.

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

[13장 HTML](./portfolio/index.html)을 내려받아 브라우저에서 확인할 수 있습니다. HTML 편집·PDF 저장 방법은 [사용 안내](./portfolio/README.md)를 참고하세요.

API 키·비밀 설정·실행 DB·세션·가상환경·의존성 다운로드 파일은 공개 소스에서 제외합니다. 각 서비스는 로컬 실행과 포트폴리오 검증 범위이며, 공개 운영에 필요한 인증·운영 설정은 프로젝트별 README에서 구분했습니다.
