# ToonVoice — 웹툰 보이스 스튜디오

웹툰 이미지를 업로드하고 한국어 말풍선을 읽은 뒤, 대사·등장인물·목소리·속도를 편집해 WAV 오디오로 내보내는 로컬 웹 앱입니다. FastAPI와 SQLite, macOS의 Vision 및 음성 엔진을 연결했습니다.

## 기존 경험과 이번에 확장한 범위

사용자가 제공한 최신 이력에 따르면, **2024년 8월 수도권 ICT이노베이션스퀘어 Deep Dive 프로젝트 우수상**을 받은 프로젝트에서 시각장애인을 위한 AI 웹툰 음성 안내 서비스를 개발했습니다. 당시 경험은 웹툰 이미지의 텍스트 추출과 TTS 연계입니다. [프로필 근거와 최신 제공 이력](../../portfolio/profile-evidence.md)에 함께 정리했습니다.

이 저장소의 **ToonVoice 웹 UI·FastAPI·SQLite·macOS OCR/음성 엔진 연결은 이번 포트폴리오에서 새로 구현·검증한 확장**입니다. 당시 수상 프로젝트의 원본 코드를 복원한 것은 아니며, 현재 스택과 테스트 결과를 2024년 구현·성과로 소급하지 않습니다.

- PNG·JPG·WebP 업로드 → Apple Vision의 실제 한국어 OCR
- 말풍선별 대사 추출 → 텍스트·등장인물·시스템 목소리·읽기 속도 편집
- 대사별 WAV 생성 → 0.35초 쉼을 넣은 전체 WAV 내보내기
- 실제 PCM 샘플로 계산한 파형, 브라우저 미리듣기
- SQLite 프로젝트·대사·음성 파일 정보 저장과 재조회

## 실행 환경

- macOS, Python 3.10 이상, Xcode Command Line Tools의 `swiftc`
- macOS 기본 도구 `/usr/bin/say`, `/usr/bin/afconvert`
- 설치된 한국어 시스템 음성: `Yuna` 기본, `Eddy (한국어(한국))`, `Flo (한국어(한국))` 선택
- `say -v '?'`에서 한국어 음성 설치 여부를 확인할 수 있습니다. OCR과 TTS는 다른 운영체제에서 실행되지 않습니다.
- 외부 API 키는 필요하지 않습니다. 이미지와 대사는 로컬 엔진에서 처리합니다.

```bash
cd projects/toonvoice
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python -m uvicorn app:app --host 127.0.0.1 --port 8312
```

브라우저에서 [http://127.0.0.1:8312](http://127.0.0.1:8312)를 엽니다. `index.html`을 직접 여는 방식과 GitHub Pages에서는 백엔드 작업을 실행할 수 없습니다. 첫 OCR 실행은 Swift 인식 도구를 로컬에서 컴파일하므로 이후 실행보다 오래 걸립니다.

## 사용 순서

1. **예제로 시작** 또는 **이미지 가져오기**를 누릅니다.
2. **말풍선 읽기**를 누르면 OCR 대사가 표시됩니다.
3. 대사와 등장인물을 확인하고 목소리·읽기 속도를 정합니다.
4. **변경 저장** 후 **전체 음성 생성**을 누릅니다. 저장 전 생성 버튼을 누르면 변경을 먼저 저장합니다.
5. 대사별 또는 전체 재생으로 확인하고 **WAV 내보내기**로 받습니다.
6. 새로고침하거나 프로젝트를 다시 선택해도 저장한 내용과 오디오를 불러옵니다.

예시 웹툰은 직접 생성한 그림이며, 텍스트가 없는 원본 말풍선에 예제 대사를 HTML로 배치해 캡처했습니다. 실제 OCR 입력은 `assets/sample-ocr.png`, 재현용 화면은 `assets/sample-source.html`입니다.

## 저장 구조와 API

기본 저장 위치는 `data/`입니다. `TOONVOICE_DATA_DIR` 환경변수로 별도 로컬 경로를 지정할 수 있습니다. 이 폴더는 Git에서 제외됩니다.

```text
data/
  toonvoice.sqlite3
  images/
  audio/
  engine/
```

| API | 기능 |
| --- | --- |
| `GET /api/health` | 로컬 엔진·설치된 한국어 음성 확인 |
| `GET, POST /api/projects` | 프로젝트 목록·생성 |
| `POST /api/projects/sample` | 예제 프로젝트 생성 |
| `GET /api/projects/{id}` | 저장된 대사·오디오 조회 |
| `POST /api/projects/{id}/image` | 이미지 업로드 |
| `POST /api/projects/{id}/ocr` | 한국어 OCR |
| `PUT /api/projects/{id}/lines` | 대사·인물·음성·속도 저장 |
| `POST /api/projects/{id}/synthesize` | 대사별·전체 WAV 생성 |
| `GET /api/projects/{id}/export?download=true` | 전체 WAV 다운로드 |

API 문서는 서버의 `/docs`에서 확인할 수 있습니다. 음성 파일은 24kHz, 16-bit mono PCM WAV입니다.

## 검증

```bash
.venv/bin/python -m unittest discover -s tests -v
node --check assets/studio.js
```

통합 테스트는 모의 OCR·음성 응답을 사용하지 않습니다. 임시 폴더에서 실제 엔진을 실행하고 종료 시 테스트 데이터를 정리합니다.

- 한국어 말풍선 2개 인식과 인식 문자열 확인
- 대사·등장인물·속도 저장 후 비어 있지 않은 WAV 생성
- 파일 헤더·샘플레이트·채널·음성 파형 검증
- 새 앱 인스턴스에서 SQLite 재조회와 WAV 바이트 일치 확인
- 잘못된 이미지, 오래된 수정 버전, 허용되지 않은 목소리, 다른 출처의 요청 거부

실제 통합 검사 2개를 통과했습니다. 브라우저에서도 이미지 업로드 → OCR → 대사·속도 수정 → 저장 → 음성 생성 → 재생 → 다운로드 → 새로고침 후 복원을 확인했습니다. 테스트 음성은 합성 예제 대사이며 성우 녹음이나 모델 성능 평가가 아닙니다.

## 입력 제한과 현재 범위

- 로컬 주소에만 바인딩하며 다른 호스트·외부 출처의 변경 요청을 거부합니다. 인터넷 공개용 인증·배포 서비스는 아닙니다.
- 최대 12MB·1,600만 화소, 최소 가로·세로 100px의 PNG·JPEG·WebP를 실제 이미지 디코더로 검증하고 PNG로 다시 저장합니다.
- 파일 이름은 서버에서 생성합니다. 시스템 도구는 셸 없이 고정 실행 파일과 인자 목록으로 호출하며 음성 이름·속도도 검증합니다.
- 프로젝트당 최대 40개 대사, 대사당 500자, 전체 6,000자입니다.
- OCR은 위에서 아래로 읽고 가까운 행을 합칩니다. 복잡한 말풍선 순서·화자 식별·의성어 분류는 자동 확정하지 않으므로 사용자가 확인해야 합니다.
- 등장인물 이름은 사용자가 지정하는 라벨입니다. 감정 연기·성우 음성 복제·자동 화자 인식은 구현하지 않았습니다.
- 대사를 수정하면 기존 오디오 연결을 무효화하고 다시 생성합니다. 이전 파일은 로컬 `data/`에 남으며 자동 정리 기능은 없습니다.

기술 참고: [FastAPI 파일 업로드](https://fastapi.tiangolo.com/tutorial/request-files/), [Apple Vision 텍스트 인식](https://developer.apple.com/documentation/vision/vnrecognizetextrequest).
