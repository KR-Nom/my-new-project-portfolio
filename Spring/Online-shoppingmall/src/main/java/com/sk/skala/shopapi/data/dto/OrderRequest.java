package com.sk.skala.shopapi.data.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

@Getter
@Setter
@NoArgsConstructor
public class OrderRequest {
    @NotNull(message = "productId는 필수입니다.")
    private Long productId;
    @NotNull(message = "quantity는 필수입니다.")
    @Positive(message = "quantity는 1 이상이어야 합니다.")
    private Integer quantity;
}
