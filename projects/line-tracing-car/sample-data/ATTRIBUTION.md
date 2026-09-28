# 공개 RC카 데이터 샘플

- 원저작자: robocarstore 및 Donkey Car dataset 커뮤니티 기여자
- 원출처: https://github.com/robocarstore/donkeycar-dataset
- 고정 commit: `debe6549eb2df1b24b7d9cd337f9e70771aed7ee`
- 라이선스: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- 데이터 설명: 홍콩 Jordan Valley 반실내 Mini-RC 트랙, 2019-12-10, OV5647, 160 × 120
- 변경 사항: 원본 사진은 변경하지 않았습니다. 전체 데이터에서 이미지와 동일 record JSON 세 쌍만 발췌했습니다.

## 슬라이드 표기

**공개 RC카 주행 데이터 예시 · robocarstore / CC BY 4.0**

사진과 수치는 프로젝트 소유자가 직접 수집한 자료가 아닙니다. 사용자가 설명한 수동 조작 → 이미지와 조작값 동시 수집 → CNN 학습 흐름을 보여주는 외부 공개 자료입니다.

| 원본 record | 조향 명령 user/angle | 스로틀 명령 user/throttle | milliseconds |
|---|---:|---:|---:|
| 7533 | -0.6245307779168066 | 0.5612964262825404 | 327878 |
| 1720 | -0.007965330973235268 | 1.0 | 83579 |
| 4266 | 0.20551164281136508 | 1.0 | 206800 |

조향·스로틀은 원본 record의 명령값이며 실제 바퀴 각도(도)나 속도(km/h)가 아닙니다. 라이다 값은 이 샘플에 없습니다. 공개 샘플의 수집 주기를 사용자 프로젝트의 1초 주기라고 표현하면 안 됩니다.
