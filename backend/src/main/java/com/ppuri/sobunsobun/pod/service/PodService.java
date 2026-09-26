package com.ppuri.sobunsobun.pod.service;

import com.ppuri.sobunsobun.pod.dto.PodAmountUpdateEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
@RequiredArgsConstructor
public class PodService {

    private final SimpMessagingTemplate messagingTemplate;

    /**
     * TODO:
     * 1) 팟 생성/참여 처리 (Pod, 참여자 엔티티 저장)
     * 2) 참여할 때마다 1인당 금액 = 총액 * (1 + 수고비율) / 참여자수 로 재계산
     * 3) recalcAndBroadcast 호출로 실시간 반영
     */
    public void recalcAndBroadcast(Long podId, BigDecimal totalAmount, BigDecimal commissionRate, int participantCount) {
        BigDecimal perPerson = totalAmount
                .multiply(BigDecimal.ONE.add(commissionRate))
                .divide(BigDecimal.valueOf(Math.max(participantCount, 1)), 0, RoundingMode.CEILING);

        messagingTemplate.convertAndSend(
                "/topic/pods/" + podId,
                new PodAmountUpdateEvent(podId, participantCount, perPerson)
        );
    }
}
