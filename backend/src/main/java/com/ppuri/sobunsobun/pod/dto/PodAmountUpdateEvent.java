package com.ppuri.sobunsobun.pod.dto;

import java.math.BigDecimal;

/**
 * WebSocket으로 /topic/pods/{podId} 구독자에게 브로드캐스트되는 실시간 갱신 이벤트.
 * 참여·취소·마감·모집 취소·글 수정 때마다 보낸다. status(OPEN/CLOSED/CANCELLED)는 2026-11에 추가 —
 * 글 수정처럼 금액 외 정보가 바뀐 경우 프론트는 이 이벤트를 받으면 상세를 다시 불러온다.
 */
public record PodAmountUpdateEvent(Long podId, Integer participantCount, BigDecimal perPersonAmount, Boolean closed,
                                   String status) {
}
