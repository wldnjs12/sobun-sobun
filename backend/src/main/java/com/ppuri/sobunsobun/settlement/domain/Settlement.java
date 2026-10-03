package com.ppuri.sobunsobun.settlement.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/** 팟 마감 후 확정되는 정산 결과. 영수증 OCR로 원가를 확인해 수고비 정률을 적용한다. */
@Entity
@Getter
@NoArgsConstructor
public class Settlement {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long podId;
    private String receiptImageUrl;
    private BigDecimal recognizedCost;   // OCR로 인식된 실제 영수증 금액
    private BigDecimal commissionRate;
    private BigDecimal finalAmount;      // recognizedCost * (1 + commissionRate)
    private Boolean confirmed = false;

    /** 확정 시점의 참여자 수. 확정 뒤 팟 참여자 수가 바뀌어도 정산 결과가 흔들리지 않게 스냅샷으로 남긴다. */
    private Integer participantCount;

    /** 1인당 송금액. 정산 결과 화면에서 바로 쓰고, 계산 당시 반올림 결과를 그대로 보존한다. */
    private BigDecimal perPersonAmount;

    public Settlement(Long podId, BigDecimal recognizedCost, BigDecimal commissionRate, BigDecimal finalAmount,
                      Integer participantCount, BigDecimal perPersonAmount) {
        this.podId = podId;
        this.recognizedCost = recognizedCost;
        this.commissionRate = commissionRate;
        this.finalAmount = finalAmount;
        this.participantCount = participantCount;
        this.perPersonAmount = perPersonAmount;
        this.confirmed = true;
    }
}
