package com.ppuri.sobunsobun.settlement.service;

/**
 * 정산이 판단에 쓰는 팟 정보만 모은 읽기 전용 스냅샷.
 * buildingId는 건물 소속 가드, hostUserId는 대표 확인, closed는 마감 여부, participantCount는 1인당 금액 계산에 쓴다.
 */
public record PodSummary(Long podId, Long buildingId, Long hostUserId, int participantCount, boolean closed) {
}
