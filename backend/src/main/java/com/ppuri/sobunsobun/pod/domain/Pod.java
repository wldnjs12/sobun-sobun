package com.ppuri.sobunsobun.pod.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/** 하나의 공동구매 팟. 총액/인원/대표 수고비율이 바뀔 때마다 1인당 금액을 재계산한다. */
@Entity
@Getter
@NoArgsConstructor
public class Pod {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long buildingId;
    private String title;
    private BigDecimal totalAmount = BigDecimal.ZERO;
    private Integer participantCount = 0;
    private BigDecimal commissionRate = new BigDecimal("0.05"); // 대표 수고비 정률, 기본 5%
    private Boolean closed = false;

    // TODO: 참여자 목록은 별도 PodParticipant 엔티티로 분리 권장
}
