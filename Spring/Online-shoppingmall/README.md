# SKALA-SHOP API

Spring Boot의 REST API, JPA 계층 구조, JWT, 예외 처리와 트랜잭션을 학습하기 위한 온라인 쇼핑몰 백엔드입니다.

## 기술과 구조

- Java 17, Spring Boot 3.3.0, Gradle
- Spring Web, Spring Data JPA, H2, Lombok, Actuator, AOP
- JJWT 0.11.5 (Spring Security는 사용하지 않음)
- springdoc-openapi Swagger UI
- 요청 흐름: `Controller → Service → Repository → H2`

핵심 엔터티는 상품 `Product`, 고객 `Customer`, 고객별 주문 상품 `OrderItem`입니다.

## 실행

```bash
export JWT_SECRET="$(openssl rand -hex 32)"
./gradlew bootRun
```

기본 주소는 `http://localhost:8080`입니다. 상태 확인은 `GET /actuator/health`로 할 수 있습니다.

회원가입·로그인 데모 화면은 `http://localhost:8080/`에서 사용할 수 있습니다.
Swagger UI는 서버 실행 후 `http://localhost:8080/swagger-ui.html`에서 확인합니다.
OpenAPI JSON은 `http://localhost:8080/v3/api-docs`에서 확인할 수 있습니다.

## Docker 실행

Docker Desktop이 실행 중인 상태에서 프로젝트 루트에서 다음 명령을 사용합니다.

```bash
export JWT_SECRET="$(openssl rand -hex 32)"
docker compose up --build -d
```

이미 8080 포트를 사용 중이라면 다음처럼 호스트 포트만 변경할 수 있습니다.

```bash
HOST_PORT=8081 docker compose up --build -d
```

실행 상태와 로그를 확인합니다.

```bash
docker compose ps
docker compose logs -f shopping-mall
```

실행 후 접속 주소는 로컬 실행과 동일합니다.

- 쇼핑몰: `http://localhost:8080`
- Swagger UI: `http://localhost:8080/swagger-ui.html`
- 상태 확인: `http://localhost:8080/actuator/health`

컨테이너를 종료할 때는 다음 명령을 사용합니다.

```bash
docker compose down
```

다른 PC에서 실행하려면 프로젝트 폴더를 Git 저장소 또는 압축 파일로 옮긴 뒤
해당 PC에서 `JWT_SECRET`을 설정한 뒤 `docker compose up --build -d`를 실행합니다. 같은 공유기 안의 다른
기기에서는 서버를 실행한 PC의 내부 IP를 사용해 `http://내부IP:8080`으로 접속합니다.

Docker Hub에 이미지를 올리는 경우에는 다음 순서로 실행합니다.

```bash
docker login
docker build -t DOCKER_HUB_ID/skala-shopping-mall:latest .
docker push DOCKER_HUB_ID/skala-shopping-mall:latest
```

다른 PC에서는 소스 코드 없이 이미지만 내려받아 실행할 수 있습니다.

```bash
docker run -d \
  --name skala-shopping-mall \
  -p 8080:8080 \
  -e JWT_SECRET="충분히-긴-운영용-비밀키를-입력하세요" \
  DOCKER_HUB_ID/skala-shopping-mall:latest
```

현재 데이터베이스는 H2 인메모리 방식이므로 컨테이너를 재시작하면 주문과 회원
데이터가 초기화됩니다. 영구 보관이 필요하면 PostgreSQL 또는 MySQL 연결 구성이
추가로 필요합니다.

H2 Console은 `http://localhost:8080/h2-console`에서 아래 값으로 접속합니다.

- JDBC URL: `jdbc:h2:mem:shopdb`
- User Name: `sa`
- Password: 비워 둠

## API

| Method | URI | 기능 |
|---|---|---|
| GET | `/api/products`, `/api/products/list` | 상품 목록 |
| GET | `/api/products/{id}` | 상품 상세 |
| POST | `/api/products` | 상품 등록 |
| PUT | `/api/products` | 상품 수정 |
| DELETE | `/api/products/{id}` | 상품 삭제 |
| GET | `/api/products/rankings?limit=5` | 순판매량 기준 상품 판매 순위 |
| GET | `/api/products/low-stock?threshold=5` | 품절 임박 상품 조회(재고 1~threshold) |
| GET | `/api/customers`, `/api/customers/list` | 고객 목록 |
| GET | `/api/customers/{customerId}` | 고객 및 주문 내역 |
| POST | `/api/customers` | 회원가입 |
| POST | `/api/customers/login` | 로그인 |
| PUT | `/api/customers` | 고객 포인트 수정 |
| DELETE | `/api/customers/{customerId}` | 고객 삭제 |
| POST | `/api/customers/order` | 상품 주문 |
| POST | `/api/customers/cancel` | 주문 취소 |
| GET | `/api/customers/recent-products` | 로그인 고객 최근 본 상품(최대 5개) |

목록 API의 `offset`은 페이지 번호이고 `count`는 페이지 크기입니다(기본값 0, 10).

## curl 테스트 순서

```bash
# 1. 회원가입: 초기 포인트 1,000,000
curl -X POST http://localhost:8080/api/customers \
  -H 'Content-Type: application/json' \
  -d '{"customerId":"skala01","customerPassword":"pw1234"}'

# 2. 로그인하고 JWT Cookie 저장
curl -c cookies.txt -X POST http://localhost:8080/api/customers/login \
  -H 'Content-Type: application/json' \
  -d '{"customerId":"skala01","customerPassword":"pw1234"}'

# 3. 초기 상품 목록
curl http://localhost:8080/api/products

# 4. 15,000원 상품 2개 주문
curl -b cookies.txt -X POST http://localhost:8080/api/customers/order \
  -H 'Content-Type: application/json' \
  -d '{"productId":1,"quantity":2}'

# 5. 고객 주문 내역과 잔여 포인트 970,000 확인
curl http://localhost:8080/api/customers/skala01

# 6. 상품 1개 취소
curl -b cookies.txt -X POST http://localhost:8080/api/customers/cancel \
  -H 'Content-Type: application/json' \
  -d '{"productId":1,"quantity":1}'
```

Postman에서는 로그인 응답의 `bff-access` Cookie가 같은 호스트의 주문·취소 요청에 전달되는지 확인합니다.
Swagger UI에서도 먼저 회원가입과 로그인을 실행하면 브라우저가 로그인 Cookie를 저장하므로 같은 화면에서 주문과 취소를 테스트할 수 있습니다.

## 주요 규칙과 구현 결정

- 회원가입 시 포인트를 1,000,000으로 설정합니다.
- 주문은 포인트 차감과 수량 저장을, 취소는 수량 변경과 포인트 환급을 각각 한 트랜잭션으로 처리합니다.
- 같은 상품을 다시 주문하면 기존 주문 수량에 누적합니다.
- 고객 삭제 전에 해당 고객의 주문 항목을 삭제합니다.
- 비밀번호는 JSON 응답에서 제외합니다. 학습 예제라 평문 비교를 사용하지만 실제 서비스에서는 반드시 안전하게 해시해야 합니다.
- 자료에서 혼용된 저장소 이름은 `OrderItemRepository`로 통일했고, `java.lang.Error`와 혼동되는 이름은 `ErrorCode`로 바꿨습니다.
- 고객 이름 필드가 없으므로 customerName 검색 API는 두지 않았고, 주문 목록은 고객 상세 응답에 포함했습니다.
- 주문 성공 시 재고와 포인트를 함께 차감하고 `SalesHistory(ORDER)`를 기록합니다. 취소 시 재고·포인트를 복구하고 `SalesHistory(CANCEL)`을 기록하여 순판매량을 계산합니다.
- 상품 상세 조회 시 로그인 고객의 최근 본 상품을 중복 없이 최대 5개 유지합니다. 신규 상품은 프론트에서 이미지 준비중으로 표시합니다.
- 삭제는 요청 본문 대신 경로 변수 방식으로 제공합니다.
