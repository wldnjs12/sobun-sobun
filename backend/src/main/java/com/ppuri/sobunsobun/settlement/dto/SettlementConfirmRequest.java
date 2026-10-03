package com.ppuri.sobunsobun.settlement.dto;

import java.math.BigDecimal;

/**
 * 대표가 확인(또는 수동 수정)한 금액으로 정산을 확정하는 요청.
 * recognizedCost: 영수증 원가(원), commissionRate: 수고비율 (0.05 = 5%)
 * 값 검증은 경계값 테스트를 한곳에서 하도록 SettlementService에서 한다.
 */
public record SettlementConfirmRequest(BigDecimal recognizedCost, BigDecimal commissionRate, String hostPaymentLink) {

    /** hostPaymentLink 없이 확정하는 기존 호출 호환용. */
    public SettlementConfirmRequest(BigDecimal recognizedCost, BigDecimal commissionRate) {
        this(recognizedCost, commissionRate, null);
    }
}
