package com.sk.skala.shopapi.controller;

import com.sk.skala.shopapi.common.SessionHandler;
import com.sk.skala.shopapi.common.Response;
import com.sk.skala.shopapi.data.dto.RecentProductDto;
import com.sk.skala.shopapi.service.RecentlyViewedProductService;
import io.swagger.v3.oas.annotations.*;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/customers") @RequiredArgsConstructor
@Tag(name = "최근 본 상품 API", description = "로그인 고객의 최근 조회 상품")
public class RecentlyViewedProductController {
    private final RecentlyViewedProductService recentlyViewedProductService;
    private final SessionHandler sessionHandler;

    @GetMapping("/recent-products")
    @Operation(summary = "최근 본 상품 조회")
    public Response<List<RecentProductDto>> getRecentProducts() {
        return recentlyViewedProductService.getRecentProducts(sessionHandler.getCurrentCustomerId());
    }
}
