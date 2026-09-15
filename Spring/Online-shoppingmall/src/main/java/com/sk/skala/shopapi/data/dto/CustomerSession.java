package com.sk.skala.shopapi.data.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import jakarta.validation.constraints.NotBlank;

@Getter
@Setter
@NoArgsConstructor
public class CustomerSession {
    @NotBlank(message = "customerId는 필수입니다.")
    private String customerId;
    @NotBlank(message = "customerPassword는 필수입니다.")
    private String customerPassword;
}
