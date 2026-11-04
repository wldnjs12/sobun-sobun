package com.ppuri.sobunsobun.pod.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.ppuri.sobunsobun.pod.domain.Pod;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 컨트롤러가 내려주는 팟 응답. 엔티티를 직접 노출하지 않기 위한 DTO.
 *
 * 위치 정보는 neighborhoodName(법정동 이름, 예 "용현동")과 distanceLabel(대략 거리, 예 "약 300m")만 내려준다.
 * 대표 건물의 도로명주소·건물명·동·호수는 절대 넣지 않는다 (2026-11 기획 개편 위치 노출 정책).
 * pickupPin도 여기엔 없다 — 참여자 전용이라 MyParticipationResponse에만 있다.
 */
public record PodResponse(
        Long id,
        Long buildingId,
        Long hostUserId,
        @JsonProperty("isHost") boolean isHost,
        String title,
        String category,
        String categoryLabel,
        String description,
        BigDecimal totalAmount,
        Integer totalUnits,
        String unitLabel,
        Integer unitsPerPerson,
        Integer targetParticipantCount,
        Integer participantCount,
        BigDecimal commissionRate,
        BigDecimal perPersonAmount,
        LocalDateTime deadline,
        boolean deadlinePassed,
        Boolean closed,
        String status,
        String pickupNote,
        BigDecimal originalPrice,
        String neighborhoodName,
        String distanceLabel
) {
    /** 보는 사람(viewerId) 기준 정보 없이 만들 때(테스트 등). 위치 문구는 비어 있다. */
    public static PodResponse from(Pod pod) {
        return of(pod, null, null, null, LocalDateTime.now());
    }

    public static PodResponse of(Pod pod, Long viewerId, String neighborhoodName, String distanceLabel, LocalDateTime now) {
        return new PodResponse(
                pod.getId(),
                pod.getBuildingId(),
                pod.getHostUserId(),
                pod.isHost(viewerId),
                pod.getTitle(),
                pod.getCategory().name(),
                pod.getCategory().getLabel(),
                pod.getDescription(),
                pod.getTotalAmount(),
                pod.getTotalUnits(),
                pod.getUnitLabel(),
                pod.getUnitsPerPerson(),
                pod.getTargetParticipantCount(),
                pod.getParticipantCount(),
                pod.getCommissionRate(),
                pod.calculatePerPersonAmount(),
                pod.getDeadline(),
                pod.isDeadlinePassed(now),
                pod.getClosed(),
                pod.getStatus().name(),
                pod.getPickupNote(),
                pod.getOriginalPrice(),
                neighborhoodName,
                distanceLabel
        );
    }
}
