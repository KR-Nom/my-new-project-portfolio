package com.sk.skala.shopapi.data.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter @AllArgsConstructor
public class ProductRankingDto {
    private Long productId; private String productName; private Long totalSalesQuantity;
    private Double totalSalesAmount; private Integer rank;
}
