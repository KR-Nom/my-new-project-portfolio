package com.sk.skala.shopapi.data.table;

import jakarta.persistence.Entity;
import jakarta.persistence.Column;
import jakarta.persistence.Lob;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "products")
@Getter
@Setter
@NoArgsConstructor
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String productName;
    private Double productPrice;
    @Column(nullable = false)
    private Integer stockQuantity;
    @Lob
    private String productImage;

    public Product(String productName, Double productPrice) {
        this.productName = productName;
        this.productPrice = productPrice;
        this.stockQuantity = 0;
    }
}
