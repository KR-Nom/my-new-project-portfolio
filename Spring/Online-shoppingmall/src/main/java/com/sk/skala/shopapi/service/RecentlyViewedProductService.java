package com.sk.skala.shopapi.service;

import com.sk.skala.shopapi.common.Response;
import com.sk.skala.shopapi.data.dto.RecentProductDto;
import com.sk.skala.shopapi.data.table.Customer;
import com.sk.skala.shopapi.data.table.Product;
import com.sk.skala.shopapi.data.table.RecentlyViewedProduct;
import com.sk.skala.shopapi.exception.ErrorCode;
import com.sk.skala.shopapi.exception.ParameterException;
import com.sk.skala.shopapi.exception.ResponseException;
import com.sk.skala.shopapi.repository.CustomerRepository;
import com.sk.skala.shopapi.repository.RecentlyViewedProductRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service @RequiredArgsConstructor
public class RecentlyViewedProductService {
    private final RecentlyViewedProductRepository recentlyViewedProductRepository;
    private final CustomerRepository customerRepository;

    @Transactional
    public void recordView(String customerId, Product product) {
        if (customerId == null) return;
        Customer customerEntity = customerRepository.findById(customerId).orElseThrow(() ->
                new ResponseException(ErrorCode.DATA_NOT_FOUND, "고객을 찾을 수 없습니다."));
        RecentlyViewedProduct viewedProduct = recentlyViewedProductRepository
                .findByCustomerAndProduct(customerEntity, product)
                .orElseGet(() -> new RecentlyViewedProduct(customerEntity, product));
        viewedProduct.setViewedAt(java.time.LocalDateTime.now());
        recentlyViewedProductRepository.save(viewedProduct);
        while (recentlyViewedProductRepository.findByCustomerCustomerIdOrderByViewedAtDesc(customerId).size() > 5) {
            recentlyViewedProductRepository.delete(recentlyViewedProductRepository
                    .findFirstByCustomerCustomerIdOrderByViewedAtAsc(customerId).orElseThrow());
        }
    }

    @Transactional(readOnly = true)
    public Response<List<RecentProductDto>> getRecentProducts(String customerId) {
        if (customerId == null || customerId.isBlank()) throw new ParameterException("customerId");
        List<RecentProductDto> recentProductList = recentlyViewedProductRepository
                .findByCustomerCustomerIdOrderByViewedAtDesc(customerId).stream()
                .map(v -> new RecentProductDto(v.getProduct().getId(), v.getProduct().getProductName(),
                        v.getProduct().getProductPrice(), v.getProduct().getStockQuantity(), v.getViewedAt())).toList();
        return Response.ok(recentProductList);
    }
}
