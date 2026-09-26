package com.ppuri.sobunsobun.pod.dto;

import java.math.BigDecimal;

/**
 * WebSocket으로 /topic/pods/{podId} 구독자에게 브로드캐스트되는 실시간 갱신 이벤트.
 * 참여자가 늘거나 총액이 바뀔 때마다 1인당 금액을 다시 계산해 내려보낸다.
 */
public record PodAmountUpdateEvent(Long podId, Integer participantCount, BigDecimal perPersonAmount) {
}
