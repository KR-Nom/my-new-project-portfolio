/* ============================================================
   Q1~Q10 성능 비교
   대상: Q1, Q2, Q4, Q5, Q6, Q7, Q8, Q9, Q10
   Q3은 기존 Before/After 캡처 사용

   BEFORE:
   추가 생성한 인덱스 4개를 Transaction 안에서 제거

   AFTER:
   ROLLBACK으로 인덱스를 원상복구한 뒤 동일 SQL 재실행
   ============================================================ */


/* ============================================================
   1. BEFORE 환경 구성
   ============================================================ */

BEGIN;

DROP INDEX IF EXISTS ecom.idx_orders_status_ts;
DROP INDEX IF EXISTS ecom.idx_order_items_order_id;
DROP INDEX IF EXISTS ecom.idx_order_items_product_id;
DROP INDEX IF EXISTS ecom.idx_products_category_id;


/* ============================================================
   BEFORE - Q1
   최근 1개월 실제 판매금액
   ============================================================ */

SELECT '===== BEFORE Q1 =====' AS section;

EXPLAIN (ANALYZE, BUFFERS)
SELECT
    SUM(oi.line_total) AS total_sales
FROM ecom.orders o
JOIN ecom.order_items oi
    ON o.order_id = oi.order_id
WHERE o.order_status IN ('paid', 'shipped', 'delivered')
  AND o.order_ts >= now() - interval '1 month';


/* ============================================================
   BEFORE - Q2
   월별 주문 수 / 매출 / AOV
   ============================================================ */

SELECT '===== BEFORE Q2 =====' AS section;

EXPLAIN (ANALYZE, BUFFERS)
SELECT
    TO_CHAR(date_trunc('month', o.order_ts), 'YYYY-MM') AS month,
    COUNT(DISTINCT o.order_id) AS order_count,
    SUM(oi.line_total) AS revenue,
    ROUND(
        SUM(oi.line_total) / COUNT(DISTINCT o.order_id),
        2
    ) AS aov
FROM ecom.orders o
JOIN ecom.order_items oi
    ON o.order_id = oi.order_id
WHERE o.order_status IN ('paid', 'shipped', 'delivered')
  AND o.order_ts < date_trunc('month', now())
GROUP BY date_trunc('month', o.order_ts)
ORDER BY date_trunc('month', o.order_ts) DESC;


/* ============================================================
   BEFORE - Q4
   제품별 누적매출 RANK Top20
   ============================================================ */

SELECT '===== BEFORE Q4 =====' AS section;

EXPLAIN (ANALYZE, BUFFERS)
WITH product_sales AS (
    SELECT
        p.product_id,
        p.product_name,
        SUM(oi.line_total) AS revenue
    FROM ecom.orders o
    JOIN ecom.order_items oi
        ON o.order_id = oi.order_id
    JOIN ecom.products p
        ON oi.product_id = p.product_id
    WHERE o.order_status IN ('paid', 'shipped', 'delivered')
    GROUP BY
        p.product_id,
        p.product_name
),
ranked_products AS (
    SELECT
        product_id,
        product_name,
        revenue,
        RANK() OVER (
            ORDER BY revenue DESC
        ) AS sales_rank
    FROM product_sales
)
SELECT
    product_id,
    product_name,
    revenue,
    sales_rank
FROM ranked_products
WHERE sales_rank <= 20
ORDER BY sales_rank;


/* ============================================================
   BEFORE - Q5
   고객 RFM
   ============================================================ */

SELECT '===== BEFORE Q5 =====' AS section;

EXPLAIN (ANALYZE, BUFFERS)
SELECT
    c.customer_id,
    c.full_name,
    CURRENT_DATE - MAX(o.order_ts)::date AS recency,
    COUNT(DISTINCT o.order_id) AS frequency,
    SUM(oi.line_total) AS monetary
FROM ecom.customers c
JOIN ecom.orders o
    ON c.customer_id = o.customer_id
JOIN ecom.order_items oi
    ON o.order_id = oi.order_id
WHERE o.order_status IN ('paid', 'shipped', 'delivered')
GROUP BY
    c.customer_id,
    c.full_name
ORDER BY
    monetary DESC,
    frequency DESC,
    recency ASC;


/* ============================================================
   BEFORE - Q6
   첫 구매 후 30일 재구매율
   ============================================================ */

SELECT '===== BEFORE Q6 =====' AS section;

EXPLAIN (ANALYZE, BUFFERS)
WITH first_purchase AS (
    SELECT
        customer_id,
        MIN(order_ts) AS first_purchase_ts
    FROM ecom.orders
    WHERE order_status IN ('paid', 'shipped', 'delivered')
    GROUP BY customer_id
),
repurchase_check AS (
    SELECT
        fp.customer_id,
        EXISTS (
            SELECT 1
            FROM ecom.orders o
            WHERE o.customer_id = fp.customer_id
              AND o.order_status IN ('paid', 'shipped', 'delivered')
              AND o.order_ts > fp.first_purchase_ts
              AND o.order_ts <= fp.first_purchase_ts
                                  + interval '30 days'
        ) AS repurchased_30d
    FROM first_purchase fp
)
SELECT
    COUNT(*) AS first_purchase_customers,
    COUNT(*) FILTER (
        WHERE repurchased_30d
    ) AS repurchase_customers_30d,
    ROUND(
        100.0
        * COUNT(*) FILTER (WHERE repurchased_30d)
        / NULLIF(COUNT(*), 0),
        2
    ) AS repurchase_rate_30d_pct
FROM repurchase_check;


/* ============================================================
   BEFORE - Q7
   재고 부족 상품
   ============================================================ */

SELECT '===== BEFORE Q7 =====' AS section;

EXPLAIN (ANALYZE, BUFFERS)
SELECT
    p.product_id,
    p.product_name,
    i.qty_on_hand,
    i.reorder_point,
    i.reorder_point - i.qty_on_hand AS shortage_qty
FROM ecom.inventory i
JOIN ecom.products p
    ON i.product_id = p.product_id
WHERE i.qty_on_hand < i.reorder_point
ORDER BY shortage_qty DESC;


/* ============================================================
   BEFORE - Q8
   리뷰 기반 효자상품
   ============================================================ */

SELECT '===== BEFORE Q8 =====' AS section;

EXPLAIN (ANALYZE, BUFFERS)
SELECT
    p.product_id,
    p.product_name,
    ROUND(AVG(r.rating), 2) AS avg_rating,
    COUNT(*) AS review_count
FROM ecom.reviews r
JOIN ecom.products p
    ON r.product_id = p.product_id
GROUP BY
    p.product_id,
    p.product_name
HAVING AVG(r.rating) >= 4.5
   AND COUNT(*) >= 50
ORDER BY
    avg_rating DESC,
    review_count DESC;


/* ============================================================
   BEFORE - Q9
   쿠폰 사용 / 미사용 AOV
   ============================================================ */

SELECT '===== BEFORE Q9 =====' AS section;

EXPLAIN (ANALYZE, BUFFERS)
WITH order_totals AS (
    SELECT
        o.order_id,
        CASE
            WHEN o.coupon_code IS NOT NULL THEN 'coupon'
            ELSE 'no_coupon'
        END AS coupon_type,
        SUM(oi.line_total) AS order_amount
    FROM ecom.orders o
    JOIN ecom.order_items oi
        ON o.order_id = oi.order_id
    WHERE o.order_status IN ('paid', 'shipped', 'delivered')
    GROUP BY
        o.order_id,
        o.coupon_code
)
SELECT
    coupon_type,
    COUNT(*) AS order_count,
    ROUND(AVG(order_amount), 2) AS avg_order_amount
FROM order_totals
GROUP BY coupon_type
ORDER BY avg_order_amount DESC;


/* ============================================================
   BEFORE - Q10
   상위 1% 고객 최근 60일 매출
   ============================================================ */

SELECT '===== BEFORE Q10 =====' AS section;

EXPLAIN (ANALYZE, BUFFERS)
WITH customer_sales AS (
    SELECT
        c.customer_id,
        COALESCE(SUM(oi.line_total), 0) AS total_revenue
    FROM ecom.customers c
    LEFT JOIN ecom.orders o
        ON c.customer_id = o.customer_id
       AND o.order_status IN ('paid', 'shipped', 'delivered')
    LEFT JOIN ecom.order_items oi
        ON o.order_id = oi.order_id
    GROUP BY c.customer_id
),
ranked_customers AS (
    SELECT
        customer_id,
        total_revenue,
        ROW_NUMBER() OVER (
            ORDER BY total_revenue DESC, customer_id
        ) AS rn,
        COUNT(*) OVER () AS customer_count
    FROM customer_sales
),
top_1pct AS (
    SELECT
        customer_id
    FROM ranked_customers
    WHERE rn <= CEIL(customer_count * 0.01)
)
SELECT
    (SELECT COUNT(*) FROM top_1pct) AS top_1pct_customers,
    ROUND(
        COALESCE(SUM(oi.line_total), 0),
        2
    ) AS recent_60d_sales
FROM top_1pct tc
JOIN ecom.orders o
    ON tc.customer_id = o.customer_id
JOIN ecom.order_items oi
    ON o.order_id = oi.order_id
WHERE o.order_status IN ('paid', 'shipped', 'delivered')
  AND o.order_ts >= now() - interval '60 days';


/* ============================================================
   2. BEFORE 종료
   DROP INDEX 전부 원상복구
   ============================================================ */

ROLLBACK;


/* ============================================================
   3. AFTER
   인덱스가 다시 존재하는 원래 상태에서 동일 SQL 실행
   ============================================================ */


/* ================= AFTER Q1 ================= */

SELECT '===== AFTER Q1 =====' AS section;

EXPLAIN (ANALYZE, BUFFERS)
SELECT
    SUM(oi.line_total) AS total_sales
FROM ecom.orders o
JOIN ecom.order_items oi
    ON o.order_id = oi.order_id
WHERE o.order_status IN ('paid', 'shipped', 'delivered')
  AND o.order_ts >= now() - interval '1 month';


/* ================= AFTER Q2 ================= */

SELECT '===== AFTER Q2 =====' AS section;

EXPLAIN (ANALYZE, BUFFERS)
SELECT
    TO_CHAR(date_trunc('month', o.order_ts), 'YYYY-MM') AS month,
    COUNT(DISTINCT o.order_id) AS order_count,
    SUM(oi.line_total) AS revenue,
    ROUND(
        SUM(oi.line_total) / COUNT(DISTINCT o.order_id),
        2
    ) AS aov
FROM ecom.orders o
JOIN ecom.order_items oi
    ON o.order_id = oi.order_id
WHERE o.order_status IN ('paid', 'shipped', 'delivered')
  AND o.order_ts < date_trunc('month', now())
GROUP BY date_trunc('month', o.order_ts)
ORDER BY date_trunc('month', o.order_ts) DESC;


/* ================= AFTER Q4 ================= */

SELECT '===== AFTER Q4 =====' AS section;

EXPLAIN (ANALYZE, BUFFERS)
WITH product_sales AS (
    SELECT
        p.product_id,
        p.product_name,
        SUM(oi.line_total) AS revenue
    FROM ecom.orders o
    JOIN ecom.order_items oi
        ON o.order_id = oi.order_id
    JOIN ecom.products p
        ON oi.product_id = p.product_id
    WHERE o.order_status IN ('paid', 'shipped', 'delivered')
    GROUP BY
        p.product_id,
        p.product_name
),
ranked_products AS (
    SELECT
        product_id,
        product_name,
        revenue,
        RANK() OVER (
            ORDER BY revenue DESC
        ) AS sales_rank
    FROM product_sales
)
SELECT
    product_id,
    product_name,
    revenue,
    sales_rank
FROM ranked_products
WHERE sales_rank <= 20
ORDER BY sales_rank;


/* ================= AFTER Q5 ================= */

SELECT '===== AFTER Q5 =====' AS section;

EXPLAIN (ANALYZE, BUFFERS)
SELECT
    c.customer_id,
    c.full_name,
    CURRENT_DATE - MAX(o.order_ts)::date AS recency,
    COUNT(DISTINCT o.order_id) AS frequency,
    SUM(oi.line_total) AS monetary
FROM ecom.customers c
JOIN ecom.orders o
    ON c.customer_id = o.customer_id
JOIN ecom.order_items oi
    ON o.order_id = oi.order_id
WHERE o.order_status IN ('paid', 'shipped', 'delivered')
GROUP BY
    c.customer_id,
    c.full_name
ORDER BY
    monetary DESC,
    frequency DESC,
    recency ASC;


/* ================= AFTER Q6 ================= */

SELECT '===== AFTER Q6 =====' AS section;

EXPLAIN (ANALYZE, BUFFERS)
WITH first_purchase AS (
    SELECT
        customer_id,
        MIN(order_ts) AS first_purchase_ts
    FROM ecom.orders
    WHERE order_status IN ('paid', 'shipped', 'delivered')
    GROUP BY customer_id
),
repurchase_check AS (
    SELECT
        fp.customer_id,
        EXISTS (
            SELECT 1
            FROM ecom.orders o
            WHERE o.customer_id = fp.customer_id
              AND o.order_status IN ('paid', 'shipped', 'delivered')
              AND o.order_ts > fp.first_purchase_ts
              AND o.order_ts <= fp.first_purchase_ts
                                  + interval '30 days'
        ) AS repurchased_30d
    FROM first_purchase fp
)
SELECT
    COUNT(*) AS first_purchase_customers,
    COUNT(*) FILTER (
        WHERE repurchased_30d
    ) AS repurchase_customers_30d,
    ROUND(
        100.0
        * COUNT(*) FILTER (WHERE repurchased_30d)
        / NULLIF(COUNT(*), 0),
        2
    ) AS repurchase_rate_30d_pct
FROM repurchase_check;


/* ================= AFTER Q7 ================= */

SELECT '===== AFTER Q7 =====' AS section;

EXPLAIN (ANALYZE, BUFFERS)
SELECT
    p.product_id,
    p.product_name,
    i.qty_on_hand,
    i.reorder_point,
    i.reorder_point - i.qty_on_hand AS shortage_qty
FROM ecom.inventory i
JOIN ecom.products p
    ON i.product_id = p.product_id
WHERE i.qty_on_hand < i.reorder_point
ORDER BY shortage_qty DESC;


/* ================= AFTER Q8 ================= */

SELECT '===== AFTER Q8 =====' AS section;

EXPLAIN (ANALYZE, BUFFERS)
SELECT
    p.product_id,
    p.product_name,
    ROUND(AVG(r.rating), 2) AS avg_rating,
    COUNT(*) AS review_count
FROM ecom.reviews r
JOIN ecom.products p
    ON r.product_id = p.product_id
GROUP BY
    p.product_id,
    p.product_name
HAVING AVG(r.rating) >= 4.5
   AND COUNT(*) >= 50
ORDER BY
    avg_rating DESC,
    review_count DESC;


/* ================= AFTER Q9 ================= */

SELECT '===== AFTER Q9 =====' AS section;

EXPLAIN (ANALYZE, BUFFERS)
WITH order_totals AS (
    SELECT
        o.order_id,
        CASE
            WHEN o.coupon_code IS NOT NULL THEN 'coupon'
            ELSE 'no_coupon'
        END AS coupon_type,
        SUM(oi.line_total) AS order_amount
    FROM ecom.orders o
    JOIN ecom.order_items oi
        ON o.order_id = oi.order_id
    WHERE o.order_status IN ('paid', 'shipped', 'delivered')
    GROUP BY
        o.order_id,
        o.coupon_code
)
SELECT
    coupon_type,
    COUNT(*) AS order_count,
    ROUND(AVG(order_amount), 2) AS avg_order_amount
FROM order_totals
GROUP BY coupon_type
ORDER BY avg_order_amount DESC;


/* ================= AFTER Q10 ================= */

SELECT '===== AFTER Q10 =====' AS section;

EXPLAIN (ANALYZE, BUFFERS)
WITH customer_sales AS (
    SELECT
        c.customer_id,
        COALESCE(SUM(oi.line_total), 0) AS total_revenue
    FROM ecom.customers c
    LEFT JOIN ecom.orders o
        ON c.customer_id = o.customer_id
       AND o.order_status IN ('paid', 'shipped', 'delivered')
    LEFT JOIN ecom.order_items oi
        ON o.order_id = oi.order_id
    GROUP BY c.customer_id
),
ranked_customers AS (
    SELECT
        customer_id,
        total_revenue,
        ROW_NUMBER() OVER (
            ORDER BY total_revenue DESC, customer_id
        ) AS rn,
        COUNT(*) OVER () AS customer_count
    FROM customer_sales
),
top_1pct AS (
    SELECT
        customer_id
    FROM ranked_customers
    WHERE rn <= CEIL(customer_count * 0.01)
)
SELECT
    (SELECT COUNT(*) FROM top_1pct) AS top_1pct_customers,
    ROUND(
        COALESCE(SUM(oi.line_total), 0),
        2
    ) AS recent_60d_sales
FROM top_1pct tc
JOIN ecom.orders o
    ON tc.customer_id = o.customer_id
JOIN ecom.order_items oi
    ON o.order_id = oi.order_id
WHERE o.order_status IN ('paid', 'shipped', 'delivered')
  AND o.order_ts >= now() - interval '60 days';