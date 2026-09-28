# DocLens — PDF 근거 질의응답

기존 pypdf·FAISS RAG 실습을 PDF 업로드, 문서 선택, 질의·답변·페이지별 출처, 이력 저장이 가능한 웹 서비스로 확장했습니다. 이번 웹·API·SQLite 확장은 AI 개발 도구의 도움을 받아 구현했습니다.

## 실행

```sh
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
# OPENAI_API_KEY는 로컬 환경변수 또는 .env로 설정
python -m uvicorn app:app --host 127.0.0.1 --port 8311
```

`http://127.0.0.1:8311`에서 PDF를 추가하고 질문합니다. API 문서는 `/docs`에 있습니다. `state/`에는 원본 PDF와 SQLite가 저장되며 GitHub에는 업로드하지 않습니다.

외부 키 없이 실행하려면 먼저 [Local AI Runtime](../../../projects/local-ai-runtime/README.md)을 8320에서 실행한 뒤 다음을 사용합니다.

```sh
AI_PROVIDER=local python -m uvicorn app:app --host 127.0.0.1 --port 8311
```

로컬 모드는 `multilingual-e5-small`(384차원)과 Qwen3 1.7B 4-bit를 사용합니다. 임베딩 요청은 64개 이하로 나누고, 질문/본문에 각각 query:/passage: 접두사를 붙입니다. 저장한 문서의 임베딩 모델과 현재 모델이 다르면 409 응답으로 재업로드를 안내합니다.

## 구조

- PDF 텍스트를 페이지별 추출 → 1,200자/180자 겹침 청크
- `text-embedding-3-small` → 정규화된 벡터를 SQLite BLOB에 저장
- 질문 벡터와 FAISS `IndexFlatIP` 내적 검색 → 상위 4개 원문
- 근거 문맥만 제공해 한국어 답변 생성 → 원문·페이지 링크를 병렬 표시
- 질문·답변·출처·입출력 토큰·소요 시간 저장, 다시 열면 최신 답변 조회

검색 유사도는 답변 정확도 점수가 아닙니다. 페이지 인용과 원문을 함께 제공해 검색 결과의 적절성과 생성 답변의 충실도를 따로 확인할 수 있게 했습니다. 문서 내부의 지시는 모델에 실행 지시로 전달하지 않도록 시스템 지침에서 구분합니다.

## 공개 검증 문서

[NIST AI Risk Management Framework 1.0](https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-ai-rmf-10), [공식 PDF](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.100-1.pdf)를 사용합니다. 문서의 출처는 NIST이며, 이 저장소의 작성자가 만든 자료가 아닙니다. PDF 원본은 저장소에 재배포하지 않습니다.

API 구현 참고: [OpenAI 임베딩 가이드](https://developers.openai.com/api/docs/guides/embeddings), [텍스트 생성 가이드](https://developers.openai.com/api/docs/guides/text), [FastAPI 파일 업로드](https://fastapi.tiangolo.com/tutorial/request-files/).

## 검증과 범위

```sh
pip install httpx
python -m unittest test_app -v
```

비 PDF·손상 PDF 거부, 존재하지 않는 문서 질의 거부, 페이지·겹침 유지 등 4개 검증을 실행했습니다. [실제 모델 검증 기록](./evidence/verification.json)에서 NIST PDF 48페이지→128청크, 한국어 질문→로컬 E5·FAISS 검색→Qwen 답변→SQLite 저장을 확인할 수 있습니다. 답변에 나온 GOVERN·MAP·MEASURE·MANAGE는 실제 인용한 PDF 25페이지와 대조했습니다. 단일 질문에서 관찰한 1,049ms·입력 1,250/출력 32 tokens이며 평균 성능이나 정확도 평가가 아닙니다.

개발 중 긴 답변을 강제했을 때 근거가 부족한 추가 설명을 확인해 질문 범위 내 1~3문장으로 지침을 좁혔습니다. 이는 일반적인 환각 제거를 보장하지 않으며, 사용자가 실제 원문과 답변을 대조하도록 UI에서 출처를 계속 제공합니다. OpenAI 경로는 이번 실행에서 기존 키 인증 실패로 완료 검증하지 않았고, 대표 화면은 로컬 모델의 실제 실행입니다.

로컬 단일 사용자용입니다. 텍스트 PDF(5MB·60페이지·추출 본문 180,000자 이하)를 지원하며 스캔 PDF의 OCR은 별도 처리해야 합니다. 공개 문서로 검증하고, 민감한 문서를 외부 모델에 전송하려면 해당 문서의 사용 권한과 서비스 정책을 별도로 확인해야 합니다. 다중 사용자 인증·문서별 권한·작업 큐는 운영 확장 과제입니다.
