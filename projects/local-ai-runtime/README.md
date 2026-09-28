# Local AI Runtime

외부 API 키 없이 Apple Silicon에서 공개 생성 모델과 다국어 임베딩을 실행하는 **이번 신규 구현**입니다. 프론트엔드 앱이 기존 OpenAI SDK를 유지하면서 로컬 추론 API를 사용할 수 있게 연결합니다. 실제 모델 추론이며 고정 응답·문자열 규칙·가짜 벡터를 반환하지 않습니다.

| 기능 | 모델·실행 방식 | 라이선스 |
| --- | --- | --- |
| 응답 생성 | [MLX Community Qwen3-1.7B-4bit](https://huggingface.co/mlx-community/Qwen3-1.7B-4bit), 공식 [Qwen3-1.7B](https://huggingface.co/Qwen/Qwen3-1.7B) 기반 | Apache-2.0 |
| 의미 임베딩 | [intfloat 공식 multilingual-e5-small](https://huggingface.co/intfloat/multilingual-e5-small), 공식 ONNX 가중치 | MIT |

임베딩은 실제 마지막 hidden states에 attention mask를 적용한 평균 pooling 후 L2 정규화합니다. 384차원이며 모델의 최대 입력은 512 tokens입니다. 원문 문서에는 passage: 접두사, 검색 질문에는 query: 접두사를 붙입니다. [공식 모델 카드](https://huggingface.co/intfloat/multilingual-e5-small/blob/main/README.md)의 형식을 따랐습니다.

## 준비 및 실행

Apple Silicon macOS와 Python 3.11 이상이 필요합니다. 가상환경과 모델 가중치는 공개 저장소 **밖**에 보관합니다. 아래의 모델 경로는 사용자의 별도 실행 폴더로 바꿀 수 있습니다.

~~~bash
python3.11 -m venv /tmp/portfolio-model-runtime
/tmp/portfolio-model-runtime/bin/python -m pip install -r requirements.txt
/tmp/portfolio-model-runtime/bin/python download_models.py \
  --model-root /tmp/portfolio-public-models

LOCAL_MODEL_ROOT=/tmp/portfolio-public-models \
  /tmp/portfolio-model-runtime/bin/python -m uvicorn provider:app \
  --host 127.0.0.1 --port 8320
~~~

실제 검수 환경은 별도 outputs/portfolio-runtime/public-models 폴더를 사용했습니다. 다운로드 스크립트는 위 공개 모델 저장소에 token=False로 요청하고, HF 캐시를 지정한 폴더 아래에 둡니다. 사용자 .env나 자격증명을 읽지 않습니다. 원격 Python 코드는 내려받지 않고 Qwen tokenizer도 trust_remote_code=False로 로드합니다.

설치·최초 다운로드에 인터넷이 필요하며 **서버 추론은 로컬 가중치만 읽고 외부 생성 API를 호출하지 않습니다.**

## 연결

~~~python
from openai import OpenAI

client = OpenAI(base_url="http://127.0.0.1:8320/v1", api_key="local")

answer = client.chat.completions.create(
    model="mlx-community/Qwen3-1.7B-4bit",
    messages=[{"role": "user", "content": "자료: 캐시는 15분 유지됩니다. 질문: 유지 시간은?"}],
    temperature=0,
    max_tokens=128,
)

vectors = client.embeddings.create(
    model="intfloat/multilingual-e5-small",
    input=["query: 캐시 유지 시간", "passage: 캐시는 15분 유지됩니다."],
)
~~~

local은 SDK가 요구하는 자리표시 문자열이며 외부 인증키가 아닙니다. 서버는 인증 헤더를 읽지 않습니다. /health, /v1/models, /v1/chat/completions, /v1/embeddings, /docs를 제공합니다.

생성 응답 usage는 MLX 생성기의 실제 prompt_tokens/generation_tokens이고, 임베딩 usage는 tokenizer의 실제 attention-mask 유효 토큰 합계입니다. local_metrics.elapsed_seconds는 해당 요청의 실제 경과 시간입니다. 임베딩은 float 및 SDK 기본 base64 응답을 모두 지원합니다.

## 검증

서버 실행 후 다음 명령으로 실제 추론 API를 검증합니다.

~~~bash
python smoke_test.py
~~~

2026-09-28 단일 검수에서 다음을 확인했습니다. 시스템 전체 처리량이나 평균 성능을 의미하지 않습니다.

- Qwen 1.7B 생성: 15분 캐시 문맥에 정확히 응답. 입력 41 / 생성 11 tokens, 0.2337초.
- 한국어 발주 설명: 수량·금액 재계산 및 주문배수 추정 금지 지시와 짧은 사실 문맥에서 실제 세 문장 생성. 입력 222 / 생성 59 tokens, 1.148초. 발주 수량 12→6과 점주의 최종 확인 필요성을 보존했습니다.
- E5 한국어 3문장: 3×384 벡터, 44 tokens, 0.0215초. 관련 문장 cosine 0.891, 비관련 문장 0.741.
- SDK의 기본 base64 임베딩 요청을 자동 해석하여 2×384 벡터를 반환받음.
- 브라우저 /docs 정상 표시, page error 없음.

## 범위

1.7B 모델의 답변 품질은 제한적이며 작은 문맥 기반 학습·기능 검증용입니다. 파인튜닝을 수행한 모델이 아닙니다. 생성은 stream=false, 최대 2,048 출력 tokens와 8,192 입력 tokens를 지원합니다. JSON schema 보장·도구 호출·이미지 입력·Responses API는 구현하지 않았습니다.

임베딩은 한 요청에 64개까지 받으며 내부 8개 batch로 실행합니다. 512 tokens 초과 텍스트는 절단하므로 문서를 먼저 짧게 분할해야 합니다. 임의 모델명은 실제 다른 모델처럼 표시하지 않고 거절합니다. API는 인증 없는 localhost 학습용이며 외부 네트워크로 공개하지 않습니다.

구현은 [MLX LM 공식 문서](https://github.com/ml-explore/mlx-lm), [ONNX Runtime 공식 Python 문서](https://onnxruntime.ai/docs/get-started/with-python.html), 위 공식 모델 카드와 로컬 패키지 API를 참고했습니다. 모델 파일·가상환경·개인 자격증명은 이 저장소에 포함하지 않습니다.
