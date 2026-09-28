-- ============================================================
-- 종합실습3-1 — HR DB 느린 쿼리 성능 튜닝 실습
-- 환경설정 (PART 0) 전용  |  PostgreSQL 11+  |  psql 실행 버전 (v2)
-- ============================================================
-- ⚠️ psql 사용 안내
--  1) psql은 하나의 세션이 계속 유지되므로, 아래 SET search_path 가
--     스크립트 실행이 끝난 뒤에도 같은 세션 내에서는 유지됩니다.
--  2) 실행 방법
--     - 전체 실행: psql -U <user> -d <db> -f 종합실습3-1_환경설정_psql버전.sql
--     - 또는 psql 접속 후: \i /경로/종합실습3-1_환경설정_psql버전.sql
--  3) 이 스크립트는 환경(스키마/테이블/데이터)만 구성합니다.
--     LAB A~E(문제/실습)는 별도 파일로 제공됩니다.
--
-- [데이터 설계 포인트]
--   - hire_date: 20%는 최근 365일 이내, 80%는 그 이전으로 분산
--     → "최근 365일 입사자" 조건이 항상 결과를 반환하도록 설계
--   - email 도메인: 편향 분포 (gmail.com 약 3%)
--     corp.com 35% / example.com 30% / mail.com 20% / outlook.com 12% / gmail.com 3%
--     → 선행 와일드카드 LIKE 검색 실습에서, 힌트 없이도 플래너가
--       자연스럽게 인덱스를 선택할 수 있을 만큼 선택도를 낮춰둔 것
-- ============================================================

\timing on
\pset pager off

\echo '=== PART 0. 환경 설정 시작 ==='

DROP SCHEMA IF EXISTS hr CASCADE;
CREATE SCHEMA hr;
SET search_path = hr, public;

CREATE TABLE locations (
  location_id   SERIAL PRIMARY KEY,
  city          TEXT NOT NULL,
  country       TEXT NOT NULL,
  region        TEXT NOT NULL
);

CREATE TABLE departments (
  department_id   SERIAL PRIMARY KEY,
  department_name TEXT NOT NULL,
  location_id     INT NOT NULL REFERENCES locations(location_id)
);

CREATE TABLE jobs (
  job_id     SERIAL PRIMARY KEY,
  job_title  TEXT NOT NULL,
  min_salary INT NOT NULL,
  max_salary INT NOT NULL
);

CREATE TABLE employees (
  employee_id   BIGSERIAL PRIMARY KEY,
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  phone         TEXT,
  hire_date     DATE NOT NULL,
  salary        INT NOT NULL,
  manager_id    BIGINT NULL,
  department_id INT NOT NULL REFERENCES departments(department_id),
  job_id        INT NOT NULL REFERENCES jobs(job_id),
  status        TEXT NOT NULL DEFAULT 'ACTIVE'
);

CREATE TABLE job_history (
  employee_id   BIGINT NOT NULL REFERENCES employees(employee_id),
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  department_id INT NOT NULL REFERENCES departments(department_id),
  job_id        INT NOT NULL REFERENCES jobs(job_id),
  PRIMARY KEY (employee_id, start_date)
);

-- 기준 데이터 적재
INSERT INTO locations(city, country, region)
SELECT
  'City_'||gs::text,
  (ARRAY['KR','US','JP','DE','FR','GB','IN','CN'])[1 + (random()*7)::int],
  (ARRAY['APAC','EMEA','AMER'])[1 + (random()*2)::int]
FROM generate_series(1, 50) gs;

INSERT INTO departments(department_name, location_id)
SELECT
  'Dept_'||gs::text,
  1 + (random() * 49)::int
FROM generate_series(1, 200) gs;

INSERT INTO jobs(job_title, min_salary, max_salary)
SELECT
  'Job_'||gs::text,
  2000 + (random()*1000)::int,
  8000 + (random()*7000)::int
FROM generate_series(1, 40) gs;

-- 대량 employees 생성 (약 50,000건) — hire_date FIXED 로직 + email 도메인 편향 분포
WITH nums AS (
  SELECT gs AS n FROM generate_series(1, 50000) gs
)
INSERT INTO employees(
  first_name, last_name, email, phone, hire_date, salary,
  manager_id, department_id, job_id, status
)
SELECT
  'First_'||n,
  'Last_'||n,
  lower(
    'user'||n||'@'||
    CASE
      WHEN dom < 0.35 THEN 'corp.com'       -- 35%
      WHEN dom < 0.65 THEN 'example.com'    -- 30%
      WHEN dom < 0.85 THEN 'mail.com'       -- 20%
      WHEN dom < 0.97 THEN 'outlook.com'    -- 12%
      ELSE 'gmail.com'                      -- 3%
    END
  ),
  '010-'||lpad(((random()*9999)::int)::text,4,'0')||'-'||lpad(((random()*9999)::int)::text,4,'0'),
  CASE
    WHEN random() < 0.20
      THEN CURRENT_DATE - ((random() * 364)::int)          -- 최근 365일 (20%)
    ELSE
      CURRENT_DATE - (365 + (random() * 3300)::int)        -- 그 이전 (약 9년) (80%)
  END AS hire_date,
  2000 + (random()*10000)::int,
  CASE WHEN random() < 0.2 THEN NULL ELSE 1 + (random()*200)::int END,
  1 + (random()*199)::int,
  1 + (random()*39)::int,
  CASE WHEN random() < 0.05 THEN 'INACTIVE' ELSE 'ACTIVE' END
FROM (
  SELECT n, random() AS dom FROM nums
) t;

-- job_history 일부 생성 (직무/부서 이동 이력)
INSERT INTO job_history(employee_id, start_date, end_date, department_id, job_id)
SELECT
  e.employee_id,
  e.hire_date,
  e.hire_date + (30 + (random()*900)::int),
  1 + (random()*199)::int,
  1 + (random()*39)::int
FROM employees e
WHERE e.employee_id % 10 = 0;  -- 10명 중 1명만 이력 생성

VACUUM ANALYZE;

\echo '=== PART 0. 환경 설정 완료 ==='
\timing off

--------------------------------------------------------------------------------------

\timing on
\pset pager off

-- =========================================================
-- 1번: 기본키로 사번 100인 직원 검색
-- 확인 포인트: employees_pkey를 사용한 Index Scan 여부
-- =========================================================

EXPLAIN (ANALYZE, BUFFERS)
SELECT *
FROM employees
WHERE employee_id = 100;

-- =========================================================
-- 1-A: 최적 기준 쿼리(불필요한 SELECT * 줄이기)
-- 예상: Index Scan
-- =========================================================

EXPLAIN (ANALYZE, BUFFERS)
SELECT employee_id, first_name, last_name, email
FROM employees
WHERE employee_id = 100;

-- =========================================================
-- 1-B: BETWEEN을 사용한 범위 검색
-- 예상: Index Scan
-- =========================================================

EXPLAIN (ANALYZE, BUFFERS)
SELECT *
FROM employees
WHERE employee_id BETWEEN 100 AND 100;

-- =========================================================
-- 1-C: employee_id를 문자열로 변환하여 비교
-- 예상: Seq Scan
-- 이유: 인덱스 컬럼에 형 변환을 적용함
-- =========================================================

EXPLAIN (ANALYZE, BUFFERS)
SELECT *
FROM employees
WHERE employee_id::text = '100';

-- =========================================================
-- =========================================================

-- =========================================================
-- 2번: 이메일 검색
-- 확인 포인트: Seq Scan 여부, Rows Removed by Filter
-- =========================================================
EXPLAIN (ANALYZE, BUFFERS)
SELECT *
FROM employees
WHERE email = 'user6@corp.com';
-- =========================================================
-- 2번: LOWER 함수를 사용한 이메일 검색
-- 확인 포인트: Seq Scan 여부, Rows Removed by Filter
-- =========================================================

EXPLAIN (ANALYZE, BUFFERS)
SELECT *
FROM employees
WHERE lower(email) = 'user6@corp.com';

-- =========================================================
-- 2번: 불필요한 SELECT * 줄이기
-- =========================================================

EXPLAIN (ANALYZE, BUFFERS)
SELECT employee_id, first_name, last_name, email
FROM employees
WHERE lower(email) = 'user6@corp.com';


-- =========================================================
-- 2번 팀 최적안: LOWER 함수 + 커버링 인덱스
-- 조회 컬럼을 INCLUDE하여 Heap 접근 제거를 목표로 함
-- 최신 5회: 0.163 / 0.224 / 0.146 / 0.129 / 0.133 ms
-- 평균 0.159 ms / 최소 0.129 ms / 최대 0.224 ms
-- 5회 모두 Index Only Scan using idx_email_lower_covering
-- 5회 모두 Heap Fetches=0 / shared hit=4, read=0
-- =========================================================

CREATE INDEX idx_email_lower_covering
ON employees (lower(email))
INCLUDE (employee_id, first_name, last_name, email);

VACUUM ANALYZE employees;

EXPLAIN (ANALYZE, BUFFERS)
SELECT employee_id, first_name, last_name, email
FROM employees
WHERE lower(email) = 'user6@corp.com';


-- =========================================================
-- 튜닝 1: 함수 인덱스 생성
-- 2번 튜닝 후 방법 1: 함수 인덱스 사용
-- =========================================================

CREATE INDEX idx_email_lower
ON employees (lower(email));

ANALYZE employees;

EXPLAIN (ANALYZE, BUFFERS)
SELECT employee_id, first_name, last_name, email
FROM employees
WHERE lower(email) = 'user6@corp.com';


-- =========================================================
-- 2번 튜닝 후 방법 2: 조건식 단순화
-- 기존 UNIQUE 인덱스 사용
-- =========================================================

EXPLAIN (ANALYZE, BUFFERS)
SELECT employee_id, first_name, last_name, email
FROM employees
WHERE email = 'user6@corp.com';


-- =========================================================
-- 3번: Gmail 이메일 접미사 검색
-- 확인 포인트: 앞쪽 와일드카드로 인한 Seq Scan 여부
-- =========================================================

EXPLAIN (ANALYZE, BUFFERS)
SELECT *
FROM employees
WHERE email LIKE '%@gmail.com';

-- =========================================================
-- 3-A: 선행 와일드카드를 사용한 접미사 검색
-- =========================================================

EXPLAIN (ANALYZE, BUFFERS)
SELECT employee_id, first_name, last_name, email
FROM employees
WHERE email LIKE '%@gmail.com';

-- =========================================================
-- 3-B: RIGHT 함수로 이메일 끝부분 비교
-- '@gmail.com'은 10글자
-- =========================================================

EXPLAIN (ANALYZE, BUFFERS)
SELECT employee_id, first_name, last_name, email
FROM employees
WHERE right(email, 10) = '@gmail.com';

-- =========================================================
-- 3-C: 이메일을 @ 기준으로 분리하여 도메인 비교
-- =========================================================

EXPLAIN (ANALYZE, BUFFERS)
SELECT employee_id, first_name, last_name, email
FROM employees
WHERE split_part(email, '@', 2) = 'gmail.com';

-- =========================================================
-- 3-A,B,C 비교 (실행 결과 건수 확인)
-- =========================================================
SELECT
    count(*) FILTER (
        WHERE email LIKE '%@gmail.com'
    ) AS like_count,

    count(*) FILTER (
        WHERE right(email, 10) = '@gmail.com'
    ) AS right_count,

    count(*) FILTER (
        WHERE split_part(email, '@', 2) = 'gmail.com'
    ) AS split_count
FROM employees;

-- =========================================================
-- 3번 튜닝 1: 이메일 도메인 함수 인덱스
-- =========================================================

CREATE INDEX idx_email_domain
ON employees ((split_part(email, '@', 2)));

ANALYZE employees;

EXPLAIN (ANALYZE, BUFFERS)
SELECT employee_id, first_name, last_name, email
FROM employees
WHERE split_part(email, '@', 2) = 'gmail.com';


-- =========================================================
-- 3번 튜닝 2: 이메일 접미사 함수 인덱스
-- =========================================================

CREATE INDEX idx_email_suffix
ON employees ((right(email, 10)));

ANALYZE employees;

EXPLAIN (ANALYZE, BUFFERS)
SELECT employee_id, first_name, last_name, email
FROM employees
WHERE right(email, 10) = '@gmail.com';


-- =========================================================
-- 3번 튜닝 3: Trigram(GIN) 인덱스
-- =========================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX idx_email_trgm
ON employees
USING gin (email gin_trgm_ops);

ANALYZE employees;

EXPLAIN (ANALYZE, BUFFERS)
SELECT employee_id, first_name, last_name, email
FROM employees
WHERE email LIKE '%@gmail.com';

-- =========================================================
-- 4번: 최근 365일 이내 입사한 재직자를 연봉순으로 조회
-- 확인 포인트: Seq Scan, Sort, top-N heapsort 여부
-- =========================================================

EXPLAIN (ANALYZE, BUFFERS)
SELECT *
FROM employees
WHERE hire_date >= CURRENT_DATE - INTERVAL '365 days'
  AND status = 'ACTIVE'
ORDER BY salary DESC
LIMIT 100;

-- =========================================================
-- 4번: 최근 365일 이내 입사한 재직자를 연봉순으로 조회
-- 확인 포인트: Seq Scan, Sort, top-N heapsort 여부
-- =========================================================

EXPLAIN (ANALYZE, BUFFERS)
SELECT *
FROM employees
WHERE hire_date >= CURRENT_DATE - INTERVAL '365 days'
  AND status = 'ACTIVE'
ORDER BY salary DESC
LIMIT 100;


-- =========================================================
-- 4-A: 기본 조건식 + 필요한 컬럼만 조회
-- 최근 365일 이내 입사한 ACTIVE 직원 중
-- 연봉이 높은 상위 100명을 조회
-- 확인 포인트: Seq Scan, Sort, top-N heapsort 여부
-- =========================================================

EXPLAIN (ANALYZE, BUFFERS)
SELECT employee_id,
       first_name,
       last_name,
       hire_date,
       salary,
       status
FROM employees
WHERE hire_date >= CURRENT_DATE - INTERVAL '365 days'
  AND status = 'ACTIVE'
ORDER BY salary DESC
LIMIT 100;


-- =========================================================
-- 4-B: 날짜 컬럼에 연산을 적용한 방식
-- CURRENT_DATE와 hire_date의 차이가 365일 이하인 직원 조회
-- 결과 목적은 4-A와 같지만 hire_date 컬럼에 연산이 적용됨
-- 확인 포인트: 일반 hire_date 인덱스 사용이 어려운지 확인
-- =========================================================

EXPLAIN (ANALYZE, BUFFERS)
SELECT employee_id,
       first_name,
       last_name,
       hire_date,
       salary,
       status
FROM employees
WHERE CURRENT_DATE - hire_date <= 365
  AND status = 'ACTIVE'
ORDER BY salary DESC
LIMIT 100;


-- =========================================================
-- 4-C: 서브쿼리로 필터링한 후 상위 100명 조회
-- 서브쿼리에서 최근 입사자와 ACTIVE 직원을 먼저 필터링
-- 외부 쿼리에서 연봉 내림차순 정렬 후 100명만 조회
-- 확인 포인트: PostgreSQL이 서브쿼리를 병합하여
--              4-A와 동일하거나 유사한 계획을 만드는지 확인
-- =========================================================

EXPLAIN (ANALYZE, BUFFERS)
SELECT employee_id,
       first_name,
       last_name,
       hire_date,
       salary,
       status
FROM (
    SELECT employee_id,
           first_name,
           last_name,
           hire_date,
           salary,
           status
    FROM employees
    WHERE hire_date >= CURRENT_DATE - INTERVAL '365 days'
      AND status = 'ACTIVE'
) AS recent_active_employees
ORDER BY salary DESC
LIMIT 100;


-- =========================================================
-- 4-A, 4-B, 4-C 결과 조건 확인
-- 최근 365일 이내 입사한 ACTIVE 직원의 전체 건수 확인
-- 세 쿼리는 동일한 대상에서 상위 100명을 반환해야 함
-- =========================================================

SELECT COUNT(*) AS recent_active_employee_count
FROM employees
WHERE hire_date >= CURRENT_DATE - INTERVAL '365 days'
  AND status = 'ACTIVE';


-- =========================================================
-- 4번 튜닝 1: 필터 중심 복합 인덱스
-- status와 hire_date 조건을 먼저 처리
-- =========================================================

CREATE INDEX idx_employees_status_hire_salary
ON employees (status, hire_date, salary DESC);

ANALYZE employees;

EXPLAIN (ANALYZE, BUFFERS)
SELECT employee_id,
       first_name,
       last_name,
       hire_date,
       salary,
       status
FROM employees
WHERE hire_date >= CURRENT_DATE - INTERVAL '365 days'
  AND status = 'ACTIVE'
ORDER BY salary DESC
LIMIT 100;


-- =========================================================
-- 4번 튜닝 2: 정렬과 LIMIT 중심 복합 인덱스
-- 연봉순으로 읽어 상위 100건을 빠르게 조회
-- =========================================================

CREATE INDEX idx_employees_status_salary_hire
ON employees (status, salary DESC, hire_date);

ANALYZE employees;

EXPLAIN (ANALYZE, BUFFERS)
SELECT employee_id,
       first_name,
       last_name,
       hire_date,
       salary,
       status
FROM employees
WHERE hire_date >= CURRENT_DATE - INTERVAL '365 days'
  AND status = 'ACTIVE'
ORDER BY salary DESC
LIMIT 100;


-- =========================================================
-- 4번 튜닝 3: ACTIVE 직원 전용 부분 인덱스
-- ACTIVE 데이터만 인덱스에 저장
-- 연봉 내림차순 정렬과 LIMIT 처리 최적화
-- =========================================================
DROP INDEX idx_employees_status_salary_hire;

ANALYZE employees;
CREATE INDEX idx_employees_active_salary_hire
ON employees (salary DESC, hire_date)
WHERE status = 'ACTIVE';

ANALYZE employees;

EXPLAIN (ANALYZE, BUFFERS)
SELECT employee_id,
       first_name,
       last_name,
       hire_date,
       salary,
       status
FROM employees
WHERE hire_date >= CURRENT_DATE - INTERVAL '365 days'
  AND status = 'ACTIVE'
ORDER BY salary DESC
LIMIT 100;
-- =========================================================
-- 5번: 특정 부서 또는 특정 직무에 속한 직원 검색
-- 확인 포인트: OR 조건에서 Seq Scan 여부
-- =========================================================

EXPLAIN (ANALYZE, BUFFERS)
SELECT *
FROM employees
WHERE department_id = 10
   OR job_id IN (3, 4, 5);


-- =========================================================
-- 5-A: OR와 IN을 사용한 기본 검색
-- 부서가 10이거나 직무가 3, 4, 5인 직원 조회
-- =========================================================

EXPLAIN (ANALYZE, BUFFERS)
SELECT employee_id,
       first_name,
       last_name,
       department_id,
       job_id,
       status
FROM employees
WHERE department_id = 10
   OR job_id IN (3, 4, 5);


-- =========================================================
-- 5-B: 직무 조건을 각각의 OR로 작성
-- 5-A와 같은 직원을 조회하지만 조건을 개별 비교
-- =========================================================

EXPLAIN (ANALYZE, BUFFERS)
SELECT employee_id,
       first_name,
       last_name,
       department_id,
       job_id,
       status
FROM employees
WHERE department_id = 10
   OR job_id = 3
   OR job_id = 4
   OR job_id = 5;


-- =========================================================
-- 5-C: UNION을 사용하여 조건별 조회
-- 두 조건에 모두 해당하는 직원은 UNION이 중복 제거
-- =========================================================

EXPLAIN (ANALYZE, BUFFERS)
SELECT employee_id,
       first_name,
       last_name,
       department_id,
       job_id,
       status
FROM employees
WHERE department_id = 10

UNION

SELECT employee_id,
       first_name,
       last_name,
       department_id,
       job_id,
       status
FROM employees
WHERE job_id IN (3, 4, 5);


-- =========================================================
-- 5번 튜닝 1: 부서와 직무에 개별 인덱스 생성
-- PostgreSQL이 두 인덱스를 BitmapOr로 결합할 수 있음
-- =========================================================

CREATE INDEX idx_employees_department
ON employees (department_id);

CREATE INDEX idx_employees_job
ON employees (job_id);

ANALYZE employees;

EXPLAIN (ANALYZE, BUFFERS)
SELECT employee_id,
       first_name,
       last_name,
       department_id,
       job_id,
       status
FROM employees
WHERE department_id = 10
   OR job_id IN (3, 4, 5);


-- =========================================================
-- 5번 튜닝 2: UNION으로 조건별 인덱스 사용
-- 부서 조건과 직무 조건을 각각 조회
-- UNION으로 중복 직원을 제거
-- =========================================================

EXPLAIN (ANALYZE, BUFFERS)
SELECT employee_id,
       first_name,
       last_name,
       department_id,
       job_id,
       status
FROM employees
WHERE department_id = 10

UNION

SELECT employee_id,
       first_name,
       last_name,
       department_id,
       job_id,
       status
FROM employees
WHERE job_id IN (3, 4, 5);


-- =========================================================
-- 5번 튜닝 3: UNION ALL과 중복 방지 조건 사용
-- UNION의 중복 제거 비용을 줄이면서 같은 결과를 반환
-- 두 번째 쿼리에서 department_id = 10인 직원을 제외
-- =========================================================

EXPLAIN (ANALYZE, BUFFERS)
SELECT employee_id,
       first_name,
       last_name,
       department_id,
       job_id,
       status
FROM employees
WHERE department_id = 10

UNION ALL

SELECT employee_id,
       first_name,
       last_name,
       department_id,
       job_id,
       status
FROM employees
WHERE job_id IN (3, 4, 5)
  AND department_id <> 10;


-- =========================================================
-- 최종 최적안 재현성 검증
-- 측정 방법: 각 쿼리 최초 1회 실행 후 \watch로 5회 반복
-- 비교 기준: EXPLAIN의 Execution Time과 Buffers
-- 측정 환경: PostgreSQL 17.10 / employees 50,000건 / warm cache
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_employees_status_salary_hire
ON employees (status, salary DESC, hire_date);

ANALYZE employees;


-- =========================================================
-- 최적안 1: PK 직접 비교 + 필요한 컬럼만 조회
-- 최신 5회 Execution Time: 0.062 / 0.080 / 0.050 / 0.070 / 0.057 ms
-- 평균 0.064 ms / 최소 0.050 ms / 최대 0.080 ms
-- 5회 모두 Index Scan using employees_pkey
-- 5회 모두 Buffers: shared hit=6, read=0 / actual rows=1
-- =========================================================

EXPLAIN (ANALYZE, BUFFERS)
SELECT employee_id, first_name, last_name, email
FROM employees
WHERE employee_id = 100;
\watch 0.1 5


-- =========================================================
-- 전체 대안 5회 반복 측정 결과 요약
-- 공통: 준비 실행 1회 후 측정 5회 / warm cache
-- 시간 단위: ms / Buffers는 5회 동일
-- =========================================================
--
-- [1번 employee_id]
-- SELECT * + PK        평균 0.081 / 0.069~0.100 / hit=6 read=0 / Index Scan
-- 필요 컬럼 + PK       평균 0.064 / 0.050~0.080 / hit=6 read=0 / Index Scan
-- BETWEEN              평균 0.070 / 0.052~0.117 / hit=6 read=0 / Index Scan
-- employee_id::text    평균 7.340 / 6.341~8.154 / hit=786 read=0 / Seq Scan / 제거 49,999
--
-- [2번 email]
-- LOWER 인덱스 전      평균 6.105 / 5.942~6.249 / hit=786 read=0 / Seq Scan / 제거 49,999
-- LOWER 함수 인덱스    평균 0.027 / 0.025~0.029 / hit=4 read=0 / idx_email_lower
-- 원본 email 직접비교 평균 0.039 / 0.030~0.045 / hit=4 read=0 / employees_email_key
--
-- [3번 Gmail 도메인]
-- LIKE 인덱스 전       평균 3.280 / 2.985~3.394 / hit=786 read=0 / Seq Scan
-- RIGHT 인덱스 전      평균 4.403 / 4.281~4.546 / hit=786 read=0 / Seq Scan
-- SPLIT_PART 인덱스 전 평균 3.425 / 3.371~3.550 / hit=786 read=0 / Seq Scan
-- LIKE + pg_trgm GIN   평균 1.830 / 1.703~1.959 / hit=744 read=0 / Bitmap Scan
-- RIGHT 함수 인덱스    평균 0.887 / 0.794~1.024 / hit=658 read=0 / Bitmap Scan
-- SPLIT_PART 함수 IDX  평균 0.945 / 0.728~1.155 / hit=659 read=0 / Bitmap Scan
--
-- [4번 ACTIVE Top 100]
-- 인덱스 전            평균 5.645 / 5.508~5.828 / hit=789 read=0 / Seq Scan + Sort
-- status,hire,salary   평균 2.534 / 2.402~2.689 / hit=831 read=0 / Bitmap + Sort
-- status,salary,hire   평균 0.150 / 0.120~0.179 / hit=102 read=0 / Index Scan / Sort 없음
-- ACTIVE Partial Index 평균 0.150 / 0.132~0.165 / hit=102 read=0 / Index Scan / Sort 없음
--
-- [5번 department OR job]
-- OR 인덱스 전         평균 3.649 / 3.125~3.982 / hit=786 read=0 / Seq Scan
-- UNION 인덱스 전      평균 6.143 / 5.906~6.404 / hit=1572 read=0 / Seq Scan 2회 + Aggregate
-- 인덱스 + OR          평균 1.236 / 1.097~1.360 / hit=794 read=0 / BitmapOr
-- 인덱스 + UNION       평균 2.560 / 2.441~2.633 / hit=1025 read=0 / Aggregate
-- 인덱스 + UNION ALL   평균 1.757 / 1.647~1.816 / hit=1025 read=0 / Append / 중복 24건 제외
-- =========================================================


-- =========================================================
-- 최적안 2: 소문자 입력값과 원본 email 직접 비교
-- 최신 5회 Execution Time: 0.036 / 0.043 / 0.041 / 0.045 / 0.030 ms
-- 평균 0.039 ms / 최소 0.030 ms / 최대 0.045 ms
-- 5회 모두 Index Scan using employees_email_key
-- 5회 모두 Buffers: shared hit=4, read=0 / actual rows=1
-- =========================================================

EXPLAIN (ANALYZE, BUFFERS)
SELECT employee_id, first_name, last_name, email
FROM employees
WHERE email = 'user6@corp.com';
\watch 0.1 5


-- =========================================================
-- 최적안 3: RIGHT(email, 10) 함수 인덱스
-- 최신 5회 Execution Time: 0.888 / 0.929 / 0.794 / 0.802 / 1.024 ms
-- 평균 0.887 ms / 최소 0.794 ms / 최대 1.024 ms
-- 5회 모두 Bitmap Heap Scan + idx_email_suffix
-- 5회 모두 Buffers: shared hit=658, read=0 / actual rows=1,434
-- =========================================================

EXPLAIN (ANALYZE, BUFFERS)
SELECT employee_id, first_name, last_name, email
FROM employees
WHERE right(email, 10) = '@gmail.com';
\watch 0.1 5


-- =========================================================
-- 최적안 4: status + salary DESC + hire_date 복합 인덱스
-- 최신 독립 측정 5회: 0.120 / 0.149 / 0.151 / 0.152 / 0.179 ms
-- 평균 0.150 ms / 최소 0.120 ms / 최대 0.179 ms
-- 5회 모두 Limit + Index Scan using idx_employees_status_salary_hire
-- 별도 Sort 없음
-- 5회 모두 Buffers: shared hit=102, read=0 / actual rows=100
-- =========================================================

EXPLAIN (ANALYZE, BUFFERS)
SELECT employee_id, first_name, last_name, hire_date, salary, status
FROM employees
WHERE hire_date >= CURRENT_DATE - INTERVAL '365 days'
  AND status = 'ACTIVE'
ORDER BY salary DESC
LIMIT 100;
\watch 0.1 5


-- =========================================================
-- 최적안 5: department/job 개별 인덱스 + OR
-- 최신 5회 Execution Time: 1.097 / 1.216 / 1.227 / 1.360 / 1.281 ms
-- 평균 1.236 ms / 최소 1.097 ms / 최대 1.360 ms
-- 5회 모두 Bitmap Heap Scan + BitmapOr
-- 사용 인덱스: idx_employees_department, idx_employees_job
-- 5회 모두 Buffers: shared hit=794, read=0 / actual rows=4,157
-- =========================================================

EXPLAIN (ANALYZE, BUFFERS)
SELECT employee_id, first_name, last_name, department_id, job_id, status
FROM employees
WHERE department_id = 10
   OR job_id IN (3, 4, 5);
\watch 0.1 5
