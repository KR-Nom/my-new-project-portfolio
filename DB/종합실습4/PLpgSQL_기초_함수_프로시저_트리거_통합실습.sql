/*
===============================================================================
 PL/pgSQL 기초 · 함수 · 프로시저 · 트리거 통합 실습
 대상: PostgreSQL 14 이상 (권장: PostgreSQL 17~18)
 실행: DBeaver에서 이 파일 전체를 선택한 뒤 "SQL 스크립트 실행"(Alt+X)
===============================================================================

 [학습 순서]
   1. PL/pgSQL의 역할과 기본 문법
   2. 실습용 DDL과 샘플 데이터 생성
   3. 익명 블록(DO): 변수, SELECT INTO, IF, CASE, 반복문, 예외 처리
   4. 함수(FUNCTION): 계산 함수, 단일 행 조회, 테이블 반환, 집계
   5. 프로시저(PROCEDURE): 급여 인상, 주문 생성, 주문 상태 변경
   6. 트리거(TRIGGER): 값 검증, 수정 시각, 감사 이력, 재고 자동 반영
   7. 통합 실행과 결과 확인

 [PL/pgSQL이란?]
   - PostgreSQL의 절차적 SQL 언어(Procedural Language)이다.
   - 일반 SQL에 변수, 조건문, 반복문, 예외 처리 등의 절차적 기능을 더한다.
   - 함수, 프로시저, 트리거 함수, DO 익명 블록을 작성할 때 사용한다.

 [가장 중요한 기본 구조]
   CREATE OR REPLACE FUNCTION 함수명(...)
   RETURNS 반환형
   LANGUAGE plpgsql
   AS $$
   DECLARE                 -- 선택: 변수 선언부
       변수명 자료형;
   BEGIN                   -- 필수: 실행부
       ...
       RETURN 값;
   EXCEPTION               -- 선택: 예외 처리부
       WHEN 예외명 THEN ...;
   END;
   $$;

   $$ ... $$는 함수 본문을 감싸는 달러 인용(dollar quoting)이다.
   본문 안의 작은따옴표를 일일이 이스케이프하지 않아도 된다.
===============================================================================
*/


-- ============================================================================
-- 0. 실습 환경 초기화
--    같은 파일을 여러 번 실행해도 동일한 상태에서 다시 시작한다.
--    주의: plpgsql_lab 스키마 안의 기존 객체는 모두 삭제된다.
-- ============================================================================

DROP SCHEMA IF EXISTS plpgsql_lab CASCADE;
CREATE SCHEMA plpgsql_lab;
COMMENT ON SCHEMA plpgsql_lab IS
    'PL/pgSQL 함수·프로시저·트리거 통합 실습 스키마';

SET search_path TO plpgsql_lab, public;


-- ============================================================================
-- 1. 실습용 DDL
-- ============================================================================

CREATE TABLE departments (
    department_id   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    department_code varchar(10)  NOT NULL UNIQUE,
    department_name varchar(50)  NOT NULL UNIQUE,
    created_at      timestamptz  NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE employees (
    employee_id       bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    department_id     bigint       NOT NULL
                                  REFERENCES departments(department_id),
    manager_id        bigint       NULL
                                  REFERENCES employees(employee_id),
    employee_name     varchar(50)  NOT NULL,
    email             varchar(100) NOT NULL UNIQUE,
    salary            numeric(12,2) NOT NULL CHECK (salary > 0),
    performance_rating integer      NOT NULL DEFAULT 3
                                    CHECK (performance_rating BETWEEN 1 AND 5),
    hired_at          date          NOT NULL DEFAULT current_date,
    updated_at        timestamptz   NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE employee_salary_audit (
    audit_id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    employee_id       bigint        NOT NULL,
    old_salary        numeric(12,2)  NOT NULL,
    new_salary        numeric(12,2)  NOT NULL,
    changed_by        text           NOT NULL DEFAULT current_user,
    changed_at        timestamptz    NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE customers (
    customer_id       bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_name     varchar(50)  NOT NULL,
    email             varchar(100) NOT NULL UNIQUE,
    created_at        timestamptz  NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE products (
    product_id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_code      varchar(20)   NOT NULL UNIQUE,
    product_name      varchar(100)  NOT NULL,
    price             numeric(12,2) NOT NULL CHECK (price >= 0),
    stock_quantity    integer       NOT NULL DEFAULT 0,
    updated_at        timestamptz   NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT ck_products_stock_nonnegative CHECK (stock_quantity >= 0)
);

CREATE TABLE product_stock_audit (
    stock_audit_id    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_id        bigint       NOT NULL,
    old_quantity      integer      NOT NULL,
    new_quantity      integer      NOT NULL,
    quantity_delta    integer      NOT NULL,
    changed_by        text         NOT NULL DEFAULT current_user,
    changed_at        timestamptz  NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE orders (
    order_id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id       bigint      NOT NULL REFERENCES customers(customer_id),
    order_status      varchar(20) NOT NULL DEFAULT 'PENDING',
    ordered_at        timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at        timestamptz NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT ck_orders_status
        CHECK (order_status IN ('PENDING', 'PAID', 'SHIPPED',
                                'COMPLETED', 'CANCELLED'))
);

CREATE TABLE order_items (
    order_item_id     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id          bigint        NOT NULL REFERENCES orders(order_id)
                                      ON DELETE CASCADE,
    product_id        bigint        NOT NULL REFERENCES products(product_id),
    quantity          integer       NOT NULL CHECK (quantity > 0),
    unit_price        numeric(12,2) NOT NULL CHECK (unit_price >= 0),
    line_total        numeric(14,2) GENERATED ALWAYS AS
                                      (quantity * unit_price) STORED,
    CONSTRAINT uq_order_items_order_product UNIQUE (order_id, product_id)
);

CREATE TABLE order_status_history (
    history_id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id          bigint       NOT NULL,
    old_status        varchar(20),
    new_status        varchar(20)  NOT NULL,
    changed_by        text         NOT NULL DEFAULT current_user,
    changed_at        timestamptz  NOT NULL DEFAULT clock_timestamp()
);

-- PostgreSQL은 외래 키 열에 인덱스를 자동 생성하지 않는다.
-- 조회·조인·부모 행 변경 성능을 위해 필요한 인덱스를 직접 만든다.
CREATE INDEX ix_employees_department_id
    ON employees(department_id);
CREATE INDEX ix_employees_manager_id
    ON employees(manager_id);
CREATE INDEX ix_orders_customer_id
    ON orders(customer_id);
CREATE INDEX ix_order_items_product_id
    ON order_items(product_id);
CREATE INDEX ix_salary_audit_employee_changed_at
    ON employee_salary_audit(employee_id, changed_at DESC);
CREATE INDEX ix_stock_audit_product_changed_at
    ON product_stock_audit(product_id, changed_at DESC);
CREATE INDEX ix_order_status_history_order_changed_at
    ON order_status_history(order_id, changed_at DESC);


-- ============================================================================
-- 2. 샘플 데이터
-- ============================================================================

INSERT INTO departments (department_code, department_name)
VALUES ('DEV', '개발팀'),
       ('DATA', '데이터팀'),
       ('SALES', '영업팀');

-- 관리자를 먼저 입력하면 이후 직원이 manager_id로 참조할 수 있다.
INSERT INTO employees
    (department_id, manager_id, employee_name, email,
     salary, performance_rating, hired_at)
SELECT department_id, NULL, '김개발', 'dev.manager@example.com',
       7000000, 5, DATE '2021-03-02'
FROM departments
WHERE department_code = 'DEV';

INSERT INTO employees
    (department_id, manager_id, employee_name, email,
     salary, performance_rating, hired_at)
SELECT d.department_id, m.employee_id, '이백엔드',
       'backend@example.com', 4800000, 4, DATE '2023-07-10'
FROM departments AS d
CROSS JOIN employees AS m
WHERE d.department_code = 'DEV'
  AND m.email = 'dev.manager@example.com';

INSERT INTO employees
    (department_id, manager_id, employee_name, email,
     salary, performance_rating, hired_at)
SELECT d.department_id, m.employee_id, '박프론트',
       'frontend@example.com', 4500000, 3, DATE '2024-01-15'
FROM departments AS d
CROSS JOIN employees AS m
WHERE d.department_code = 'DEV'
  AND m.email = 'dev.manager@example.com';

INSERT INTO employees
    (department_id, manager_id, employee_name, email,
     salary, performance_rating, hired_at)
SELECT department_id, NULL, '최데이터', 'data.manager@example.com',
       6800000, 5, DATE '2020-11-20'
FROM departments
WHERE department_code = 'DATA';

INSERT INTO employees
    (department_id, manager_id, employee_name, email,
     salary, performance_rating, hired_at)
SELECT d.department_id, m.employee_id, '정분석',
       'analyst@example.com', 4700000, 4, DATE '2023-02-01'
FROM departments AS d
CROSS JOIN employees AS m
WHERE d.department_code = 'DATA'
  AND m.email = 'data.manager@example.com';

INSERT INTO employees
    (department_id, manager_id, employee_name, email,
     salary, performance_rating, hired_at)
SELECT department_id, NULL, '한영업', 'sales.manager@example.com',
       6200000, 3, DATE '2022-05-09'
FROM departments
WHERE department_code = 'SALES';

INSERT INTO customers (customer_name, email)
VALUES ('홍길동', 'hong@example.com'),
       ('김고객', 'kim@example.com');

INSERT INTO products (product_code, product_name, price, stock_quantity)
VALUES ('NOTE-001', '노트북',     1500000, 10),
       ('MON-001',  '27인치 모니터', 350000, 20),
       ('KEY-001',  '기계식 키보드',  120000, 30);


-- ============================================================================
-- 3. PL/pgSQL 기초: DO 익명 블록
--
-- DO 블록은 저장 객체를 만들지 않고 PL/pgSQL 코드를 한 번 실행한다.
-- 문법 연습, 데이터 보정, 일회성 관리 작업에 적합하다.
-- ============================================================================

DO $$
DECLARE
    -- := 또는 DEFAULT로 초기값을 지정한다.
    v_target_email text := 'backend@example.com';
    v_employee     employees%ROWTYPE; -- 테이블 한 행과 같은 구조
    v_grade        text;
    v_counter      integer := 1;
    v_row          record;             -- 조회 결과에 맞춰 구조가 결정됨
    v_tax_rate     constant numeric := 0.033;
BEGIN
    -- SELECT ... INTO는 조회 결과를 PL/pgSQL 변수에 저장한다.
    SELECT *
      INTO STRICT v_employee
      FROM employees
     WHERE email = v_target_email;

    RAISE NOTICE '직원: %, 월급: %, 예상 공제: %',
        v_employee.employee_name,
        v_employee.salary,
        round(v_employee.salary * v_tax_rate, 2);

    -- IF / ELSIF / ELSE
    IF v_employee.performance_rating >= 5 THEN
        v_grade := '최우수';
    ELSIF v_employee.performance_rating >= 4 THEN
        v_grade := '우수';
    ELSIF v_employee.performance_rating >= 3 THEN
        v_grade := '보통';
    ELSE
        v_grade := '개선 필요';
    END IF;
    RAISE NOTICE 'IF 평가 결과: %', v_grade;

    -- CASE 문: 여러 값에 따른 분기
    CASE v_employee.performance_rating
        WHEN 5 THEN v_grade := 'S';
        WHEN 4 THEN v_grade := 'A';
        WHEN 3 THEN v_grade := 'B';
        ELSE        v_grade := 'C';
    END CASE;
    RAISE NOTICE 'CASE 등급: %', v_grade;

    -- 쿼리 결과를 순회하는 FOR 반복문
    FOR v_row IN
        SELECT d.department_name, count(*) AS employee_count
          FROM departments AS d
          LEFT JOIN employees AS e USING (department_id)
         GROUP BY d.department_id, d.department_name
         ORDER BY d.department_id
    LOOP
        RAISE NOTICE '% 인원: %명',
            v_row.department_name, v_row.employee_count;
    END LOOP;

    -- WHILE 반복문
    WHILE v_counter <= 3 LOOP
        RAISE NOTICE 'WHILE 반복: %', v_counter;
        v_counter := v_counter + 1;
    END LOOP;

EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RAISE NOTICE '직원을 찾지 못했습니다: %', v_target_email;
    WHEN TOO_MANY_ROWS THEN
        RAISE NOTICE '조회 결과가 두 행 이상입니다: %', v_target_email;
    WHEN OTHERS THEN
        -- SQLSTATE와 SQLERRM은 현재 예외의 코드와 메시지이다.
        RAISE NOTICE '예상하지 못한 오류 [%]: %', SQLSTATE, SQLERRM;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- 4. 함수(FUNCTION)
--
-- 함수의 특징
--   - SELECT 문 안에서 호출할 수 있다.
--   - 반드시 RETURNS로 반환 자료형을 선언한다.
--   - 계산·조회·변환처럼 "결과값"이 필요한 작업에 적합하다.
--   - 데이터 변경도 가능하지만, 명령성 작업은 프로시저가 더 명확하다.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 4-1. 스칼라 함수: 성과 등급에 따른 월 보너스 계산
--
-- IMMUTABLE: 같은 인수이면 항상 같은 결과이며 DB를 조회하지 않는다.
-- STRICT   : 인수 중 하나라도 NULL이면 본문을 실행하지 않고 NULL을 반환한다.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_calculate_bonus(
    p_salary numeric,
    p_performance_rating integer
)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
STRICT
AS $$
DECLARE
    v_bonus_rate numeric;
BEGIN
	RAISE NOTICE 'select fn_calculate_bonus: %,%', p_salary,p_performance_rating;
    IF p_salary <= 0 THEN
        RAISE EXCEPTION USING
            ERRCODE = '22023',
            MESSAGE = '급여는 0보다 커야 합니다.';
    END IF;

    v_bonus_rate := CASE p_performance_rating
        WHEN 5 THEN 0.20
        WHEN 4 THEN 0.12
        WHEN 3 THEN 0.07
        WHEN 2 THEN 0.03
        WHEN 1 THEN 0.00
        ELSE NULL
    END;

    IF v_bonus_rate IS NULL THEN
        RAISE EXCEPTION USING
            ERRCODE = '22023',
            MESSAGE = format(
                '성과 등급은 1~5만 가능합니다. 입력값=%s',
                p_performance_rating
            );
    END IF;

    RETURN round(p_salary * v_bonus_rate, 2);
END;
$$;

--함수에 설명을 등록하는 명령문입니다.
--함수 이름만 적지 않고 매개변수 자료형까지 적는 이유는 함수 오버로딩 때문입니다.
COMMENT ON FUNCTION fn_calculate_bonus(numeric, integer) IS
    '월 급여와 성과 등급(1~5)을 받아 월 보너스를 반환한다.';
--select fn_calculate_bonus(111, 5);

-- ----------------------------------------------------------------------------
-- 4-2. 단일 행을 TABLE 형식으로 반환하는 함수
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_employee_summary(p_employee_email text)
RETURNS TABLE (
    employee_name  varchar,
    department_name varchar,
    monthly_salary numeric,
    monthly_bonus  numeric,
    annual_total   numeric
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    IF p_employee_email IS NULL OR btrim(p_employee_email) = '' THEN
        RAISE EXCEPTION '직원 이메일을 입력해야 합니다.'
            USING ERRCODE = '22023';
    END IF;

    RETURN QUERY
    SELECT e.employee_name,
           d.department_name,
           e.salary,
           fn_calculate_bonus(e.salary, e.performance_rating),
           round(
               (e.salary + fn_calculate_bonus(
                   e.salary, e.performance_rating
               )) * 12,
               2
           )
      FROM employees AS e
      JOIN departments AS d USING (department_id)
     WHERE e.email = p_employee_email;

    IF NOT FOUND THEN
        RAISE EXCEPTION '직원을 찾을 수 없습니다: %', p_employee_email
            USING ERRCODE = 'P0002';
    END IF;
END;
$$;

COMMENT ON FUNCTION fn_employee_summary(text) IS
    '이메일로 직원·부서·급여·보너스·연간 총보상을 조회한다.';


-- ----------------------------------------------------------------------------
-- 4-3. 여러 행을 반환하는 집계 함수
--      RETURN QUERY 뒤의 SELECT 결과가 반환 테이블에 누적된다.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_department_salary_stats()
RETURNS TABLE (
    department_code varchar,
    department_name varchar,
    employee_count  bigint,
    average_salary  numeric,
    total_salary    numeric
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT d.department_code,
           d.department_name,
           count(e.employee_id),
           round(avg(e.salary), 2),
           coalesce(sum(e.salary), 0)::numeric
      FROM departments AS d
      LEFT JOIN employees AS e USING (department_id)
     GROUP BY d.department_id, d.department_code, d.department_name
     ORDER BY d.department_id;
END;
$$;


-- ----------------------------------------------------------------------------
-- 4-4. 주문 합계를 반환하는 함수
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_order_total(p_order_id bigint)
RETURNS numeric
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_total numeric;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM orders WHERE order_id = p_order_id
    ) THEN
        RAISE EXCEPTION '주문을 찾을 수 없습니다: %', p_order_id
            USING ERRCODE = 'P0002';
    END IF;

    SELECT coalesce(sum(line_total), 0)
      INTO v_total
      FROM order_items
     WHERE order_id = p_order_id;

    RETURN v_total;
END;
$$;


-- 함수 기본 호출 예
SELECT fn_calculate_bonus(5000000, 5) AS bonus_example;
SELECT * FROM fn_employee_summary('backend@example.com');
SELECT * FROM fn_department_salary_stats();

-- 잘못된 인수의 예외를 확인하되 전체 스크립트는 중단하지 않는다.
DO $$
BEGIN
    PERFORM fn_calculate_bonus(5000000, 9);
EXCEPTION
    WHEN SQLSTATE '22023' THEN
        RAISE NOTICE '의도적으로 잡은 함수 예외: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- 5. 트리거 함수와 트리거
--
-- 트리거는 다음 두 객체를 조합한다.
--   ① RETURNS trigger인 트리거 함수: 실제 동작을 정의
--   ② CREATE TRIGGER: 실행 시점·이벤트·대상 테이블을 정의
--
-- BEFORE 트리거
--   - 저장 전에 NEW 값을 검증하거나 변경할 때 사용한다.
--   - 행 수준 INSERT/UPDATE에서는 NEW를 반환해야 한다.
-- AFTER 트리거
--   - 저장이 끝난 결과를 이용해 감사 이력을 남길 때 적합하다.
--   - 반환값은 무시되므로 관례적으로 NULL을 반환한다.
--
-- OLD: 변경 전 행(UPDATE, DELETE) / NEW: 변경 후 행(INSERT, UPDATE)
-- TG_OP: INSERT, UPDATE, DELETE 등 현재 트리거 이벤트 이름
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 5-1. 직원 입력값 검증: BEFORE INSERT OR UPDATE
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION tg_validate_employee()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.salary < 2500000 THEN
        RAISE EXCEPTION '월 급여는 2,500,000원 이상이어야 합니다.'
            USING ERRCODE = '23514';
    END IF;

    IF NEW.manager_id IS NOT NULL
       AND NEW.manager_id = NEW.employee_id THEN
        RAISE EXCEPTION '직원 자신을 관리자로 지정할 수 없습니다.'
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_10_validate_employee
BEFORE INSERT OR UPDATE ON employees
FOR EACH ROW
EXECUTE FUNCTION tg_validate_employee();


-- ----------------------------------------------------------------------------
-- 5-2. 수정 시각 자동 갱신: 여러 테이블에서 재사용하는 BEFORE 트리거 함수
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION tg_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := clock_timestamp();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_20_employees_updated_at
BEFORE UPDATE ON employees
FOR EACH ROW
EXECUTE FUNCTION tg_set_updated_at();

CREATE TRIGGER trg_20_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION tg_set_updated_at();

CREATE TRIGGER trg_20_orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION tg_set_updated_at();


-- ----------------------------------------------------------------------------
-- 5-3. 급여 변경 감사 이력: AFTER UPDATE OF salary
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION tg_audit_salary_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO employee_salary_audit
        (employee_id, old_salary, new_salary)
    VALUES
        (NEW.employee_id, OLD.salary, NEW.salary);

    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_30_audit_salary_change
AFTER UPDATE OF salary ON employees
FOR EACH ROW
WHEN (OLD.salary IS DISTINCT FROM NEW.salary)
EXECUTE FUNCTION tg_audit_salary_change();


-- ----------------------------------------------------------------------------
-- 5-4. 상품 재고 검증과 변경 감사
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION tg_validate_product_stock()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.stock_quantity < 0 THEN
        RAISE EXCEPTION '재고는 음수가 될 수 없습니다. product_id=%',
            NEW.product_id
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_10_validate_product_stock
BEFORE INSERT OR UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION tg_validate_product_stock();

CREATE OR REPLACE FUNCTION tg_audit_product_stock()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO product_stock_audit
        (product_id, old_quantity, new_quantity, quantity_delta)
    VALUES
        (NEW.product_id,
         OLD.stock_quantity,
         NEW.stock_quantity,
         NEW.stock_quantity - OLD.stock_quantity);
    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_30_audit_product_stock
AFTER UPDATE OF stock_quantity ON products
FOR EACH ROW
WHEN (OLD.stock_quantity IS DISTINCT FROM NEW.stock_quantity)
EXECUTE FUNCTION tg_audit_product_stock();


-- ----------------------------------------------------------------------------
-- 5-5. 주문 품목 준비: 상품의 현재 가격을 단가에 자동 입력
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION tg_prepare_order_item()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_price products.price%TYPE;
BEGIN
    IF NEW.quantity <= 0 THEN
        RAISE EXCEPTION '주문 수량은 1 이상이어야 합니다.'
            USING ERRCODE = '23514';
    END IF;

    SELECT price
      INTO STRICT v_current_price
      FROM products
     WHERE product_id = NEW.product_id;

    IF TG_OP = 'INSERT' THEN
        -- 입력 단가가 NULL이면 상품의 현재 가격을 주문 시점 단가로 저장한다.
        NEW.unit_price := coalesce(NEW.unit_price, v_current_price);
    ELSIF NEW.product_id IS DISTINCT FROM OLD.product_id THEN
        -- 품목의 상품 자체가 바뀌면 새 상품의 현재 가격을 사용한다.
        NEW.unit_price := v_current_price;
    ELSIF NEW.unit_price IS NULL THEN
        NEW.unit_price := OLD.unit_price;
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RAISE EXCEPTION '상품을 찾을 수 없습니다. product_id=%', NEW.product_id
            USING ERRCODE = 'P0002';
END;
$$;

CREATE TRIGGER trg_10_prepare_order_item
BEFORE INSERT OR UPDATE ON order_items
FOR EACH ROW
EXECUTE FUNCTION tg_prepare_order_item();


-- ----------------------------------------------------------------------------
-- 5-6. 주문 품목 INSERT/UPDATE/DELETE에 맞춰 상품 재고 자동 반영
--
-- UPDATE ... WHERE stock_quantity >= 필요수량 패턴은 확인과 차감을 한 문장에
-- 처리하므로 동시 주문 시 단순 SELECT 후 UPDATE하는 방식보다 안전하다.
-- 트리거에서 예외가 발생하면 원래 주문 품목 변경까지 함께 롤백된다.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION tg_apply_order_item_stock()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_affected integer;
    v_delta    integer;
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE products
           SET stock_quantity = stock_quantity - NEW.quantity
         WHERE product_id = NEW.product_id
           AND stock_quantity >= NEW.quantity;

        GET DIAGNOSTICS v_affected = ROW_COUNT;
        IF v_affected = 0 THEN
            RAISE EXCEPTION '상품 재고가 부족합니다. product_id=%, 요청=%',
                NEW.product_id, NEW.quantity
                USING ERRCODE = 'P0001';
        END IF;
        RETURN NULL;

    ELSIF TG_OP = 'DELETE' THEN
        UPDATE products
           SET stock_quantity = stock_quantity + OLD.quantity
         WHERE product_id = OLD.product_id;
        RETURN NULL;

    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.product_id = OLD.product_id THEN
            v_delta := NEW.quantity - OLD.quantity;

            IF v_delta > 0 THEN
                UPDATE products
                   SET stock_quantity = stock_quantity - v_delta
                 WHERE product_id = NEW.product_id
                   AND stock_quantity >= v_delta;

                GET DIAGNOSTICS v_affected = ROW_COUNT;
                IF v_affected = 0 THEN
                    RAISE EXCEPTION
                        '수량 증가에 필요한 재고가 부족합니다. product_id=%, 추가=%',
                        NEW.product_id, v_delta
                        USING ERRCODE = 'P0001';
                END IF;
            ELSIF v_delta < 0 THEN
                UPDATE products
                   SET stock_quantity = stock_quantity + abs(v_delta)
                 WHERE product_id = NEW.product_id;
            END IF;
        ELSE
            -- 상품이 바뀌면 기존 상품 재고를 먼저 복원하고 새 상품을 차감한다.
            UPDATE products
               SET stock_quantity = stock_quantity + OLD.quantity
             WHERE product_id = OLD.product_id;

            UPDATE products
               SET stock_quantity = stock_quantity - NEW.quantity
             WHERE product_id = NEW.product_id
               AND stock_quantity >= NEW.quantity;

            GET DIAGNOSTICS v_affected = ROW_COUNT;
            IF v_affected = 0 THEN
                RAISE EXCEPTION '변경할 상품의 재고가 부족합니다. product_id=%',
                    NEW.product_id
                    USING ERRCODE = 'P0001';
            END IF;
        END IF;
        RETURN NULL;
    END IF;

    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_30_apply_order_item_stock
AFTER INSERT OR UPDATE OR DELETE ON order_items
FOR EACH ROW
EXECUTE FUNCTION tg_apply_order_item_stock();


-- ----------------------------------------------------------------------------
-- 5-7. 주문 상태 변경 이력: INSERT와 실제 상태 변경 시에만 기록
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION tg_record_order_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO order_status_history(order_id, old_status, new_status)
        VALUES (NEW.order_id, NULL, NEW.order_status);
    ELSIF OLD.order_status IS DISTINCT FROM NEW.order_status THEN
        INSERT INTO order_status_history(order_id, old_status, new_status)
        VALUES (NEW.order_id, OLD.order_status, NEW.order_status);
    END IF;

    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_30_record_order_status
AFTER INSERT OR UPDATE OF order_status ON orders
FOR EACH ROW
EXECUTE FUNCTION tg_record_order_status();


-- ============================================================================
-- 6. 프로시저(PROCEDURE)
--
-- 프로시저의 특징
--   - CALL 문으로 실행한다.
--   - 반환값보다 "업무 명령"이나 여러 데이터 변경을 표현할 때 적합하다.
--   - 함수와 달리 최상위 CALL 등 허용된 문맥에서는 COMMIT/ROLLBACK 같은
--     트랜잭션 제어가 가능하다. 단, 이 실습 프로시저는 호출자가 전체 작업의
--     트랜잭션을 관리하도록 내부 COMMIT/ROLLBACK을 사용하지 않는다.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 6-1. 부서 단위 급여 인상
--      급여 UPDATE가 실행되면 앞서 만든 급여 감사 트리거도 함께 동작한다.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE pr_raise_department_salary(
    p_department_code varchar,
    p_raise_percent numeric
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_department_id departments.department_id%TYPE;
    v_affected      integer;
BEGIN
    IF p_raise_percent <= 0 OR p_raise_percent > 20 THEN
        RAISE EXCEPTION '인상률은 0 초과 20 이하만 가능합니다: %',
            p_raise_percent
            USING ERRCODE = '22023';
    END IF;

    SELECT department_id
      INTO STRICT v_department_id
      FROM departments
     WHERE department_code = upper(btrim(p_department_code));

    UPDATE employees
       SET salary = round(salary * (1 + p_raise_percent / 100.0), 2)
     WHERE department_id = v_department_id;

    GET DIAGNOSTICS v_affected = ROW_COUNT;
    RAISE NOTICE '% 부서의 %명 급여를 %퍼센트 인상했습니다.',
        upper(btrim(p_department_code)), v_affected, p_raise_percent;
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RAISE EXCEPTION '부서를 찾을 수 없습니다: %', p_department_code
            USING ERRCODE = 'P0002';
END;
$$;


-- ----------------------------------------------------------------------------
-- 6-2. 단일 상품 간편 주문 생성
--      주문/품목 INSERT -> 상태 이력·현재 가격·재고·재고 감사 트리거 연동
-- ----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE pr_create_simple_order(
    p_customer_email varchar,
    p_product_code varchar,
    p_quantity integer
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_customer_id customers.customer_id%TYPE;
    v_product_id  products.product_id%TYPE;
    v_order_id    orders.order_id%TYPE;
BEGIN
    IF p_quantity <= 0 THEN
        RAISE EXCEPTION '주문 수량은 1 이상이어야 합니다.'
            USING ERRCODE = '22023';
    END IF;

    SELECT customer_id
      INTO STRICT v_customer_id
      FROM customers
     WHERE email = lower(btrim(p_customer_email));

    SELECT product_id
      INTO STRICT v_product_id
      FROM products
     WHERE product_code = upper(btrim(p_product_code));

    INSERT INTO orders(customer_id)
    VALUES (v_customer_id)
    RETURNING order_id INTO v_order_id;

    -- unit_price는 BEFORE 트리거가 상품의 현재 가격으로 채운다.
    INSERT INTO order_items(order_id, product_id, quantity, unit_price)
    VALUES (v_order_id, v_product_id, p_quantity, NULL);

    RAISE NOTICE '주문 생성 완료: order_id=%, 주문합계=%',
        v_order_id, fn_order_total(v_order_id);
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RAISE EXCEPTION '고객 또는 상품을 찾을 수 없습니다. customer=%, product=%',
            p_customer_email, p_product_code
            USING ERRCODE = 'P0002';
END;
$$;


-- ----------------------------------------------------------------------------
-- 6-3. 허용된 흐름에 따라 주문 상태 변경
--      SELECT ... FOR UPDATE는 변경 대상 주문을 잠가 동시 수정을 직렬화한다.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE pr_change_order_status(
    p_order_id bigint,
    p_new_status varchar
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_old_status orders.order_status%TYPE;
    v_new_status orders.order_status%TYPE := upper(btrim(p_new_status));
    v_allowed    boolean := false;
BEGIN
    SELECT order_status
      INTO STRICT v_old_status
      FROM orders
     WHERE order_id = p_order_id
     FOR UPDATE;

    IF v_old_status = v_new_status THEN
        RAISE NOTICE '주문 %는 이미 % 상태입니다.', p_order_id, v_new_status;
        RETURN;
    END IF;

    v_allowed := CASE
        WHEN v_old_status = 'PENDING'
             AND v_new_status IN ('PAID', 'CANCELLED') THEN true
        WHEN v_old_status = 'PAID'
             AND v_new_status IN ('SHIPPED', 'CANCELLED') THEN true
        WHEN v_old_status = 'SHIPPED'
             AND v_new_status = 'COMPLETED' THEN true
        ELSE false
    END;

    IF NOT v_allowed THEN
        RAISE EXCEPTION '허용되지 않은 상태 변경입니다: % -> %',
            v_old_status, v_new_status
            USING ERRCODE = 'P0001';
    END IF;

    UPDATE orders
       SET order_status = v_new_status
     WHERE order_id = p_order_id;

    RAISE NOTICE '주문 % 상태 변경: % -> %',
        p_order_id, v_old_status, v_new_status;
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RAISE EXCEPTION '주문을 찾을 수 없습니다: %', p_order_id
            USING ERRCODE = 'P0002';
END;
$$;


-- ============================================================================
-- 7. 통합 실행 예제
-- ============================================================================

-- 프로시저 -> 직원 UPDATE -> 수정 시각 트리거 + 급여 감사 트리거
CALL pr_raise_department_salary('DEV', 3.5);

-- 프로시저 -> 주문/품목 INSERT -> 가격 입력 + 재고 차감 + 각종 이력 트리거
CALL pr_create_simple_order('kim@example.com', 'NOTE-001', 2);
CALL pr_create_simple_order('hong@example.com', 'KEY-001', 3);

-- 가장 최근 주문을 PENDING -> PAID -> SHIPPED -> COMPLETED로 변경한다.
-- 프로시저의 상태 규칙과 주문 상태 이력 트리거를 함께 확인한다.
DO $$
DECLARE
    v_order_id orders.order_id%TYPE;
BEGIN
    SELECT max(order_id) INTO v_order_id FROM orders;
    CALL pr_change_order_status(v_order_id, 'PAID');
    CALL pr_change_order_status(v_order_id, 'SHIPPED');
    CALL pr_change_order_status(v_order_id, 'COMPLETED');
END;
$$ LANGUAGE plpgsql;

-- 재고 부족 예외를 확인하되 전체 파일은 중단하지 않는다.
-- 프로시저 호출에서 발생한 예외 때문에 주문·품목 입력도 함께 롤백된다.
DO $$
BEGIN
    CALL pr_create_simple_order('kim@example.com', 'NOTE-001', 9999);
EXCEPTION
    WHEN SQLSTATE 'P0001' THEN
        RAISE NOTICE '의도적으로 잡은 재고 부족 예외: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- 8. 최종 결과 확인
-- ============================================================================

-- 8-1. 함수 결과
SELECT * FROM fn_employee_summary('backend@example.com');
SELECT * FROM fn_department_salary_stats();

-- 8-2. 직원 급여와 자동 수정 시각
SELECT e.employee_id,
       d.department_code,
       e.employee_name,
       e.salary,
       e.performance_rating,
       e.updated_at
  FROM employees AS e
  JOIN departments AS d USING (department_id)
 ORDER BY e.employee_id;

-- 8-3. 급여 감사 이력: 프로시저가 아닌 트리거가 자동 기록
SELECT a.audit_id,
       e.employee_name,
       a.old_salary,
       a.new_salary,
       a.changed_by,
       a.changed_at
  FROM employee_salary_audit AS a
  JOIN employees AS e USING (employee_id)
 ORDER BY a.audit_id;

-- 8-4. 주문 상세와 함수로 계산한 주문 합계
SELECT o.order_id,
       c.customer_name,
       o.order_status,
       p.product_name,
       oi.quantity,
       oi.unit_price,
       oi.line_total,
       fn_order_total(o.order_id) AS order_total
  FROM orders AS o
  JOIN customers AS c USING (customer_id)
  JOIN order_items AS oi USING (order_id)
  JOIN products AS p USING (product_id)
 ORDER BY o.order_id, oi.order_item_id;

-- 8-5. 주문으로 차감된 현재 재고와 재고 변경 감사 이력
SELECT product_id, product_code, product_name, stock_quantity, updated_at
  FROM products
 ORDER BY product_id;

SELECT a.stock_audit_id,
       p.product_code,
       a.old_quantity,
       a.new_quantity,
       a.quantity_delta,
       a.changed_at
  FROM product_stock_audit AS a
  JOIN products AS p USING (product_id)
 ORDER BY a.stock_audit_id;

-- 8-6. 주문 상태 변경 이력
SELECT history_id,
       order_id,
       old_status,
       new_status,
       changed_by,
       changed_at
  FROM order_status_history
 ORDER BY history_id;


/*
===============================================================================
 [함수·프로시저·트리거 선택 기준 요약]

 FUNCTION
   - 질문: "값이나 조회 결과를 돌려받아 SQL에서 사용해야 하는가?"
   - 호출: SELECT fn_order_total(1);
   - 예: 계산, 데이터 변환, 조회 로직 캡슐화

 PROCEDURE
   - 질문: "업무 명령으로 여러 변경 작업을 순서대로 수행하는가?"
   - 호출: CALL pr_raise_department_salary('DEV', 3.5);
   - 예: 주문 처리, 마감 처리, 일괄 상태 변경

 TRIGGER
   - 질문: "특정 테이블 이벤트 때 누락 없이 자동 실행되어야 하는가?"
   - 호출: 직접 호출하지 않음. INSERT/UPDATE/DELETE가 발생시키는 방식
   - 예: 유효성 검증, updated_at, 감사 이력, 파생 작업

 [실무 주의 사항]
   1. 트리거에 너무 많은 업무 로직을 숨기면 실행 흐름과 장애 원인 파악이
      어려워진다. 무조건 적용할 무결성·감사 로직 중심으로 사용한다.
   2. 행 수준 트리거는 벌크 작업의 각 행마다 실행되므로 성능을 측정한다.
   3. WHEN OTHERS로 모든 오류를 무조건 삼키지 않는다. 처리할 수 없다면
      RAISE로 다시 발생시켜 데이터 불일치를 막는다.
   4. 함수의 IMMUTABLE/STABLE/VOLATILE 표시는 실제 동작과 맞아야 한다.
   5. 프로시저 내부 COMMIT/ROLLBACK은 호출 문맥의 제약이 있으므로,
      서비스 애플리케이션에서는 보통 서비스 계층이 트랜잭션을 관리한다.
   6. SECURITY DEFINER 함수·프로시저를 사용할 때는 권한과 search_path를
      반드시 안전하게 고정해야 한다.
===============================================================================
*/
