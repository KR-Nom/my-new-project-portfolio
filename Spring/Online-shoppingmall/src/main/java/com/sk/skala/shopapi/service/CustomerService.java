package com.sk.skala.shopapi.service;

import com.sk.skala.shopapi.common.PagedList;
import com.sk.skala.shopapi.common.Response;
import com.sk.skala.shopapi.common.SessionHandler;
import com.sk.skala.shopapi.data.dto.CustomerSession;
import com.sk.skala.shopapi.data.dto.OrderItemDto;
import com.sk.skala.shopapi.data.dto.OrderListDto;
import com.sk.skala.shopapi.data.dto.OrderRequest;
import com.sk.skala.shopapi.data.table.Customer;
import com.sk.skala.shopapi.data.table.OrderItem;
import com.sk.skala.shopapi.data.table.Product;
import com.sk.skala.shopapi.data.table.SalesHistory;
import com.sk.skala.shopapi.data.table.SalesType;
import com.sk.skala.shopapi.exception.ErrorCode;
import com.sk.skala.shopapi.exception.ParameterException;
import com.sk.skala.shopapi.exception.ResponseException;
import com.sk.skala.shopapi.repository.CustomerRepository;
import com.sk.skala.shopapi.repository.OrderItemRepository;
import com.sk.skala.shopapi.repository.ProductRepository;
import com.sk.skala.shopapi.repository.SalesHistoryRepository;
import com.sk.skala.shopapi.tools.StringUtil;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CustomerService {
    private static final double INITIAL_POINT = 1_000_000D;

    private final ProductRepository productRepository;
    private final CustomerRepository customerRepository;
    private final OrderItemRepository orderItemRepository;
    private final SessionHandler sessionHandler;
    private final SalesHistoryRepository salesHistoryRepository;

    public Response<PagedList<Customer>> getAllCustomers(int offset, int count) {
        if (offset < 0) {
            throw new ParameterException("offset");
        }
        if (count < 1) {
            throw new ParameterException("count");
        }
        Page<Customer> customerPage = customerRepository.findAll(
                PageRequest.of(offset, count, Sort.by("customerId").ascending()));
        return Response.ok(new PagedList<>(
                customerPage.getContent(), offset, count,
                customerPage.getTotalElements(), customerPage.getTotalPages()));
    }

    @Transactional(readOnly = true)
    public Response<OrderListDto> getCustomerById(String customerId) {
        if (StringUtil.isAnyEmpty(customerId)) {
            throw new ParameterException("customerId");
        }
        Customer customerEntity = findCustomer(customerId);
        List<OrderItemDto> orderItemList = orderItemRepository.findByCustomerCustomerId(customerId)
                .stream()
                .map(item -> OrderItemDto.builder()
                        .productId(item.getProduct().getId())
                        .productName(item.getProduct().getProductName())
                        .productPrice(item.getProduct().getProductPrice())
                        .quantity(item.getQuantity())
                        .build())
                .toList();
        return Response.ok(OrderListDto.builder()
                .customerId(customerEntity.getCustomerId())
                .customerPoint(customerEntity.getCustomerPoint())
                .products(orderItemList)
                .build());
    }

    public Response<Customer> createCustomer(Customer customerEntity) {
        if (customerEntity == null) {
            throw new ParameterException("customer");
        }
        if (StringUtil.isAnyEmpty(customerEntity.getCustomerId())) {
            throw new ParameterException("customerId");
        }
        if (StringUtil.isAnyEmpty(customerEntity.getCustomerPassword())) {
            throw new ParameterException("customerPassword");
        }
        if (customerRepository.existsById(customerEntity.getCustomerId())) {
            throw new ResponseException(ErrorCode.DATA_DUPLICATED, "이미 가입된 고객 ID입니다.");
        }
        customerEntity.setCustomerPoint(INITIAL_POINT);
        return Response.ok("회원가입이 완료되었습니다.", customerRepository.save(customerEntity));
    }

    public Response<Customer> loginCustomer(CustomerSession customerSession) {
        if (customerSession == null) {
            throw new ParameterException("customerSession");
        }
        if (StringUtil.isAnyEmpty(customerSession.getCustomerId())) {
            throw new ParameterException("customerId");
        }
        if (StringUtil.isAnyEmpty(customerSession.getCustomerPassword())) {
            throw new ParameterException("customerPassword");
        }
        Customer customerEntity = findCustomer(customerSession.getCustomerId());
        if (!customerEntity.getCustomerPassword().equals(customerSession.getCustomerPassword())) {
            throw new ResponseException(ErrorCode.NOT_AUTHENTICATED, "비밀번호가 일치하지 않습니다.");
        }
        sessionHandler.createSession(customerEntity.getCustomerId());
        return Response.ok("로그인되었습니다.", customerEntity);
    }

    public Response<Customer> updateCustomer(Customer customerRequest) {
        if (customerRequest == null || StringUtil.isAnyEmpty(customerRequest.getCustomerId())) {
            throw new ParameterException("customerId");
        }
        if (customerRequest.getCustomerPoint() == null) {
            throw new ParameterException("customerPoint");
        }
        Customer customerEntity = findCustomer(customerRequest.getCustomerId());
        customerEntity.setCustomerPoint(customerRequest.getCustomerPoint());
        return Response.ok("고객 정보가 수정되었습니다.", customerRepository.save(customerEntity));
    }

    @Transactional
    public Response<Void> deleteCustomer(String customerId) {
        if (StringUtil.isAnyEmpty(customerId)) {
            throw new ParameterException("customerId");
        }
        Customer customerEntity = findCustomer(customerId);
        orderItemRepository.deleteAll(orderItemRepository.findByCustomerCustomerId(customerId));
        customerRepository.delete(customerEntity);
        return Response.ok("고객이 삭제되었습니다.", null);
    }

    @Transactional
    public Response<Customer> placeOrder(OrderRequest order) {
        validateOrder(order);
        Customer customerEntity = findCustomer(sessionHandler.getCurrentCustomerId());
        Product productEntity = findProduct(order.getProductId());
        if (productEntity.getStockQuantity() < order.getQuantity()) {
            throw new ResponseException(ErrorCode.OUT_OF_STOCK, "상품 재고가 부족합니다.");
        }
        double totalPrice = productEntity.getProductPrice() * order.getQuantity();
        if (customerEntity.getCustomerPoint() < totalPrice) {
            throw new ResponseException(ErrorCode.INSUFFICIENT_FUNDS, "포인트가 부족합니다.");
        }

        customerEntity.setCustomerPoint(customerEntity.getCustomerPoint() - totalPrice);
        productEntity.setStockQuantity(productEntity.getStockQuantity() - order.getQuantity());
        OrderItem orderItem = orderItemRepository.findByCustomerAndProduct(customerEntity, productEntity)
                .orElseGet(() -> new OrderItem(customerEntity, productEntity, 0));
        orderItem.setQuantity(orderItem.getQuantity() + order.getQuantity());
        customerRepository.save(customerEntity);
        orderItemRepository.save(orderItem);
        salesHistoryRepository.save(new SalesHistory(productEntity, order.getQuantity(), SalesType.ORDER));
        return Response.ok("주문이 완료되었습니다.", customerEntity);
    }

    @Transactional
    public Response<Customer> cancelOrder(OrderRequest order) {
        validateOrder(order);
        Customer customerEntity = findCustomer(sessionHandler.getCurrentCustomerId());
        Product productEntity = findProduct(order.getProductId());
        OrderItem orderItem = orderItemRepository.findByCustomerAndProduct(customerEntity, productEntity)
                .orElseThrow(() -> new ResponseException(
                        ErrorCode.DATA_NOT_FOUND, "주문 기록을 찾을 수 없습니다."));
        if (orderItem.getQuantity() < order.getQuantity()) {
            throw new ResponseException(
                    ErrorCode.INSUFFICIENT_QUANTITY, "취소할 수량이 주문 수량보다 많습니다.");
        }

        int remainingQuantity = orderItem.getQuantity() - order.getQuantity();
        if (remainingQuantity == 0) {
            orderItemRepository.delete(orderItem);
        } else {
            orderItem.setQuantity(remainingQuantity);
            orderItemRepository.save(orderItem);
        }
        customerEntity.setCustomerPoint(
                customerEntity.getCustomerPoint() + productEntity.getProductPrice() * order.getQuantity());
        productEntity.setStockQuantity(productEntity.getStockQuantity() + order.getQuantity());
        customerRepository.save(customerEntity);
        salesHistoryRepository.save(new SalesHistory(productEntity, order.getQuantity(), SalesType.CANCEL));
        return Response.ok("주문이 취소되었습니다.", customerEntity);
    }

    private void validateOrder(OrderRequest order) {
        if (order == null || order.getProductId() == null) {
            throw new ParameterException("productId");
        }
        if (order.getQuantity() == null || order.getQuantity() < 1) {
            throw new ParameterException("quantity");
        }
    }

    private Customer findCustomer(String customerId) {
        return customerRepository.findById(customerId)
                .orElseThrow(() -> new ResponseException(
                        ErrorCode.DATA_NOT_FOUND, "고객을 찾을 수 없습니다."));
    }

    private Product findProduct(Long productId) {
        return productRepository.findById(productId)
                .orElseThrow(() -> new ResponseException(
                        ErrorCode.DATA_NOT_FOUND, "상품을 찾을 수 없습니다."));
    }
}
