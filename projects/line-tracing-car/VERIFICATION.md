# 실행 검증 · 2026-09-28

## 환경

- macOS arm64 / Python 3.11.15
- 별도 `.venv-training`: TensorFlow 2.21.0, FastAPI 0.141.1, Pillow 12.3.0
- 공유 모델 환경의 의존성을 바꾸지 않도록 별도 가상환경에서 CNN 검증
- `python -m pip check`: No broken requirements found

## 결과

| 검증 | 결과 |
|---|---|
| `python -m unittest discover -s tests -v` | 10개 통과 |
| 원본 3쌍 → SQLite → API 이미지/명령값 → CSV | 통과, 원본 SHA-256 대조 |
| 업로드 → 세션 저장 → 재조회 | 통과 |
| NaN·범위 초과·상위 경로·중복 시각·누락/손상 이미지·잘못된 ZIP | 거부 확인 |
| 다른 세션에 같은 이미지가 들어간 학습/검증 분리 | 거부 확인 |
| `python tests/smoke_training.py` | 합성 20장/5장, 1 epoch, `.keras` 저장·재로딩·추론 통과 |
| 웹앱 세 번째 프레임 선택 | 조향 −0.625 / 스로틀 0.561 / 3 of 3 표시 확인 |
| 브라우저 ZIP 업로드 | 3개 프레임 저장 메시지·새 세션 선택·버튼 복구 확인 |
| 1440×1100, 390×844 반응형 | 가로 넘침 0, 깨진 이미지 0 |
| agent-browser console/errors | 기록된 오류 없음 |

브라우저 캡처는 로컬 `data/desktop.png`, `data/mobile.png`에 있습니다. 데이터와 실행 산출물 폴더는 Git에서 제외합니다.

학습 smoke 입력은 기능 검증용 합성 자료이며 실제 주행 데이터가 아닙니다. 실물 RC카, 조이스틱, ESP32, 라이다, 모터에 연결하거나 주행 정확도·이탈률을 평가하지 않았습니다. 공개 데모 3장으로 학습 성능을 제시하지 않습니다.
