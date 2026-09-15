package com.sk.skala.shopapi.repository;

import com.sk.skala.shopapi.data.table.Product;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ProductRepository extends JpaRepository<Product, Long> {
    Optional<Product> findByProductName(String productName);
    List<Product> findByStockQuantityLessThanEqualAndStockQuantityGreaterThanOrderByStockQuantityAscIdAsc(Integer threshold, Integer minimum);
}
