package com.sk.skala.shopapi.data.table;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "customers")
@Getter
@Setter
@NoArgsConstructor
public class Customer {

    @Id
    private String customerId;

    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String customerPassword;

    private Double customerPoint;
}
