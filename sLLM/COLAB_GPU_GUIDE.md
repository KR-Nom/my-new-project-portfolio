# VS Code의 Colab 확장으로 GPU 실행하기

이 프로젝트는 두 노트북 모두 CUDA를 사용할 수 있도록 작성되어 있습니다.

## 1. VS Code에서 Colab 커널 연결

1. VS Code에서 이 프로젝트 폴더를 엽니다.
2. `실습_LoRA_SFT_파인튜닝.ipynb`를 엽니다.
3. 노트북 오른쪽 위 `Select Kernel`을 클릭합니다.
4. `Colab` → `Auto Connect`를 선택하고 Google 계정으로 로그인합니다.
5. 연결된 커널의 런타임이 GPU인지 확인합니다.

공식 Colab VS Code 확장은 Jupyter 확장 위에서 동작하며, 위 방식으로 Colab 서버를 노트북 커널로 연결합니다. [공식 사용 안내](https://github.com/googlecolab/colab-vscode)

## 2. GPU 런타임 선택

Colab 메뉴에서 다음 순서로 선택합니다.

`런타임` → `런타임 유형 변경` → `하드웨어 가속기: T4 GPU` → `저장`

무료 Colab에서는 GPU 종류가 달라질 수 있습니다. T4에서도 실행되도록 학습 노트북은 `fp16`을 사용합니다.

## 3. 로컬 데이터 파일을 Colab 런타임에 올리기

탐색기에서 아래 두 파일을 각각 우클릭한 뒤 `Upload to Colab`을 선택합니다.

- `skala_sql_train.jsonl`
- `skala_sql_test.jsonl`

업로드가 끝나면 노트북의 데이터 확인 셀을 실행합니다. 파일이 보이지 않으면 Colab 확장 사이드바의 `/content` 파일 목록에서 업로드 여부를 확인하세요.

## 4. 프로젝트 파일 준비

가장 간단한 방법은 왼쪽 파일 패널에서 다음 파일을 업로드하는 것입니다.

- `실습_sLLM_실행및비교.ipynb`
- `실습_LoRA_SFT_파인튜닝.ipynb`
- `skala_sql_train.jsonl`
- `skala_sql_test.jsonl`

파일을 업로드한 뒤 노트북을 열고, 아래 셀을 가장 먼저 실행합니다.

```python
!nvidia-smi

import torch
assert torch.cuda.is_available(), "GPU 런타임을 선택한 뒤 다시 실행하세요."
print("GPU:", torch.cuda.get_device_name(0))
print("CUDA:", torch.version.cuda)
```

학습 노트북은 데이터 파일이 없으면 자동으로 업로드 창을 표시합니다.

## 5. 실행 순서

### 모델 비교

`실습_sLLM_실행및비교.ipynb`에서 위에서부터 순서대로 실행합니다. 모델을 처음 로드할 때 Hugging Face에서 다운로드하므로 시간이 걸릴 수 있습니다.

### LoRA SFT 파인튜닝

`실습_LoRA_SFT_파인튜닝.ipynb`에서 위에서부터 순서대로 실행합니다. 첫 번째 설치 셀은 다음 라이브러리 버전을 맞춥니다.

```python
!pip install -q transformers==4.56.1 trl==0.23.1 peft==0.17.1 datasets==4.0.0 accelerate==1.10.1
```

학습은 기본 설정으로 `train_size=400`, `epochs=1`, `lora_r=8`을 사용합니다. Colab 무료 GPU에서 메모리 부족이 발생하면 `run_experiment(train_size=100, epochs=1, lora_r=8)`처럼 데이터 수를 줄여 실행하세요.

## 6. GPU가 사용되지 않을 때

- `torch.cuda.is_available()`가 `False`이면 런타임 유형을 다시 확인합니다.
- GPU 런타임을 바꾼 뒤에는 `런타임` → `세션 다시 시작` 후 노트북을 처음부터 실행합니다.
- `!nvidia-smi`에서 GPU 정보가 보이지 않으면 현재 세션에 GPU가 할당되지 않은 상태입니다.
- 모델 다운로드 중 오류가 나면 잠시 후 해당 셀만 다시 실행합니다.

노트북의 모델 로딩 코드는 `device_map="auto"` 또는 `.to("cuda")`를 사용하므로 GPU가 정상적으로 연결되면 모델과 학습 텐서가 CUDA로 이동합니다.
