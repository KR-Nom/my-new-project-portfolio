package com.sk.skala.shopapi.data.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderListDto {
    private String customerId;
    private Double customerPoint;
    private List<OrderItemDto> products;
}
