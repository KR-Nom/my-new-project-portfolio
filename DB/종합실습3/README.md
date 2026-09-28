# PostgreSQL 실행계획 기반 쿼리 튜닝

약 50,000행의 합성 HR 데이터를 대상으로 조회 조건과 인덱스가 실제 실행계획에 미치는 영향을 비교한 실습입니다. 직원 이름·이메일·전화번호는 스크립트로 만든 예제 값이며 실제 인사 정보가 아닙니다.

## 문제와 접근

인덱스가 존재하더라도 컬럼의 형변환, 함수 조건, 정렬 방식에 따라 전체 스캔이 발생할 수 있습니다. `EXPLAIN (ANALYZE, BUFFERS)`로 Scan 종류, Sort 유무, Heap Fetches와 버퍼 접근을 확인하고 동일 조건에서 반복 측정했습니다.

| 조회 패턴 | 변경 전 평균 | 변경 후 평균 | 실행계획 변화 |
|---|---:|---:|---|
| 기본키 조회의 불필요한 형변환 제거 | 7.340 ms | 0.064 ms | Seq Scan → 기본키 Index Scan |
| LOWER(email) 조건의 커버링 인덱스 | 6.105 ms | 0.159 ms | Seq Scan → Index Only Scan, Heap Fetches 0 |
| 최근 ACTIVE Top 100 부분 인덱스 | 5.645 ms | 0.150 ms | 전체 스캔·정렬 → 인덱스 순서 조회 |

표는 기존 실습 보고서의 warm-cache 반복 측정 평균입니다. 아래 이미지는 개별 실행 캡처이므로 실행시간이 평균과 다릅니다. LOWER 일반 함수 인덱스와 커버링 인덱스의 역할, 일반 정렬 인덱스와 부분 인덱스가 사실상 동급이었던 결과도 구분해 해석했습니다. 모든 조건에서 특정 인덱스가 더 빠르다는 결론은 아닙니다.

## 소스와 증빙

- [환경 구성 및 조회 실험 SQL](./hr_query_tuning.sql)
- [형변환 조건의 Seq Scan](./report-assets/q1-before-cast.png)
- [기본키 Index Scan](./report-assets/q1-after-pk.png)
- [LOWER 커버링 인덱스](./report-assets/q2-covering-1.png)
- [ACTIVE 부분 인덱스](./report-assets/q4-active-partial-index.png)

SQL은 교육용 환경 구성과 쿼리 변형 실습을 포함합니다. 실행 첫 부분의 `DROP SCHEMA IF EXISTS hr CASCADE`가 기존 `hr` 스키마를 삭제하므로 별도의 실습용 데이터베이스에서만 사용해야 합니다. 공개 준비 과정에서는 SQL을 실행하거나 데이터베이스를 변경하지 않았습니다.

원본 제출 PDF, 편집용 전체 HTML과 불필요한 캡처는 제외하고 쿼리와 주요 실행계획만 공개했습니다.
