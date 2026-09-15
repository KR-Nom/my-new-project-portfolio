package com.sk.skala.shopapi;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import java.util.Base64;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ShoppingMallFeatureIntegrationTest {
    private static final String COOKIE_NAME = "bff-access";

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @Test
    void initialProductsContainExpectedItems() throws Exception {
        mockMvc.perform(get("/api/products").param("offset", "0").param("count", "50"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.body.items", hasSize(13)))
                .andExpect(jsonPath("$.body.items[0].productName").value("무선마우스"))
                .andExpect(jsonPath("$.body.items[0].productPrice").value(15000.0))
                .andExpect(jsonPath("$.body.items[0].stockQuantity").value(10));
    }

    @Test
    void signupAndLoginCustomer() throws Exception {
        String customerId = uniqueId();
        Cookie cookie = loginAndGetCookie(customerId);
        org.junit.jupiter.api.Assertions.assertNotNull(cookie);
        org.junit.jupiter.api.Assertions.assertEquals(COOKIE_NAME, cookie.getName());
    }

    @Test
    void orderProductUpdatesPointStockOrderAndSalesHistory() throws Exception {
        Cookie cookie = loginAndGetCookie(uniqueId());

        orderProduct(cookie, 1L, 2)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.body.customerPoint").value(970000.0));
        mockMvc.perform(get("/api/products/1").cookie(cookie))
                .andExpect(jsonPath("$.body.stockQuantity").value(8));
        mockMvc.perform(get("/api/customers/" + currentCustomer(cookie)).cookie(cookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.body.products[0].productId").value(1))
                .andExpect(jsonPath("$.body.products[0].quantity").value(2));
        mockMvc.perform(get("/api/products/rankings").param("limit", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.body[0].productId").value(1))
                .andExpect(jsonPath("$.body[0].totalSalesQuantity").value(2));
    }

    @Test
    void cancelOrderRestoresPointStockAndSalesRanking() throws Exception {
        Cookie cookie = loginAndGetCookie(uniqueId());
        orderProduct(cookie, 1L, 2).andExpect(status().isOk());
        cancelOrder(cookie, 1L, 1)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.body.customerPoint").value(985000.0));
        mockMvc.perform(get("/api/products/1").cookie(cookie))
                .andExpect(jsonPath("$.body.stockQuantity").value(9));
        mockMvc.perform(get("/api/customers/" + currentCustomer(cookie)).cookie(cookie))
                .andExpect(jsonPath("$.body.products[0].quantity").value(1));
        mockMvc.perform(get("/api/products/rankings").param("limit", "5"))
                .andExpect(jsonPath("$.body[0].totalSalesQuantity").value(1));
    }

    @Test
    void outOfStockOrderRollsBackAllChanges() throws Exception {
        Cookie cookie = loginAndGetCookie(uniqueId());
        orderProduct(cookie, 1L, 11)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value("OUT_OF_STOCK"));
        mockMvc.perform(get("/api/products/1")).andExpect(jsonPath("$.body.stockQuantity").value(10));
        mockMvc.perform(get("/api/customers/" + currentCustomer(cookie)).cookie(cookie))
                .andExpect(jsonPath("$.body.customerPoint").value(1000000.0))
                .andExpect(jsonPath("$.body.products", hasSize(0)));
        mockMvc.perform(get("/api/products/rankings")).andExpect(jsonPath("$.body", hasSize(0)));
    }

    @Test
    void insufficientPointOrderRollsBackAllChanges() throws Exception {
        Cookie cookie = loginAndGetCookie(uniqueId());
        orderProduct(cookie, 9L, 7)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value("INSUFFICIENT_FUNDS"));
        mockMvc.perform(get("/api/products/9")).andExpect(jsonPath("$.body.stockQuantity").value(10));
        mockMvc.perform(get("/api/customers/" + currentCustomer(cookie)).cookie(cookie))
                .andExpect(jsonPath("$.body.customerPoint").value(1000000.0))
                .andExpect(jsonPath("$.body.products", hasSize(0)));
        mockMvc.perform(get("/api/products/rankings")).andExpect(jsonPath("$.body", hasSize(0)));
    }

    @Test
    void recentProductsKeepLatestFiveWithoutDuplicates() throws Exception {
        Cookie cookie = loginAndGetCookie(uniqueId());
        for (int productId = 1; productId <= 6; productId++) {
            mockMvc.perform(get("/api/products/" + productId).cookie(cookie)).andExpect(status().isOk());
        }
        mockMvc.perform(get("/api/customers/recent-products").cookie(cookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.body", hasSize(5)))
                .andExpect(jsonPath("$.body[0].productId").value(6))
                .andExpect(jsonPath("$.body[*].productId", not(hasItem(1))));
        mockMvc.perform(get("/api/products/3").cookie(cookie)).andExpect(status().isOk());
        mockMvc.perform(get("/api/customers/recent-products").cookie(cookie))
                .andExpect(jsonPath("$.body", hasSize(5)))
                .andExpect(jsonPath("$.body[0].productId").value(3));
    }

    @Test
    void lowStockProductsReturnOnlyThresholdRange() throws Exception {
        mockMvc.perform(post("/api/products").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"productName\":\"품절 임박 테스트\",\"productPrice\":1000,\"stockQuantity\":3}"))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/products/low-stock").param("threshold", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.body", hasSize(1)))
                .andExpect(jsonPath("$.body[0].stockQuantity").value(3));
    }

    @Test
    void productRankingUsesNetSalesQuantity() throws Exception {
        Cookie cookie = loginAndGetCookie(uniqueId());
        orderProduct(cookie, 1L, 3).andExpect(status().isOk());
        orderProduct(cookie, 2L, 2).andExpect(status().isOk());
        cancelOrder(cookie, 1L, 1).andExpect(status().isOk());
        mockMvc.perform(get("/api/products/rankings").param("limit", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.body", hasSize(2)))
                .andExpect(jsonPath("$.body[0].totalSalesQuantity").value(2))
                .andExpect(jsonPath("$.body[0].productId").value(1))
                .andExpect(jsonPath("$.body[0].rank").value(1))
                .andExpect(jsonPath("$.body[1].totalSalesQuantity").value(2))
                .andExpect(jsonPath("$.body[1].productId").value(2))
                .andExpect(jsonPath("$.body[1].rank").value(2));
    }

    private void signupCustomer(String customerId) throws Exception {
        mockMvc.perform(post("/api/customers").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"customerId\":\"%s\",\"customerPassword\":\"password\"}".formatted(customerId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.body.customerId").value(customerId));
    }

    private Cookie loginAndGetCookie(String customerId) throws Exception {
        signupCustomer(customerId);
        MvcResult result = mockMvc.perform(post("/api/customers/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"customerId\":\"%s\",\"customerPassword\":\"password\"}".formatted(customerId)))
                .andExpect(status().isOk()).andReturn();
        return result.getResponse().getCookie(COOKIE_NAME);
    }

    private String currentCustomer(Cookie cookie) throws Exception {
        String[] tokenParts = cookie.getValue().split("\\.");
        JsonNode claims = objectMapper.readTree(Base64.getUrlDecoder().decode(tokenParts[1]));
        return claims.path("sub").asText();
    }

    private ResultActions orderProduct(Cookie cookie, long productId, int quantity) throws Exception {
        return mockMvc.perform(post("/api/customers/order").cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"productId\":%d,\"quantity\":%d}".formatted(productId, quantity)));
    }

    private ResultActions cancelOrder(Cookie cookie, long productId, int quantity) throws Exception {
        return mockMvc.perform(post("/api/customers/cancel").cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"productId\":%d,\"quantity\":%d}".formatted(productId, quantity)));
    }

    private String uniqueId() {
        return "integration-" + UUID.randomUUID().toString().substring(0, 8);
    }
}
