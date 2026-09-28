# 추가 슬라이드 시안과 반영 파일

[Figma 편집본](https://www.figma.com/slides/BtEeOASUuWzEkWpycXmhEb) · [반영 상태·구현 범위](../FIGMA-ADDITIONS.md)

| 시안 | 내용 |
|---|---|
| [About me](./about.png) | 사용자가 제공한 최신 경험 3건·교육 4건·수상 5건을 한 장으로 정리 |
| [GOLABA](./golaba.png) | 기존 Vue 앱의 실제 실행 화면과 MSA 설계 경험 |
| [HONBOT](./honbot.png) | 영상 영역·대화 기록·질문·응답 상태를 발전시킨 UI |
| [RC카 자율주행](./driving.png) | 직접 제작·수집·학습 경험과 Hustar-HAI 참고 제어 흐름 |

위 PNG는 네이티브 Figma 설계 소스로 만든 **로컬 검토용 렌더링**입니다. Figma 원격 파일의 최종 캡처가 아닙니다. 원격 도구 한도 때문에 최신 About·HONBOT·RC카 수정·목차·순서 변경은 아직 반영하지 못했습니다. 기존 HTML은 사용자 요청에 따라 10장 버전을 유지합니다.

## 편집본에 적용

[로컬 Figma 플러그인 ZIP](./figma-finish-plugin.zip)을 풀고 [실행 안내](./figma-finish-plugin/README.md)에 따라 해당 편집본에서 실행합니다. HONBOT 추가, About 갱신, 목차 9개와 총 13장 순서, RC카·ToonVoice 설명 갱신을 처리합니다. 기존 슬라이드 객체와 About 원본 레이어는 보존합니다.

플러그인의 구문과 로컬 계약 모델 검사는 통과했습니다. 실제 Figma 데스크톱 실행은 검증하지 못했으며, 실행 후 글꼴·배치 확인이 필요합니다. 네트워크나 API 키는 사용하지 않습니다.

수정 가능한 설계 코드는 [source](./source/), 최신 이력 원문은 [about-data.json](./about-data.json), 검증 범위는 [verification.json](./verification.json)에 있습니다. 이력서·상장 사진·개인 문서 원본은 포함하지 않습니다.
