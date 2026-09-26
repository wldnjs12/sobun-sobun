package com.ppuri.sobunsobun.product.controller;

import com.ppuri.sobunsobun.global.common.ApiResponse;
import com.ppuri.sobunsobun.product.dto.ProductSearchResult;
import com.ppuri.sobunsobun.product.service.ProductSearchService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductSearchService productSearchService;

    /** 핵심 기능 ④: 최저가 조회 기반 상품 리스트 제공 */
    @GetMapping("/search")
    public ApiResponse<List<ProductSearchResult>> search(@RequestParam String keyword) {
        return ApiResponse.ok(productSearchService.searchLowestPrice(keyword));
    }
}
