# QuizFlash

macOS 14+ 전용 Swift 메뉴바 앱. 문제와 네 개의 보기를 한 번 지정한 뒤 **Option + Space**를 누르면 저장 영역을 캡처하고, OpenAI 응답의 첫 `1`~`4`를 화면 오른쪽 위에 표시합니다. 답안 클릭은 사용자가 직접 합니다.

## 빌드·실행

Swift 6 이상의 도구와 macOS SDK가 필요합니다. Xcode 또는 최신 Command Line Tools를 사용합니다. 외부 패키지는 없습니다.

```bash
cd Answer
./scripts/build-app.sh
open build/QuizFlash.app
```

`build/QuizFlash.app`은 로컬 실행용 ad-hoc 서명 앱입니다. Dock 아이콘 없이 메뉴바에 `QF`가 표시됩니다. 터미널 로그를 함께 보려면 중복 실행하지 말고 아래 명령으로 실행합니다.

```bash
./build/QuizFlash.app/Contents/MacOS/QuizFlash
```

이 Mac에는 전체 Xcode가 없어 `xcodebuild`를 사용할 수 없습니다. 프로젝트는 Swift Package Manager로 빌드하고 스크립트가 앱 번들을 구성·서명합니다. Xcode가 설치된 환경에서는 `Package.swift`를 열어 코드를 편집할 수 있고, 실행용 번들은 같은 스크립트로 만듭니다.

## 첫 설정

1. `QF → Settings…`에서 API 키를 입력하고 **Keychain에 저장**을 누릅니다.
2. `Set Capture Region`을 선택합니다. 최초에는 **화면 캡처 권한** 허용이 필요합니다.
3. **시스템 설정 → 개인정보 보호 및 보안 → 화면 및 시스템 오디오 녹음**에서 QuizFlash를 허용합니다. macOS 버전에 따라 항목명이 **화면 기록**일 수 있습니다. 시스템이 요구하면 앱을 완전히 종료 후 재실행합니다.
4. `Set Capture Region`을 다시 선택해 **문제 + 위에서 아래로 배열된 보기 네 개**를 드래그합니다. 매초 바뀌는 타이머는 제외합니다. `Esc` 또는 우클릭으로 취소합니다.
5. 원래 브라우저에서 **Option + Space**를 누릅니다. `Ask Now`도 같은 동작입니다.

### 참고 PDF 사용

`Settings… → PDF 등록…`에서 강의자료 PDF를 선택하면 파일을 한 번 OpenAI에 업로드하고 Vector Store로 색인합니다. 이후 요청은 캡처 이미지를 읽은 뒤 해당 PDF를 우선 검색하여 답합니다. PDF가 없으면 기존 Image Only 모드로 동작합니다.

- 등록에는 API 키와 인터넷 연결이 필요하며, 큰 PDF는 색인에 시간이 걸릴 수 있습니다.
- 설정에 표시된 `PDF 사용 중` 상태에서만 PDF가 답변에 사용됩니다.
- `PDF 해제`는 로컬 연결을 즉시 제거하고 원격 Vector Store와 파일 삭제도 요청합니다.
- Vector Store는 마지막 사용 후 30일이 지나면 자동 만료되도록 생성됩니다.
- 스캔 이미지로만 이루어진 PDF는 텍스트 PDF보다 검색 정확도가 낮을 수 있습니다.

캡처 선택은 메뉴를 연 모니터(포인터가 있는 화면)에서 진행합니다. 위치와 크기는 UserDefaults에 저장합니다. 모니터를 재배치해도 디스플레이 내부 좌표를 사용하며, UUID로 연결 대상을 확인합니다. 모니터의 해상도·배율 설정으로 논리 크기가 바뀌면 영역을 다시 지정해야 합니다. 여러 화면을 가로지르는 단일 영역은 지원하지 않습니다.

키 입력이나 결과 표시를 위해 Accessibility/Input Monitoring 권한을 요청하지 않습니다. 화면 캡처 권한 요청은 사용자가 실행한 초기 설정에서만 발생하며, 단축키 경로는 권한 팝업을 띄우지 않습니다.

## 환경변수 API 키

`OPENAI_API_KEY`가 있으면 Keychain보다 우선합니다. Finder로 연 앱은 터미널의 환경변수를 보통 상속하지 않으므로, 환경변수 방식은 같은 셸에서 실행 파일을 직접 실행하세요. 아래는 키를 셸 히스토리에 쓰지 않는 zsh 예시입니다.

```zsh
read -rs 'OPENAI_API_KEY?OpenAI API Key: '
export OPENAI_API_KEY
echo
./build/QuizFlash.app/Contents/MacOS/QuizFlash
unset OPENAI_API_KEY
```

키는 소스, UserDefaults, 로그에 저장하지 않습니다. 설정에서 입력한 키만 로그인 Keychain에 저장합니다. Keychain 인증창은 자동으로 띄우지 않으며, 잠겼거나 접근 승인이 필요한 경우 설정에 오류를 표시합니다. 로그인 키체인을 잠금 해제하거나 환경변수 방식을 사용하세요. ad-hoc 앱을 재빌드한 뒤 기존 Keychain 항목 접근이 거부되면 Keychain Access에서 **QuizFlash OpenAI API Key** 항목의 접근 설정을 확인해야 할 수 있습니다.

## 모델과 요청

- 기본 모델: `gpt-5.6-luna`. `Settings… → Model → 적용`으로 변경합니다.
- `POST https://api.openai.com/v1/responses`, `reasoning.effort: none`, `max_output_tokens: 16`, `stream: true`, `store: false`.
- 이미지 입력과 `none` reasoning을 지원하는 모델을 사용해야 합니다. 다른 모델로 자동 대체하지 않습니다.
- PDF를 등록한 경우 모델이 `file_search`도 지원해야 합니다.
- 이미지는 최대 너비 1344px, JPEG 품질 0.84, `detail: high`입니다. 캡처·JPEG 파일은 디스크에 만들지 않습니다.
- 하나의 메모리 전용 URLSession을 재사용합니다. 첫 출력 숫자가 오면 해당 스트림만 취소하고 바로 렌더링합니다.
- 숫자 없는 정상 응답에는 `?`를 표시하고 **같은 이미지로 한 번만 재시도**합니다. HTTP·인증·연결 오류는 자동 재시도하지 않습니다.
- 연타하면 기존 요청을 취소하고 최신 UUID의 결과만 표시합니다. Space를 누른 채 유지하는 키 반복은 무시합니다.

선택 영역의 이미지는 답 요청 시 OpenAI에 전송됩니다. `store: false`는 Responses 저장 옵션이며, 서비스의 데이터 처리 정책 전체를 바꾸는 설정은 아닙니다. 수업·퀴즈 서비스가 허용하는 범위에서 사용하세요.

확인한 공식 문서: [Responses 생성](https://developers.openai.com/api/reference/cli/resources/responses/methods/create), [이미지 입력](https://developers.openai.com/api/docs/guides/images-vision), [스트리밍](https://developers.openai.com/api/docs/guides/streaming-responses), [GPT-5.6 Luna](https://developers.openai.com/api/docs/models/gpt-5.6-luna).

## 결과와 오류

결과 패널은 앱을 활성화하지 않으며 마우스 입력을 통과시킵니다. 약 2.5초 후 숨겨집니다. 패널이나 영역 선택이 표시되는 동안에만 `Esc`를 임시 전역 단축키로 등록합니다. 이 짧은 구간에는 원래 앱 대신 QuizFlash가 `Esc`를 처리합니다. 설정 창을 열기만 해서는 앱이 활성화되지 않으며, 입력란을 직접 클릭하면 키를 입력할 수 있습니다.

| 표시 | 확인할 사항 |
| --- | --- |
| `KEY` | API 키 누락·형식·인증·접근 권한 |
| `API` | 모델 접근, 지원 파라미터, 사용 한도, 서버 상태 |
| `NET` | 인터넷 연결, 네트워크 차단, 타임아웃 |
| `?` | 저장 영역·화면 권한·모니터 변경·빈 응답·잘못된 응답 |

상세 상태는 터미널 또는 Console.app에서 `com.quizflash.app`으로 필터링해 확인합니다. 서버 응답 본문, 키, 캡처 내용은 로그에 출력하지 않습니다. `Option + Space` 등록이 다른 앱 단축키와 충돌하면 메뉴에 표시됩니다. 다른 앱의 해당 단축키를 변경하거나 `Ask Now`를 사용할 수 있습니다.

## 지연시간 측정

성공한 요청마다 `ContinuousClock`으로 T0~T5를 측정합니다.

| 구간 | 의미 |
| --- | --- |
| Capture · T0→T1 | 단축키 콜백부터 캡처 완료까지 |
| Preprocess · T1→T2 | JPEG 리사이즈·압축 완료까지 |
| Request setup · T2→T3 | base64·JSON 구성과 요청 준비 |
| API/model · T3→T4 | 요청 시작부터 첫 유효 출력 숫자 수신까지 |
| Render · T4→T5 | UI 전달과 AppKit 그리기 제출까지 |
| TOTAL · T0→T5 | 전체 파이프라인 |

T5는 `displayIfNeeded`와 Core Animation flush 뒤의 **앱 렌더 제출 시간**입니다. 실제 모니터 픽셀이 켜진 시각은 측정하지 않습니다. 재시도는 첫 요청 T3부터 마지막 T4까지 포함합니다. 취소·실패 요청은 평균에 넣지 않습니다.

`QF → Show Latency`를 켜면 마지막 TOTAL과 **최근 최대 20건 평균**을 메뉴에서 확인할 수 있습니다. 설정에서도 확인 가능하며 기록은 메모리에만 있습니다. 로그 작업은 T5 이후 백그라운드에서 수행합니다. 첫 호출에는 캡처 준비·DNS·TLS 비용이 포함될 수 있으므로 반복 요청의 평균도 함께 보세요.

## 검증

```bash
./scripts/test.sh
./scripts/build-app.sh
./build/QuizFlash.app/Contents/MacOS/QuizFlash --smoke-test
```

테스트는 Apple Swift Testing과 URLProtocol 모의 응답을 사용합니다. 파싱, SSE 분할, Responses JSON, 네트워크 취소, HTTP 오류, 세션 재사용, 좌표·Retina 변환, JPEG 크기, 최신 요청 보호, 최근 20건 계산을 검증합니다. 테스트의 지연시간 값은 합성 데이터이며 실제 모델 속도가 아닙니다.

2026-09-18 검증 결과(macOS 26.5.2, Apple Silicon, Swift 6.3.3):

- Release 빌드 및 앱 번들 `codesign --verify --strict` 성공. 바이너리의 최소 OS는 macOS 14.0입니다.
- **29개 자동 테스트, 3개 suite 모두 통과**했습니다. 기존 검증에 PDF `file_search` 요청과 multipart 업로드 형식 검증을 추가했습니다.
- 번들 앱 실행 검사: 결과 패널 표시, 비활성 상태, 전면 앱 유지, 자동 숨김, 단축키 등록, 영역 선택과 설정 창의 포커스 유지 모두 통과했습니다.
- 화면 권한 preflight는 `false`, 빌드 셸에 `OPENAI_API_KEY`도 없었으므로 실제 화면 캡처·API 왕복·정답 정확도·TOTAL 실측은 실행하지 않았습니다.
- 로그인 Keychain의 인증창 차단에 사용하는 호환 API는 SDK에서 deprecated 경고를 내지만 빌드는 성공합니다. 실제 사용자 Keychain 저장·읽기는 자동 검증에서 수행하지 않았습니다.

`--smoke-test`는 결과 패널·자동 숨김·영역 선택 패널·설정 창의 비활성 표시와 단축키 등록을 확인한 뒤 종료합니다. 화면 캡처, Keychain 읽기, 외부 요청, 답안 클릭은 수행하지 않습니다. 화면 권한은 요청 없이 preflight 결과만 출력합니다.

실제 화면→모델→정답의 지연시간과 정확도, 여러 모니터·전체 화면 앱에서의 실제 사용은 API 키와 화면 권한이 있는 환경에서 확인해야 합니다.

## 구현 범위와 파일

이번 버전은 기본 **Image Only**와 선택형 **Image + PDF**를 지원합니다. OCR과 자동 감지는 추가하지 않았습니다. PDF가 등록된 경우에만 `file_search`가 사용되므로 불필요한 PDF 검색 호출은 발생하지 않습니다.

```text
Sources/QuizFlash/
  QuizFlashApp.swift               메뉴바·앱 생명주기·요청 제어
  CaptureManager.swift             디스플레이 좌표·캡처·JPEG
  RegionSelectionController.swift  비활성 드래그 선택
  HotKeyManager.swift              Carbon Option+Space·임시 Esc
  OpenAIClient.swift               Responses SSE·취소·오류
  PDFKnowledgeClient.swift         PDF 업로드·Vector Store 색인·정리
  AnswerOverlayController.swift    비활성 정답 패널
  LatencyTracker.swift             T0~T5·최근 20건·UUID 보호
  Settings.swift                   SwiftUI 설정·UserDefaults·Keychain
Tests/QuizFlashTests/              실제 API 없이 실행하는 테스트
Resources/Info.plist               macOS 14+·LSUIElement
scripts/build-app.sh               release 빌드·번들·로컬 서명
scripts/test.sh                    Swift Testing 실행
```
