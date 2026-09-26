package com.ppuri.sobunsobun.product.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/** 상품명으로 조회한 최저가 검색 결과를 캐싱하는 엔티티(중복 조회 방지). */
@Entity
@Getter
@NoArgsConstructor
public class Product {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private BigDecimal lowestPrice;
    private String sourceUrl;
    private String mallName;
}
