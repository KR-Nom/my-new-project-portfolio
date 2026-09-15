package com.sk.skala.shopapi.repository;

import com.sk.skala.shopapi.data.table.*;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RecentlyViewedProductRepository extends JpaRepository<RecentlyViewedProduct, Long> {
    Optional<RecentlyViewedProduct> findByCustomerAndProduct(Customer customer, Product product);
    List<RecentlyViewedProduct> findByCustomerCustomerIdOrderByViewedAtDesc(String customerId);
    Optional<RecentlyViewedProduct> findFirstByCustomerCustomerIdOrderByViewedAtAsc(String customerId);
}
