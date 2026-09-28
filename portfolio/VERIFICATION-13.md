# 13장 포트폴리오와 추가 프로젝트 검증 · 2026-09-28

[HTML 열기](./index.html) · [GOLABA 슬라이드](./review/latest-07-golaba.png) · [HONBOT 슬라이드](./review/latest-08-honbot.png) · [RC 슬라이드](./review/latest-09-rc.png)

`node portfolio/build.mjs`로 별도 웹 서버 없이 여는 단일 HTML을 다시 만들었습니다. 결과는 **13장, 2,319,224바이트**입니다. 표지, 경험·교육·수상, 9개 프로젝트, 마지막 감사 인사와 연락처로 구성합니다.

브라우저에서 13장과 프로젝트 제목 9개가 나타나고, 모든 이미지가 로드되는 것을 확인했습니다. GOLABA·HONBOT·RC 슬라이드의 내용은 경계를 넘지 않았습니다. 각 하단 링크는 이 저장소의 `projects/golaba`, `projects/honbot`, `projects/line-tracing-car`로 연결됩니다. 마지막 장에는 전체 저장소 URL, 전화번호 010-8062-1757, 이메일 jhn17577@gmail.com을 표시합니다. 위 세 장은 실제 렌더링을 캡처해 확인했습니다.

| 이번 추가 실행본 | 복사한 저장소에서 재검증한 API·데이터 테스트 | 별도 실제 실행 검증 |
|---|---:|---|
| [GOLABA](../projects/golaba/README.md) | 8개 통과 | 브라우저 신청→보완→승인과 SQLite 상태 대조 |
| [HONBOT](../projects/honbot/README.md) | 11개 통과 | 로컬 Qwen 실제 답변, 근거 이동, 복습 저장·재시도 |
| [RC 주행 데이터](../projects/line-tracing-car/README.md) | 10개 통과 | 브라우저 ZIP 업로드·프레임 조회, 합성 시험 데이터 CNN 학습·저장·추론 |

총 29개 API·데이터 테스트가 통과했습니다. 각 테스트의 입력, 데이터 출처, 구현 범위는 링크한 프로젝트 README와 VERIFICATION 파일을 참고하세요. GOLABA의 지원사업은 합성 예시이며 사전 검토는 규칙 기반입니다. RC 공개 샘플 3장은 조회용이고 실제 차량 성능 자료가 아닙니다. HONBOT의 답변 예시는 로컬 모델의 한 번의 실행 결과입니다.

기존 6개 프로젝트의 검증 기록은 [이전 검증 문서](./VERIFICATION.md)에 남아 있습니다.
