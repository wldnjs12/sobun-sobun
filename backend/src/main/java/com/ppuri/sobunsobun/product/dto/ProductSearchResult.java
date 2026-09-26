package com.ppuri.sobunsobun.product.dto;

import java.math.BigDecimal;

public record ProductSearchResult(String name, BigDecimal price, String mallName, String url) {
}
