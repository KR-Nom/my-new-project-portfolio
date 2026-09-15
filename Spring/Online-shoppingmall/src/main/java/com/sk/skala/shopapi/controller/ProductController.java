package com.sk.skala.shopapi.controller;

import com.sk.skala.shopapi.common.PagedList;
import com.sk.skala.shopapi.common.Response;
import com.sk.skala.shopapi.data.table.Product;
import com.sk.skala.shopapi.data.dto.ProductRankingDto;
import java.util.List;
import com.sk.skala.shopapi.service.ProductService;
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

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
@Tag(name = "상품 API", description = "쇼핑몰 상품 조회 및 관리")
public class ProductController {
    private final ProductService productService;

    @GetMapping({"", "/list"})
    @Operation(summary = "전체 상품 조회", description = "상품을 ID 오름차순으로 페이징 조회합니다. offset은 페이지 번호입니다.")
    public Response<PagedList<Product>> getAllProducts(
            @RequestParam(defaultValue = "0") int offset,
            @RequestParam(defaultValue = "10") int count) {
        return productService.getAllProducts(offset, count);
    }

    @GetMapping("/{id}")
    @Operation(summary = "상품 상세 조회", description = "상품 ID로 상품 한 건을 조회합니다.")
    public Response<Product> getProductById(@PathVariable Long id) {
        return productService.getProductById(id);
    }

    @PostMapping
    @Operation(summary = "상품 등록", description = "상품명과 0보다 큰 가격으로 새 상품을 등록합니다.")
    public Response<Product> createProduct(@RequestBody Product product) {
        return productService.createProduct(product);
    }

    @PutMapping
    @Operation(summary = "상품 수정", description = "상품 ID에 해당하는 상품명과 가격을 수정합니다.")
    public Response<Product> updateProduct(@RequestBody Product product) {
        return productService.updateProduct(product);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "상품 삭제", description = "상품 ID에 해당하는 상품을 삭제합니다.")
    public Response<Void> deleteProduct(@PathVariable Long id) {
        return productService.deleteProduct(id);
    }

    @GetMapping("/low-stock")
    @Operation(summary = "품절 임박 상품 조회")
    public Response<List<Product>> getLowStock(@RequestParam(defaultValue = "5") Integer threshold) {
        return productService.getLowStock(threshold);
    }

    @GetMapping("/rankings")
    @Operation(summary = "상품 판매 순위 조회")
    public Response<List<ProductRankingDto>> getRankings(@RequestParam(defaultValue = "5") Integer limit) {
        return productService.getRankings(limit);
    }
}
