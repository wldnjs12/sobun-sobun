package com.ppuri.sobunsobun.pod.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** 팟 개설 요청. 수고비율을 비워두면 기본값(5%)이 적용된다. */
public record PodCreateRequest(
        @NotNull Long buildingId,
        @NotNull Long hostUserId,
        @NotBlank String title,
        @NotNull @Positive BigDecimal totalAmount,
        @NotNull @Positive Integer targetParticipantCount,
        BigDecimal commissionRate,
        LocalDateTime deadline,
        /** "혼자 샀을 때" 비교 가격. 최저가 조회(④)에서 팟 생성으로 넘어올 때만 채워짐, 선택값. */
        BigDecimal originalPrice
) {
    private static final BigDecimal DEFAULT_COMMISSION_RATE = new BigDecimal("0.05");

    public BigDecimal commissionRateOrDefault() {
        return commissionRate != null ? commissionRate : DEFAULT_COMMISSION_RATE;
    }
}
