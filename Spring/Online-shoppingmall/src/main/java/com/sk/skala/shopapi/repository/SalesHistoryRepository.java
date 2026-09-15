package com.sk.skala.shopapi.repository;

import com.sk.skala.shopapi.data.table.SalesHistory;
import java.util.List;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface SalesHistoryRepository extends JpaRepository<SalesHistory, Long> {
    @Query("select h.product.id, h.product.productName, h.product.productPrice, sum(case when h.type = com.sk.skala.shopapi.data.table.SalesType.ORDER then h.quantity else -h.quantity end) " +
           "from SalesHistory h group by h.product.id, h.product.productName, h.product.productPrice " +
           "having sum(case when h.type = com.sk.skala.shopapi.data.table.SalesType.ORDER then h.quantity else -h.quantity end) > 0 " +
           "order by sum(case when h.type = com.sk.skala.shopapi.data.table.SalesType.ORDER then h.quantity else -h.quantity end) desc, h.product.id asc")
    List<Object[]> findNetSales();
}
