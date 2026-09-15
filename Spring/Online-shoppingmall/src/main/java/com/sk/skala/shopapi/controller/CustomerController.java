package com.sk.skala.shopapi.controller;

import com.sk.skala.shopapi.common.PagedList;
import com.sk.skala.shopapi.common.Response;
import com.sk.skala.shopapi.data.dto.CustomerSession;
import com.sk.skala.shopapi.data.dto.OrderListDto;
import com.sk.skala.shopapi.data.dto.OrderRequest;
import com.sk.skala.shopapi.data.table.Customer;
import com.sk.skala.shopapi.service.CustomerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/customers")
@RequiredArgsConstructor
@Tag(name = "고객 API", description = "회원가입, 로그인, 고객 및 주문 관리")
public class CustomerController {
    private final CustomerService customerService;

    @GetMapping({"", "/list"})
    @Operation(summary = "전체 고객 조회", description = "고객을 ID 오름차순으로 페이징 조회합니다. 비밀번호는 응답에 포함되지 않습니다.")
    public Response<PagedList<Customer>> getAllCustomers(
            @RequestParam(defaultValue = "0") int offset,
            @RequestParam(defaultValue = "10") int count) {
        return customerService.getAllCustomers(offset, count);
    }

    @GetMapping("/{customerId}")
    @Operation(summary = "고객 상세 및 주문 내역 조회", description = "고객의 현재 포인트와 주문한 상품 목록을 조회합니다.")
    public Response<OrderListDto> getCustomerById(@PathVariable String customerId) {
        return customerService.getCustomerById(customerId);
    }

    @PostMapping
    @Operation(summary = "회원가입", description = "고객 ID와 비밀번호로 가입합니다. 초기 포인트는 1,000,000입니다.")
    public Response<Customer> createCustomer(@RequestBody Customer customer) {
        return customerService.createCustomer(customer);
    }

    @PostMapping("/login")
    @Operation(summary = "로그인", description = "ID와 비밀번호를 확인한 후 JWT를 bff-access HttpOnly Cookie에 저장합니다.")
    public Response<Customer> loginCustomer(@Valid @RequestBody CustomerSession customerSession) {
        return customerService.loginCustomer(customerSession);
    }

    @PutMapping
    @Operation(summary = "고객 포인트 수정", description = "고객 ID에 해당하는 고객의 포인트를 수정합니다.")
    public Response<Customer> updateCustomer(@RequestBody Customer customer) {
        return customerService.updateCustomer(customer);
    }

    @DeleteMapping("/{customerId}")
    @Operation(summary = "고객 삭제", description = "고객의 주문 내역을 먼저 삭제한 후 고객을 삭제합니다.")
    public Response<Void> deleteCustomer(@PathVariable String customerId) {
        return customerService.deleteCustomer(customerId);
    }

    @PostMapping("/order")
    @Operation(summary = "상품 주문", description = "로그인 Cookie로 고객을 확인하고 포인트를 차감하여 상품을 주문합니다.")
    public Response<Customer> placeOrder(@Valid @RequestBody OrderRequest order) {
        return customerService.placeOrder(order);
    }

    @PostMapping("/cancel")
    @Operation(summary = "주문 취소", description = "로그인 고객의 주문 수량을 줄이고 상품 금액을 포인트로 환급합니다.")
    public Response<Customer> cancelOrder(@Valid @RequestBody OrderRequest order) {
        return customerService.cancelOrder(order);
    }
}
