package com.ppuri.sobunsobun.pod.dto;

import com.ppuri.sobunsobun.pod.domain.Pod;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** 컨트롤러가 내려주는 팟 상세 응답. 엔티티를 직접 노출하지 않기 위한 DTO. */
public record PodResponse(
        Long id,
        Long buildingId,
        Long hostUserId,
        String title,
        BigDecimal totalAmount,
        Integer targetParticipantCount,
        Integer participantCount,
        BigDecimal commissionRate,
        BigDecimal perPersonAmount,
        LocalDateTime deadline,
        Boolean closed
) {
    public static PodResponse from(Pod pod) {
        return new PodResponse(
                pod.getId(),
                pod.getBuildingId(),
                pod.getHostUserId(),
                pod.getTitle(),
                pod.getTotalAmount(),
                pod.getTargetParticipantCount(),
                pod.getParticipantCount(),
                pod.getCommissionRate(),
                pod.calculatePerPersonAmount(),
                pod.getDeadline(),
                pod.getClosed()
        );
    }
}
