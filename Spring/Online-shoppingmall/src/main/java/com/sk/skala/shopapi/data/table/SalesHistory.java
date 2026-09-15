package com.sk.skala.shopapi.data.table;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity @Table(name = "sales_histories")
@Getter @Setter @NoArgsConstructor
public class SalesHistory {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "product_id", nullable = false)
    private Product product;
    private Integer quantity;
    @Enumerated(EnumType.STRING) private SalesType type;
    private LocalDateTime createdAt;

    public SalesHistory(Product product, Integer quantity, SalesType type) {
        this.product = product; this.quantity = quantity; this.type = type; this.createdAt = LocalDateTime.now();
    }
}
