# 포트폴리오 실행 검증

대표 6개 서비스의 구현 범위와 실행 근거를 구분한 기록입니다. 테스트 개수는 이 저장소 제작 과정에서 확인한 실행을 기준으로 하며, 모델 품질이나 운영 성능의 점수가 아닙니다.

[전체 프로젝트](../README.md) · [Figma 발표자료](https://www.figma.com/slides/BtEeOASUuWzEkWpycXmhEb) · [포트폴리오 HTML](./index.html)

## 검증 현황

| 서비스 | 확인한 검사 | 확인한 사용자 흐름 | 별도 범위 |
|---|---|---|---|
| [HowToDo](../WebService/) | 실제 HTTP·SQLite **12개 통과** | 로그인 → 프로필 저장 → 미리보기 → DB 일치, 팀 보드 표시 | 운영 배포 검증 아님 |
| [SKALA Shop](../Spring/Online-shoppingmall/) | Gradle **18개 통과**, 실제 HTTP·파일 DB·재시작 **7개 통과** | 가입·로그인 → 2개 주문 → 1개 취소 → 포인트·재고·주문·순위 동기화 | 실제 결제·대량 동시 주문 검증 아님 |
| [CourtCast](../WebService/Court/) | API **7개 통과** | 검색 → 즐겨찾기 → 제보 → DB 확인 → 재시작 후 재조회 | 시설은 공식 데이터 수집 시점의 스냅샷, 예보와 현장 제보 구분 |
| [ToonVoice](../projects/toonvoice/) | 실제 OCR·음성 엔진 통합 **2개 통과** | 이미지 → OCR → 대사 수정 → WAV 생성·다운로드 → 재조회 | macOS 실행, OCR 순서·화자 지정은 사용자 확인 |
| [Order Balance](../LLM/order-balance/web/) | 계산·수량·예산·상태·CSV **7개 통과** | 초안 생성 → 수량 수정 → 저장·재조회 → 로컬 AI 설명의 숫자 대조 | 합성 데이터 단일 사례, 외부 OpenAI 경로 미검증 |
| [DocLens](../LLM/rag/web/) | 입력·청크 처리 **4개 통과** + 실제 모델 종단간 확인 | NIST PDF → E5·FAISS 검색 → Qwen 답변 → 원문·DB 대조 → 재시작·다운로드 | 단일 질문 원문 대조, 정확도 벤치마크 아님 |

## HowToDo

- [실행 방법과 구현 범위](../WebService/README.md)
- [API 검증 JSON](../WebService/report-assets/full-stack/api-verification.json)
- [브라우저 검증 JSON](../WebService/report-assets/full-stack/browser-verification.json)
- [검증 코드](../WebService/server/server.test.mjs) · [실행 스키마](../WebService/server/schema.sql)

임시 SQLite 파일과 실제 서버 프로세스로 검사했습니다. `x-user-id` 위조 거부, 비밀번호 해시·세션, 이메일 중복, 팀 참여·소유자 권한, 역할 순위, 프로필 공개범위, 잘못된 입력의 부분 저장 방지, Origin 검사, 실제 프로세스 재시작 지속성, 팀 삭제의 관계 정리, 로그아웃 세션 폐기를 확인했습니다.

브라우저에서는 실제 프로필 편집 폼으로 PATCH 200 → GET 200을 확인하고 SQLite 저장값과 비교했습니다. MSW 서비스워커가 없는 상태이며, 데스크톱 1440px·모바일 390px에서 가로 넘침이 없었습니다.

```bash
cd WebService
npm run test:api
npm run build
```

## SKALA Shop

- [실행 방법과 이번 추가 범위](../Spring/Online-shoppingmall/README.md)
- [Gradle 결과 JSON](../Spring/Online-shoppingmall/report-assets/full-stack/gradle-verification.json)
- [실제 HTTP·재시작 결과 JSON](../Spring/Online-shoppingmall/report-assets/full-stack/persistence-verification.json)
- [브라우저 결과 JSON](../Spring/Online-shoppingmall/report-assets/full-stack/browser-verification.json) · [최종 UI 재확인](../Spring/Online-shoppingmall/report-assets/full-stack/final-ui-recheck.json)
- [지속성 검증 코드](../Spring/Online-shoppingmall/scripts/verify-persistence.py)

18개는 기존 통합 테스트 15개와 새 비밀번호 해시 테스트 3개입니다. 별도 임시 H2 파일에서 실제 HTTP로 무선마우스 2개를 주문해 **970,000 P·재고 8개**, 1개를 취소해 **985,000 P·재고 9개**를 확인했습니다. 프로세스를 종료·재시작한 후 회원 로그인·주문 1개·재고 9개·순판매량 1개가 유지되고, 초기 상품 13개가 중복 생성되지 않았습니다.

브라우저 폼과 버튼으로 같은 흐름을 조작했으며, 마지막 재확인에서는 선택 상품과 최근 본 상품의 재고가 모두 9개로 일치했습니다. JWT 서명키는 검증 실행 시 메모리에서 새로 생성했고 결과 파일에 기록하지 않았습니다.

```bash
cd Spring/Online-shoppingmall
# JWT_SECRET은 로컬 실행 환경에 설정
./gradlew test bootJar
python3 scripts/verify-persistence.py
```

## CourtCast

- [실행 방법·검증 설명·공식 데이터 출처](../WebService/Court/README.md)
- [API 검증 코드](../WebService/Court/tests/test_api.py)
- [실행 검증 JSON](../WebService/Court/evidence/verification.json)
- [수집·가공 근거](../WebService/Court/data/provenance.json)

공식 시설 seed, 검색, 제보 저장·조회·작성자 삭제, 즐겨찾기 세션 격리·중복 처리, 입력 검증, 외부 출처 쓰기 거부, 날씨 TTL·실패 시 캐시·캐시 없는 오류, 예약상품 연결을 검사했습니다. 브라우저에서 저장한 제보·즐겨찾기·날씨 캐시의 재시작 지속성도 확인했으며 검수용 제보는 삭제했습니다.

실행 기록의 시설 수는 공식 예약상품을 장소로 묶은 결과이며, 서울 전체 테니스장 수나 물리적 코트 수를 뜻하지 않습니다.

```bash
cd WebService/Court
python -m unittest discover -s tests -v
```

## ToonVoice

- [실행 환경·검증 설명](../projects/toonvoice/README.md)
- [실제 엔진 통합 검증 코드](../projects/toonvoice/tests/test_pipeline.py)
- [실행 검증 JSON](../projects/toonvoice/evidence/verification.json)

macOS Vision으로 한국어 말풍선을 인식하고 시스템 음성 엔진으로 실제 WAV를 생성했습니다. 대사·인물·속도 저장, WAV 헤더·24kHz·mono·파형, 새 앱 인스턴스에서 SQLite 재조회와 WAV 바이트 일치, 잘못된 입력·수정 버전·목소리·출처 거부를 두 통합 검사 안에서 확인했습니다. 모의 OCR·음성 응답으로 대체한 검사가 아닙니다.

브라우저에서도 업로드 → OCR → 편집 → 저장 → 음성 생성 → 재생·다운로드 → 새로고침 후 복원을 확인했습니다. 테스트와 브라우저의 검사 범위는 실행 JSON에 나누어 기록했습니다.

```bash
cd projects/toonvoice
python -m unittest discover -s tests -v
node --check assets/studio.js
```

## Order Balance

- [실행 방법과 계산 규칙](../LLM/order-balance/web/README.md)
- [계산·API 검증 코드](../LLM/order-balance/web/test_app.py)
- [브라우저·DB·API 검증 JSON](../LLM/order-balance/web/evidence/verification.json)

예산, 발주 배수·최소·최대 수량, 잘못된 수정의 원자성, 확정 상태 변경 금지, CSV 입력·내보내기 검사를 실행했습니다. 공개 합성 CSV를 사용한 기본 계산은 **9개 후보·181,560원**이며 실제 매장의 성과 지표가 아닙니다. 브라우저에서 SKU003을 24→18개로 바꾼 뒤 저장·새로고침 후 유지됨을 확인했습니다.

최신 테스트는 7개이며, 최소수량을 주문 배수로 올리는 계산과 CSV 수식 이스케이프의 회귀 검사를 포함합니다. 로컬 `mlx-community/Qwen3-1.7B-4bit`가 생성한 설명에서 **발주 181,560원·잔액 318,440원·위험 상품 24개/48개**를 Python 계산값과 대조했습니다. 이 단일 실행은 입력 271·출력 86 tokens, 1,211ms를 기록했습니다. 평균 응답 시간이나 모델 정확도 지표가 아닙니다.

과거 CrewAI 노트북의 토큰·호출 기록을 현재 웹서비스 실행값으로 사용하지 않습니다. 외부 OpenAI 경로는 이번 실행에서 인증 실패로 완료 검증하지 않았으며, 위 설명과 대표 화면은 로컬 모델의 실제 실행입니다.

```bash
cd LLM/order-balance/web
python -m unittest test_app -v
```

## DocLens

- [실행 방법과 구현 범위](../LLM/rag/web/README.md)
- [입력·청크 검증 코드](../LLM/rag/web/test_app.py)
- [실제 모델·DB·재시작 검증 JSON](../LLM/rag/web/evidence/verification.json)

4개 검사는 비 PDF·손상 PDF·존재하지 않는 문서의 질의 처리와 페이지·겹침을 유지하는 청크 분할에 관한 것입니다. 이와 별도로 [NIST AI RMF 1.0 공식 PDF](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.100-1.pdf) **48페이지를 128청크로 처리**하고 `intfloat/multilingual-e5-small` 임베딩 → FAISS 검색 → 로컬 `mlx-community/Qwen3-1.7B-4bit` 답변 → SQLite 저장을 실제 실행했습니다.

“NIST AI RMF의 핵심 기능 네 가지”라는 질문에 생성한 GOVERN·MAP·MEASURE·MANAGE를 첫 인용 출처인 **PDF 25페이지**와 대조했습니다. 답변과 SQLite 저장값 일치, 서버 재시작 후 문서 유지, 유효한 원본 PDF 다운로드도 확인했습니다. 이 단일 질문에서 1,049ms, 입력 1,250·출력 32 tokens를 기록했습니다.

답변 한 건의 원문 대조 결과이며 일반적인 정확도·환각 방지 성능을 입증하지는 않습니다. 개발 과정에서 근거가 부족한 부연을 발견해 질문 범위 안에서 짧게 답하도록 지침을 좁혔고, 사용자가 원문을 계속 확인할 수 있도록 페이지 인용을 제공합니다. 외부 OpenAI 경로는 이번 실행에서 인증 실패로 완료 검증하지 않았습니다.

```bash
cd LLM/rag/web
python -m unittest test_app -v
```

## 해석할 때의 범위

Order Balance와 DocLens의 모델 실행 환경은 [Local AI Runtime](../projects/local-ai-runtime/README.md)에 정리했습니다. 모델 파일은 공개 저장소에 포함하지 않으며, 설치·실행 조건은 해당 안내를 따릅니다.

현재 기록은 로컬 개발 환경에서의 기능 검증입니다. 운영 부하·장시간 안정성·모델 정확도·비용 절감률을 입증하는 수치가 아닙니다. 기존 학습 자료, 이번에 추가한 서비스 코드, 외부 공식 데이터, 합성 예시 데이터의 출처와 범위는 프로젝트별 README에서 구분합니다.
