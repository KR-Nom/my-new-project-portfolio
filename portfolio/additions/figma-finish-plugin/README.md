# 장현진 포트폴리오 Figma 마무리

기존 [장현진 포트폴리오 편집본](https://www.figma.com/slides/BtEeOASUuWzEkWpycXmhEb)에 HONBOT 한 장을 추가하고, 사용자 확인을 받은 경험·교육·수상과 9개 프로젝트 목차를 반영하는 로컬 개발 플러그인입니다. GOLABA와 RC카 자율주행은 이미 있는 슬라이드를 사용합니다.

## 실행 방법

1. **Figma 데스크톱 앱**에서 위 편집본을 엽니다. 파일 편집 권한이 필요합니다.
2. Figma 메뉴에서 **Plugins → Development → Import new plugin from manifest…**를 선택합니다.
3. 이 폴더의 `manifest.json`을 선택합니다. `code.js`도 같은 폴더에 있어야 합니다.
4. **Plugins → Development → 장현진 포트폴리오 마무리**를 실행합니다.
5. 완료 메시지가 뜨면 13장과 목차 9개를 확인합니다. 새 HONBOT 슬라이드가 화면에 표시됩니다.

메뉴 표기는 앱 버전이나 언어에 따라 약간 다를 수 있습니다. 개발 플러그인 등록은 데스크톱 앱에서 진행하는 공식 절차입니다. [Figma 공식 안내](https://help.figma.com/hc/en-us/articles/360042786733-Create-a-classic-plugin-for-development)

## 반영 내용

- 기존 표지와 프로젝트 슬라이드 객체를 유지합니다.
- 경험·교육·수상 장은 사용자가 제공한 최신 이력으로 구성합니다. 이전 레이어는 삭제하지 않고 숨겨 보존하며, 새 내용을 한 개의 전용 프레임으로 추가합니다.
- 최신 수상 이력의 2023년 7월 표기를 사용하며, 과거 자료의 2023년 9월 날짜로 바꾸지 않습니다.
- ToonVoice ROLE을 사용자 확인에 맞춰 **2024 Deep Dive 웹툰 OCR·TTS 프로젝트 + 이번 웹·DB 확장**으로 갱신합니다.
- 목차의 기존 6개 행을 줄이고 같은 형태로 3개 행을 추가합니다.
- 편집 가능한 텍스트·도형으로 HONBOT 슬라이드를 생성합니다.
- 프로젝트 순서는 기존 6개 다음 **07 GOLABA → 08 HONBOT → 09 RC카 자율주행**입니다.
- 자율주행 슬라이드에 공개 저장소 [Hustar-HAI](https://github.com/wotjd0715/Hustar-HAI)의 참고 제어 흐름을 별도로 표시합니다. 참고 구조를 사용자의 실제 구현 이력으로 표현하지 않습니다.
- 3D 프린팅 차체·구입한 구동 부품·제어보드를 설명하는 구성도를 자율주행 장에 추가합니다.
- 전체 GitHub 주소가 있는 마지막 장을 끝에 둡니다.
- 다시 실행해도 HONBOT, 프로필 프레임, RC카 구성도, 목차 행을 중복 생성하지 않습니다. 사람이 추가한 별도 슬라이드나 캔버스 자산은 보존합니다.
- 사용자 HTML 파일은 수정하지 않습니다. 네트워크 호출·API 키·설치 패키지가 필요하지 않습니다.

이 플러그인은 기존 노드 ID와 내용까지 확인하는 해당 편집본 전용 도구입니다. 새 빈 파일이나 다른 포트폴리오에서는 실행을 중단합니다. 수동으로 제목·레이어 구조를 크게 바꾼 경우에도 예상 구조를 찾지 못하면 중단합니다.

## 검증 범위

JavaScript 구문 검사와 로컬 모델에서 최초 실행·재실행·기존 노드 보존을 점검했습니다. 목차 9개 행은 1080 높이 중 1011 지점에서 끝나도록 구성했습니다. 검증 상세는 `verification.json`에 있습니다. Figma 원격 도구의 사용 한도로 실제 Figma 데스크톱에서의 최종 실행은 검증하지 못했습니다. 글꼴은 Noto Sans KR와 Inter를 사용하며 수정 전에 `loadFontAsync`로 불러옵니다.

## 기술 근거

Figma Slides는 `editorType: ["slides"]`와 `createSlide()`를 지원합니다. Auto Layout은 표준 `createFrame()`과 `layoutMode`로 구성합니다. [Slides 플러그인 문서](https://developers.figma.com/docs/plugins/working-in-slides/)

슬라이드 재배치는 `getCanvasGrid()`와 `setCanvasGrid()`를 우선 사용하며 구버전 API로도 동작하도록 구성했습니다. 기존 캔버스 노드를 전부 전달해 사용자의 내용을 유지합니다. [캔버스 재배치 API](https://developers.figma.com/docs/plugins/api/properties/figma-setcanvasgrid/)

`manifest.json`의 식별자는 로컬 개발용입니다. 배포된 Community 플러그인 ID가 아닙니다. Figma의 공식 샘플도 개발용 문자열 식별자를 사용합니다. [공식 Bar Chart 샘플 manifest](https://github.com/figma/plugin-samples/blob/master/barchart/manifest.json)
