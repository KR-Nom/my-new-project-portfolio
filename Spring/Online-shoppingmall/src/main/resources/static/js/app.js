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
        statusTitle.textContent = "오늘의 데스크 셋업을 만나보세요.";
        statusMessage.textContent = "로그인하면 보유 포인트로 주문하고, 주문 내역을 확인할 수 있어요.";
    } catch {
        statusTitle.textContent = "서비스에 연결하지 못했어요.";
        statusMessage.textContent = "잠시 후 페이지를 새로고침해 주세요.";
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
        statusTitle.textContent = data.message || title;
        statusMessage.textContent = response.ok ? "요청이 반영되었어요." : "입력 내용을 확인하고 다시 시도해 주세요.";

        if (response.ok && endpoint.endsWith("/login")) {
            sessionStorage.setItem("customerId", data.body.customerId);
            statusTitle.textContent = `${data.body.customerId}님 로그인됨`;
            statusMessage.textContent =
                `현재 사용 가능한 포인트: ${data.body.customerPoint.toLocaleString()} P`;
            document.querySelector("#account").open = false;
            loadOrders();
            loadRecent();
        }
        if (response.ok && endpoint === "/api/customers") {
            document.querySelector("#loginId").value = payload.customerId;
            statusMessage.textContent = "아래 로그인 화면에서 새 계정으로 시작하세요.";
        }
        if (response.ok) form.reset();
    } catch (error) {
        resultTitle.textContent = "API 연결 실패";
        resultCode.textContent = "NETWORK ERROR";
        resultCode.className = "result-code failure";
        resultBody.textContent = error.message;
    } finally {
        button.disabled = false;
    }
}

function showResult(title, response, data, moveToResult = false) {
    resultTitle.textContent = data.message || title;
    resultCode.textContent = `${response.status} ${data.code || ""}`.trim();
    resultCode.className = `result-code ${response.ok ? "success" : "failure"}`;
    resultBody.textContent = JSON.stringify(data, null, 2);
    statusTitle.textContent = data.message || title;
    statusMessage.textContent = response.ok ? "변경된 내역을 확인해 주세요." : "입력 내용을 확인하고 다시 시도해 주세요.";
    if (moveToResult) document.querySelector("#resultPanel").scrollIntoView({behavior: "smooth", block: "center"});
}

async function loadProducts(announce = false) {
    const selectedId = orderProduct.value;
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
            <div class="product-meta"><strong>${product.productPrice.toLocaleString()} P</strong><span>재고 ${product.stockQuantity}개</span></div>
        </article>`).join("");
    orderProduct.innerHTML = '<option value="">상품을 선택하세요</option>' + products.map(product =>
        `<option value="${product.id}">${product.productName} · ${product.productPrice.toLocaleString()}원</option>`).join("");
    orderProduct.value = selectedId;
    if (selectedId) selectProduct(products.find(product => String(product.id) === selectedId));
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

let orderPending = false;
async function order(endpoint, title) {
    if (orderPending) return;
    if (!sessionStorage.getItem("customerId")) {
        resultTitle.textContent = "로그인이 필요합니다.";
        resultCode.textContent = "AUTH REQUIRED";
        resultCode.className = "result-code failure";
        resultBody.textContent = "회원가입 후 로그인하면 주문할 수 있습니다.";
        return;
    }
    const payload = {productId: Number(orderProduct.value), quantity: Number(orderQuantity.value)};
    if (!payload.productId || !Number.isInteger(payload.quantity) || payload.quantity < 1) {
        resultTitle.textContent = "상품을 선택하세요.";
        resultCode.textContent = "INPUT REQUIRED";
        resultCode.className = "result-code failure";
        resultBody.textContent = "주문할 상품과 1 이상의 정수 수량을 선택해 주세요.";
        statusTitle.textContent = resultBody.textContent;
        return;
    }
    orderPending = true;
    document.querySelector("#orderButton").disabled = true;
    document.querySelector("#cancelButton").disabled = true;
    try {
        const response = await fetch(endpoint, {method: "POST", headers: {"Content-Type": "application/json"}, credentials: "same-origin", body: JSON.stringify(payload)});
        const data = await response.json();
        showResult(title, response, data);
        if (response.ok) {
            pointBadge.textContent = `${data.body.customerPoint.toLocaleString()} P`;
            await Promise.all([loadOrders(), loadProducts(), loadRankings(), loadLowStock(), loadRecent()]);
        }
    } catch {
        statusTitle.textContent = "요청을 완료하지 못했어요.";
        statusMessage.textContent = "주문 내역을 확인한 뒤 다시 시도해 주세요.";
    } finally {
        orderPending = false;
        document.querySelector("#orderButton").disabled = false;
        document.querySelector("#cancelButton").disabled = false;
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
if (sessionStorage.getItem("customerId")) { loadRecent(); loadOrders(); }
