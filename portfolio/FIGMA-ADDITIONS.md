# Figma 추가 프로젝트의 근거와 범위

[장현진 Figma 포트폴리오](https://www.figma.com/slides/BtEeOASUuWzEkWpycXmhEb)에 GOLABA, HONBOT, RC카 자율주행을 각각 별도 프로젝트로 추가하는 **13장 완성안**을 준비합니다. 현재 원격 파일은 초기 소개 수정과 GOLABA·초기 자율주행 슬라이드까지 반영된 **12장**입니다.

Figma MCP Starter 호출 한도로 원격 반영이 중단되었습니다. **HONBOT 추가, 사용자가 최신 제공한 소개 12개 항목의 교체, RC카 참고 구조 보완, 목차·마지막 장 순서 정리는 아직 적용 대기**입니다. 준비한 로컬 시안·적용 자료와 원격 파일의 완료 상태를 구분합니다.

사용자 요청에 따라 기존 [HTML](./index.html)은 10장 버전을 유지합니다. 이번 추가 프로젝트·프로필 보완을 HTML 소스에 동기화하지 않으므로 Figma와 HTML은 같은 판본이 아닙니다.

## 프로젝트별 표현 기준

| 프로젝트 | 자료와 역할 | 이번 Figma 반영 | 실제 완료 범위 |
|---|---|---|---|
| [GOLABA](../MSA/) | 로컬 팀 실습 소스·개인 서브노트. 백엔드 영역 담당, 서비스 경계·데이터 계약 검토 | 원본 Vue를 실행한 랜딩 한 화면을 크게 배치. 심사 화면은 공개 보조자료 폴더에 수록 | 프론트엔드 빌드·렌더 확인. 심사 API는 준비 단계이고 전체 AI 심사·서비스별 DB 분리 완료는 아님 |
| [HONBOT](../projects/honbot/) | 사용자가 제공한 영상 챗봇·ChatGPT API 연동 학습 경험 | 영상, 대화 기록, 질문 입력과 대기·응답 상태의 발전 디자인 준비. 원격 추가 대기 | 과거 API 연동 학습 경험과 이번 UI 재구성. 새 영상·음성·AI 서버 구현 검증 아님 |
| [RC카 자율주행](../projects/line-tracing-car/) | 사용자의 조이스틱 수집·CNN 학습·차체 제작 경험과 별도 Hustar-HAI 참고 구조 | 초기 수집·학습·제어 도식은 반영됨. RC카 제목·참고 구조 표시를 더하는 수정안은 원격 적용 대기 | 과거 제작·학습 참여 경험. 원본 주행 로그·펌웨어·성과 수치는 미확인 |

GOLABA의 실제 화면·확인 방법은 [캡처 검증 기록](../MSA/portfolio-evidence/)에서 확인할 수 있습니다. 원본의 교육 템플릿과 지원사업 서비스의 목표 설계를 구분했습니다.

HONBOT의 당시 흐름이 담겼다는 `Untitled` Figma는 URL·내용 확인 전입니다. 현재 디자인을 그 원본의 복원본으로 표현하지 않습니다. 자율주행의 ESP32 세부 모델·서버 위치는 사용자 기억이 불확실하고, LiDAR 역할은 아직 확인되지 않았으므로 확정적인 연결도를 만들지 않습니다.

소개 완성안은 사용자가 최신 제공한 경험 3건·교육 4건·수상 5건을 기준으로 준비합니다. 상세 내용과 이전 자료와의 구분은 [프로필 근거](./profile-evidence.md)에 정리했습니다. 이 최신 소개가 원격 Figma에 이미 적용됐다는 의미는 아닙니다.

## 프로젝트 하단 URL

- GOLABA: https://github.com/KR-Nom/my-new-project-portfolio/tree/main/MSA
- HONBOT: https://github.com/KR-Nom/my-new-project-portfolio/tree/main/projects/honbot
- RC카 자율주행: https://github.com/KR-Nom/my-new-project-portfolio/tree/main/projects/line-tracing-car
- 마지막 장의 전체 프로젝트: https://github.com/KR-Nom/my-new-project-portfolio

확인한 경험, 현재 실행 가능한 기능, 이번에 발전시킨 디자인을 구분합니다. 기존 대표 6개 서비스의 실제 실행·DB·모델 검증은 [VERIFICATION.md](./VERIFICATION.md)에 별도로 기록되어 있습니다.
