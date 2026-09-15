package com.sk.skala.shopapi;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.sk.skala.shopapi.common.SessionHandler;
import com.sk.skala.shopapi.data.dto.OrderRequest;
import com.sk.skala.shopapi.data.table.Customer;
import com.sk.skala.shopapi.data.table.Product;
import com.sk.skala.shopapi.data.table.SalesHistory;
import com.sk.skala.shopapi.exception.ErrorCode;
import com.sk.skala.shopapi.exception.ResponseException;
import com.sk.skala.shopapi.repository.CustomerRepository;
import com.sk.skala.shopapi.repository.OrderItemRepository;
import com.sk.skala.shopapi.repository.ProductRepository;
import com.sk.skala.shopapi.repository.RecentlyViewedProductRepository;
import com.sk.skala.shopapi.repository.SalesHistoryRepository;
import com.sk.skala.shopapi.service.CustomerService;
import com.sk.skala.shopapi.service.RecentlyViewedProductService;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;

@SpringBootTest
class CustomerTransactionIntegrationTest {
    @Autowired CustomerService customerService;
    @Autowired RecentlyViewedProductService recentlyViewedProductService;
    @Autowired CustomerRepository customerRepository;
    @Autowired ProductRepository productRepository;
    @Autowired OrderItemRepository orderItemRepository;
    @Autowired RecentlyViewedProductRepository recentlyViewedProductRepository;
    @Autowired SalesHistoryRepository salesHistoryRepository;
    @MockBean SessionHandler sessionHandler;

    private Customer customer;
    private Product product;

    @BeforeEach
    void setUp() {
        orderItemRepository.deleteAll();
        recentlyViewedProductRepository.deleteAll();
        salesHistoryRepository.deleteAll();
        customerRepository.deleteAll();
        productRepository.deleteAll();

        customer = new Customer();
        customer.setCustomerId("transaction-user");
        customer.setCustomerPassword("password");
        customer.setCustomerPoint(100_000D);
        customerRepository.save(customer);

        product = new Product("transaction-test-product", 10_000D);
        product.setStockQuantity(3);
        product = productRepository.save(product);
        when(sessionHandler.getCurrentCustomerId()).thenReturn(customer.getCustomerId());
    }

    @Test
    void shouldCreateOrderSuccessfully() {
        customerService.placeOrder(order(2));

        Product savedProduct = productRepository.findById(product.getId()).orElseThrow();
        Customer savedCustomer = customerRepository.findById(customer.getCustomerId()).orElseThrow();
        assertThat(savedProduct.getStockQuantity()).isEqualTo(1);
        assertThat(savedCustomer.getCustomerPoint()).isEqualTo(80_000D);
        assertThat(salesHistoryRepository.findAll()).extracting(SalesHistory::getQuantity).containsExactly(2);
    }

    @Test
    void shouldRollbackOrderWhenStockIsInsufficient() {
        assertThatThrownBy(() -> customerService.placeOrder(order(4)))
                .isInstanceOf(ResponseException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.OUT_OF_STOCK);
        assertStockEquals(3);
        assertPointEquals(100_000D);
        assertThat(salesHistoryRepository.count()).isZero();
    }

    @Test
    void shouldRollbackOrderWhenPointIsInsufficient() {
        customer.setCustomerPoint(5_000D);
        customerRepository.save(customer);
        assertThatThrownBy(() -> customerService.placeOrder(order(1)))
                .isInstanceOf(ResponseException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.INSUFFICIENT_FUNDS);
        assertStockEquals(3);
        assertPointEquals(5_000D);
        assertThat(salesHistoryRepository.count()).isZero();
    }

    @Test
    void shouldRestoreStockPointAndHistoryWhenOrderIsCancelled() {
        customerService.placeOrder(order(2));
        customerService.cancelOrder(order(1));

        Product savedProduct = productRepository.findById(product.getId()).orElseThrow();
        Customer savedCustomer = customerRepository.findById(customer.getCustomerId()).orElseThrow();
        assertThat(savedProduct.getStockQuantity()).isEqualTo(2);
        assertThat(savedCustomer.getCustomerPoint()).isEqualTo(90_000D);
        assertThat(salesHistoryRepository.findAll()).hasSize(2);
        assertThat(salesHistoryRepository.findAll().get(1).getType().name()).isEqualTo("CANCEL");
    }

    @Test
    void shouldKeepOnlyFiveRecentlyViewedProducts() {
        List<Product> products = new ArrayList<>();
        for (int productIndex = 0; productIndex < 6; productIndex++) {
            Product recentProduct = new Product("recent-product-" + productIndex, 1_000D + productIndex);
            recentProduct.setStockQuantity(1);
            products.add(productRepository.save(recentProduct));
        }
        products.forEach(item -> recentlyViewedProductService.recordView(customer.getCustomerId(), item));

        var recent = recentlyViewedProductRepository.findByCustomerCustomerIdOrderByViewedAtDesc(customer.getCustomerId());
        assertThat(recent).hasSize(5);
        assertThat(recent).noneMatch(item -> item.getProduct().getId().equals(products.get(0).getId()));
    }

    private OrderRequest order(int quantity) {
        OrderRequest request = new OrderRequest();
        request.setProductId(product.getId());
        request.setQuantity(quantity);
        return request;
    }

    private void assertStockEquals(int expectedStock) {
        assertThat(productRepository.findById(product.getId()).orElseThrow().getStockQuantity())
                .isEqualTo(expectedStock);
    }

    private void assertPointEquals(double expectedPoint) {
        assertThat(customerRepository.findById(customer.getCustomerId()).orElseThrow().getCustomerPoint())
                .isEqualTo(expectedPoint);
    }
}
