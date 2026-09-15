# Developer Prompt ER

개발 질문의 빈틈을 익살스러운 담당의 소견과 구체적인 수정 처방으로 알려 주는 LangChain 기초 학습 프로젝트입니다. 필요한 정보를 입력칸에 채워 질문을 완성하고, 같은 모델의 원본/개선 답변을 비교합니다.

제출용 파일은 `Developer_Prompt_ER.ipynb`입니다. 설명, 독립 실행 코드, 실제 예제 출력과 UI를 포함합니다. VS Code에서는 `.venv` 커널을 선택하고 노트북과 같은 작업 폴더에 `.env`를 두세요.

사용 기술: Python 3.10 이상, LangChain, OpenAI (`gpt-4o-mini`, temperature 0.2), Pydantic, Gradio, python-dotenv.

## LangChain Flow

User Prompt → Diagnosis Chain → Pydantic Structured Output → Improved Prompt
→ 번호별 보완 정보 입력 및 반영 → 사용자 최종 편집 → RunnableParallel → Original / Improved Response
→ Comparison Chain → Structured Output → Gradio

`app.py`에서 `ChatPromptTemplate | model`, `with_structured_output()`,
`StrOutputParser()`와 `RunnableParallel`의 연결을 확인할 수 있습니다.
점수 합계와 최종 승자는 Python에서 계산합니다. 점수표는 노트북의 과제 확인용 출력에 남기고, UI에는 담당의 소견·수정 처방·답변의 실제 변화와 남은 한계를 보여 줍니다. 개념 질문에 불필요한 코드/환경 정보는 누락으로 보지 않습니다.

## 실행 방법

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
cp .env.example .env
```

`.env`의 `OPENAI_API_KEY`를 실제 키로 수정한 뒤 실행하세요. 실제 키는 Git에 올리지 않습니다.

```bash
python app.py
```

터미널에 표시되는 로컬 주소(기본 `http://127.0.0.1:7860`)를 엽니다.
키가 없으면 화면에 설정 안내가 표시되고 모델 요청은 실행하지 않습니다. 키 변경 후 앱을 재시작하세요.

1. 개발 질문 입력 → **응급실에 질문 접수하기** 클릭
2. 처방의 원문 인용·입력 지시·보완 효과를 읽고, 같은 번호의 입력칸에 실제 정보를 작성
3. **보완 내용으로 질문 완성하기** 클릭 → 초안의 해당 자리에 입력값 반영 (추가 API 호출 없음)
4. 최종 질문을 직접 다듬거나 복사 → **질문 전후, 답변이 달라졌을까?** 클릭

보완 버튼은 진단 초안으로 질문을 다시 만들므로 최종 문장 편집은 반영 후 진행하세요. 입력칸을 다시 바꿨다면 먼저 반영해야 비교할 수 있습니다. 미입력 항목을 남겨도 비교는 가능하며, 새 정보 없이 비교했다는 안내가 표시됩니다.

두 답변 모두 같은 모델·temperature·답변 양식(핵심 답변 / 근거와 확인할 점 / 다음 행동)을 사용합니다. 재검 소견은 실제 답변의 차이와 남은 한계를 설명합니다.

원본 Prompt를 바꾸면 다시 진단하세요. 진단은 모델 1회, 비교는 모델 3회를 호출하므로 API 사용 요금이 발생합니다.
비교 결과는 LLM 평가이며 코드 실행이나 기술 정확도 검증이 아닙니다.
