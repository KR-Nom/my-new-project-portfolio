package com.sk.skala.shopapi.data.dto;

import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter @AllArgsConstructor
public class RecentProductDto {
    private Long productId; private String productName; private Double productPrice;
    private Integer stockQuantity; private LocalDateTime viewedAt;
}
