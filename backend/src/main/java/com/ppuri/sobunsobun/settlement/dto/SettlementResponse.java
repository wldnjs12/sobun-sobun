package com.ppuri.sobunsobun.settlement.dto;

import com.ppuri.sobunsobun.settlement.domain.Settlement;

import java.math.BigDecimal;

/** 확정된 정산 결과 (API 명세의 `Settlement`). 엔티티를 그대로 내보내지 않도록 DTO로 옮긴다. */
public record SettlementResponse(
        Long id,
        Long podId,
        String receiptImageUrl,
        BigDecimal recognizedCost,
        BigDecimal commissionRate,
        BigDecimal finalAmount,
        Integer participantCount,
        BigDecimal perPersonAmount,
        Boolean confirmed,
        String hostPaymentLink
) {
    public static SettlementResponse from(Settlement s) {
        return new SettlementResponse(s.getId(), s.getPodId(), s.getReceiptImageUrl(), s.getRecognizedCost(),
                s.getCommissionRate(), s.getFinalAmount(), s.getParticipantCount(), s.getPerPersonAmount(),
                s.getConfirmed(), s.getHostPaymentLink());
    }
}
