const statusDot = document.querySelector("#statusDot");
const statusTitle = document.querySelector("#statusTitle");
const statusMessage = document.querySelector("#statusMessage");
const resultTitle = document.querySelector("#resultTitle");
const resultCode = document.querySelector("#resultCode");
const resultBody = document.querySelector("#resultBody");
const productGrid = document.querySelector("#productGrid");
const orderProduct = document.querySelector("#orderProduct");
const orderQuantity = document.querySelector("#orderQuantity");
const orderList = document.querySelector("#orderList");
const pointBadge = document.querySelector("#pointBadge");
const recentList = document.querySelector("#recentList");
const rankingList = document.querySelector("#rankingList");
const lowStockList = document.querySelector("#lowStockList");
const productImages = [
    "/images/product-mouse.jpg",
    "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=600&q=80",
    "/images/product-usb-hub.jpg",
    "https://images.unsplash.com/photo-1595225476474-87563907a212?auto=format&fit=crop&w=600&q=80",
    "/images/product-monitor.jpg",
    "/images/product-laptop-stand.jpg",
    "/images/product-charger.jpg",
    "/images/product-webcam.svg",
    "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=600&q=80",
    "/images/product-lamp.jpg",
    "/images/product-ssd.jpg",
    "/images/product-speaker.jpg"
];

async function checkServer() {
    try {
        const response = await fetch("/actuator/health");
        if (!response.ok) throw new Error("health check failed");
        statusDot.classList.add("online");
        statusTitle.textContent = "백엔드 연결됨";
        statusMessage.textContent = "Spring Boot API가 정상적으로 응답하고 있습니다.";
    } catch {
        statusTitle.textContent = "백엔드 연결 실패";
        statusMessage.textContent = "터미널에서 ./gradlew bootRun 실행 상태를 확인하세요.";
    }
}

async function submit(form, endpoint, title) {
    const button = form.querySelector("button");
    button.disabled = true;
    resultTitle.textContent = `${title} 처리 중`;
    resultCode.textContent = "LOADING";
    resultCode.className = "result-code";

    const payload = Object.fromEntries(new FormData(form).entries());
    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            credentials: "same-origin",
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        resultTitle.textContent = data.message || title;
        resultCode.textContent = `${response.status} ${data.code || ""}`.trim();
        resultCode.className = `result-code ${response.ok ? "success" : "failure"}`;
        resultBody.textContent = JSON.stringify(data, null, 2);

        if (response.ok && endpoint.endsWith("/login")) {
            sessionStorage.setItem("customerId", data.body.customerId);
            statusTitle.textContent = `${data.body.customerId}님 로그인됨`;
            statusMessage.textContent =
                `JWT Cookie가 저장되었습니다. 현재 포인트: ${data.body.customerPoint.toLocaleString()}`;
            loadRecent();
        }
        document.querySelector("#resultPanel").scrollIntoView({behavior: "smooth", block: "center"});
    } catch (error) {
        resultTitle.textContent = "API 연결 실패";
        resultCode.textContent = "NETWORK ERROR";
        resultCode.className = "result-code failure";
        resultBody.textContent = error.message;
    } finally {
        button.disabled = false;
        form.reset();
    }
}

function showResult(title, response, data, moveToResult = false) {
    resultTitle.textContent = data.message || title;
    resultCode.textContent = `${response.status} ${data.code || ""}`.trim();
    resultCode.className = `result-code ${response.ok ? "success" : "failure"}`;
    resultBody.textContent = JSON.stringify(data, null, 2);
    if (moveToResult) document.querySelector("#resultPanel").scrollIntoView({behavior: "smooth", block: "center"});
}

async function loadProducts(announce = false) {
    const response = await fetch("/api/products?offset=0&count=50");
    const data = await response.json();
    if (announce) showResult("상품 조회", response, data);
    const products = data.body?.items || [];
    productGrid.innerHTML = products.map(product => `
        <article class="product-card" data-product-id="${product.id}" tabindex="0" role="button" aria-label="${product.productName} 상세 보기">
            ${product.productImage
                ? `<img class="product-image" src="${product.productImage}" alt="${product.productName}">`
                : productImages[product.id - 1]
                ? `<img class="product-image" src="${productImages[product.id - 1]}" alt="${product.productName}">`
                : `<div class="product-image product-image-placeholder"><span>${product.productName}<br><small>상품 이미지 등록중입니다</small></span></div>`}
            <span class="eyebrow">NO.${product.id}</span>
            <h3>${product.productName}</h3>
        </article>`).join("");
    orderProduct.innerHTML = '<option value="">상품을 선택하세요</option>' + products.map(product =>
        `<option value="${product.id}">${product.productName} · ${product.productPrice.toLocaleString()}원</option>`).join("");
    productGrid.querySelectorAll(".product-card").forEach(card => card.addEventListener("click", () => {
        selectProduct(products.find(product => String(product.id) === card.dataset.productId));
        viewProduct(card.dataset.productId);
        document.querySelector(".order-section").scrollIntoView({behavior: "smooth", block: "center"});
    }));
    productGrid.querySelectorAll(".product-card").forEach(card => card.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") card.click();
    }));
}

function selectProduct(product) {
    if (!product) return;
    orderProduct.value = product.id;
    document.querySelector("#selectedProductDetail").hidden = false;
    document.querySelector("#selectedProductName").textContent = product.productName;
    document.querySelector("#selectedProductMeta").textContent = `${product.productPrice.toLocaleString()}원 · 재고 ${product.stockQuantity}개`;
    const image = product.productImage || productImages[product.id - 1];
    document.querySelector("#selectedProductImage").innerHTML = image
        ? `<img src="${image}" alt="${product.productName}">`
        : `<div class="detail-placeholder">상품 이미지<br>등록중입니다</div>`;
}

async function viewProduct(productId) {
    const response = await fetch(`/api/products/${productId}`);
    if (response.ok && sessionStorage.getItem("customerId")) loadRecent();
}

async function loadOrders(announce = false) {
    const customerId = sessionStorage.getItem("customerId");
    if (!customerId) {
        resultTitle.textContent = "로그인이 필요합니다.";
        resultCode.textContent = "AUTH REQUIRED";
        resultCode.className = "result-code failure";
        resultBody.textContent = "로그인 후 내 주문 내역 조회를 다시 눌러 주세요.";
        return;
    }
    const response = await fetch(`/api/customers/${encodeURIComponent(customerId)}`);
    const data = await response.json();
    if (announce) showResult("주문 내역 조회", response, data);
    if (!response.ok) return;
    pointBadge.textContent = `${data.body.customerPoint.toLocaleString()} P`;
    const products = data.body.products || [];
    orderList.innerHTML = products.length ? products.map(item =>
        `<div class="order-row"><span>${item.productName} <small>x ${item.quantity}</small></span><strong>${(item.productPrice * item.quantity).toLocaleString()}원</strong></div>`).join("")
        : '<p class="empty-state">아직 주문한 상품이 없습니다.</p>';
}

async function loadRecent(announce = false) {
    if (!sessionStorage.getItem("customerId")) return;
    const response = await fetch("/api/customers/recent-products", {credentials: "same-origin"});
    const data = await response.json();
    if (announce) showResult("최근 본 상품 조회", response, data);
    const recentProducts = Array.isArray(data.body) ? data.body : [];
    recentList.innerHTML = response.ok && recentProducts.length ? recentProducts.map(item =>
        `<div class="compact-row"><span>${item.productName}<small> · 재고 ${item.stockQuantity}</small></span><small>${new Date(item.viewedAt).toLocaleDateString()}</small></div>`).join("") : '<p class="empty-state">최근 본 상품이 없습니다.</p>';
}

async function loadRankings(announce = false) {
    const response = await fetch("/api/products/rankings?limit=5");
    const data = await response.json();
    if (announce) showResult("판매 순위 조회", response, data);
    const rankings = Array.isArray(data.body) ? data.body : [];
    rankingList.innerHTML = response.ok && rankings.length ? rankings.map(item =>
        `<div class="compact-row"><span><span class="rank-number">${item.rank}</span> ${item.productName}</span><small>${item.totalSalesQuantity}개 판매</small></div>`).join("") : '<p class="empty-state">아직 판매 이력이 없습니다.</p>';
}

async function loadLowStock(announce = false) {
    const response = await fetch("/api/products/low-stock?threshold=5");
    const data = await response.json();
    if (announce) showResult("품절 임박 상품 조회", response, data);
    const lowStockProducts = Array.isArray(data.body) ? data.body : [];
    lowStockList.innerHTML = response.ok && lowStockProducts.length ? lowStockProducts.map(item =>
        `<div class="compact-row"><span>${item.productName}</span><strong>${item.stockQuantity}개 남음</strong></div>`).join("") : '<p class="empty-state">품절 임박 상품이 없습니다.</p>';
}

async function order(endpoint, title) {
    if (!sessionStorage.getItem("customerId")) {
        resultTitle.textContent = "로그인이 필요합니다.";
        resultCode.textContent = "AUTH REQUIRED";
        resultCode.className = "result-code failure";
        resultBody.textContent = "회원가입 후 로그인하면 주문할 수 있습니다.";
        return;
    }
    const payload = {productId: Number(orderProduct.value), quantity: Number(orderQuantity.value)};
    if (!payload.productId) {
        resultTitle.textContent = "상품을 선택하세요.";
        resultCode.textContent = "INPUT REQUIRED";
        resultCode.className = "result-code failure";
        resultBody.textContent = "주문할 상품을 먼저 선택해 주세요.";
        return;
    }
    const response = await fetch(endpoint, {method: "POST", headers: {"Content-Type": "application/json"}, credentials: "same-origin", body: JSON.stringify(payload)});
    const data = await response.json();
    showResult(title, response, data);
    if (response.ok) {
        pointBadge.textContent = `${data.body.customerPoint.toLocaleString()} P`;
        loadRankings();
        loadLowStock();
    }
}

document.querySelector("#signupForm").addEventListener("submit", event => {
    event.preventDefault();
    submit(event.currentTarget, "/api/customers", "회원가입");
});

document.querySelector("#loginForm").addEventListener("submit", event => {
    event.preventDefault();
    submit(event.currentTarget, "/api/customers/login", "로그인");
});
document.querySelector("#refreshProducts").addEventListener("click", () => loadProducts(true));
document.querySelector("#refreshOrders").addEventListener("click", () => loadOrders(true));
document.querySelector("#orderButton").addEventListener("click", () => order("/api/customers/order", "주문 완료"));
document.querySelector("#cancelButton").addEventListener("click", () => order("/api/customers/cancel", "주문 취소"));
document.querySelector("#refreshRecent").addEventListener("click", () => loadRecent(true));
document.querySelector("#refreshRankings").addEventListener("click", () => loadRankings(true));
document.querySelector("#refreshLowStock").addEventListener("click", () => loadLowStock(true));

checkServer();
loadProducts();
loadRankings();
loadLowStock();
if (sessionStorage.getItem("customerId")) loadRecent();
