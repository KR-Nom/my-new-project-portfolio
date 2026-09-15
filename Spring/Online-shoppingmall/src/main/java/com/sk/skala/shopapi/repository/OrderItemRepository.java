package com.sk.skala.shopapi.repository;

import com.sk.skala.shopapi.data.table.Customer;
import com.sk.skala.shopapi.data.table.OrderItem;
import com.sk.skala.shopapi.data.table.Product;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {
    List<OrderItem> findByCustomerCustomerId(String customerId);
    Optional<OrderItem> findByCustomerAndProduct(Customer customer, Product product);
}
