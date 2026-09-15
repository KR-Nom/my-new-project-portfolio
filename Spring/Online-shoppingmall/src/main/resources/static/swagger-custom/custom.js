(() => {
    "use strict";

    const insertHeader = () => {
        if (document.querySelector(".ai-api-header")) return true;

        const swagger = document.querySelector("#swagger-ui");
        if (!swagger) return false;

        const header = document.createElement("header");
        header.className = "ai-api-header";
        header.innerHTML = `
            <div class="ai-api-header__brand">
                <img src="/swagger-custom/logo.svg" alt="">
                <div>
                    <span class="ai-api-header__eyebrow">DEVELOPER PLATFORM</span>
                    <h1>AI Shopping Mall API</h1>
                    <p>Smart Commerce REST API Documentation</p>
                </div>
            </div>
            <div class="ai-api-header__meta">
                <span class="ai-api-header__status"><i></i> Spring Boot REST API</span>
                <span class="ai-api-header__badge">API DOCUMENTATION · v1.0.0</span>
            </div>`;
        swagger.before(header);
        document.body.classList.add("swagger-customized");
        document.title = "AI Shopping Mall API · Documentation";
        return true;
    };

    let attempts = 0;
    const timer = window.setInterval(() => {
        attempts += 1;
        if (insertHeader() || attempts >= 20) window.clearInterval(timer);
    }, 150);

    document.addEventListener("DOMContentLoaded", insertHeader, {once: true});
})();
