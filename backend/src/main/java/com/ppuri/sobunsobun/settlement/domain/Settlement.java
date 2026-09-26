package com.ppuri.sobunsobun.settlement.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/** 팟 마감 후 확정되는 정산 결과. 영수증 OCR로 원가를 확인해 수고비 정률을 적용한다. */
@Entity
@Getter
@NoArgsConstructor
public class Settlement {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long podId;
    private String receiptImageUrl;
    private BigDecimal recognizedCost;   // OCR로 인식된 실제 영수증 금액
    private BigDecimal commissionRate;
    private BigDecimal finalAmount;      // recognizedCost * (1 + commissionRate)
    private Boolean confirmed = false;
}
