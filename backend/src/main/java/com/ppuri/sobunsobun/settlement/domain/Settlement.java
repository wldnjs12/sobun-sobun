package com.ppuri.sobunsobun.settlement.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * 팟 마감 후 확정되는 정산 결과. 영수증 OCR로 원가를 확인해 수고비 정률을 적용한다.
 * hostPaymentLink 필드는 지원이 ③ 정산 결과 화면(12번) 구현 중 추가함 — 문소원님 확인 부탁드려요.
 */
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

    /**
     * 대표가 직접 입력한 개인 송금 링크(카카오페이 "받을 링크" 등) 또는 계좌번호 텍스트. 선택값.
     * 실제 결제 API 연동이 아니라 대표가 본인 앱에서 만든 링크를 그대로 붙여넣는 방식.
     */
    private String hostPaymentLink;

    public Settlement(Long podId, BigDecimal recognizedCost, BigDecimal commissionRate, BigDecimal finalAmount,
                      Integer participantCount, BigDecimal perPersonAmount, String hostPaymentLink) {
        this.podId = podId;
        this.recognizedCost = recognizedCost;
        this.commissionRate = commissionRate;
        this.finalAmount = finalAmount;
        this.participantCount = participantCount;
        this.perPersonAmount = perPersonAmount;
        this.hostPaymentLink = hostPaymentLink;
        this.confirmed = true;
    }

    /** hostPaymentLink 없이 만드는 기존 호출 호환용. */
    public Settlement(Long podId, BigDecimal recognizedCost, BigDecimal commissionRate, BigDecimal finalAmount,
                      Integer participantCount, BigDecimal perPersonAmount) {
        this(podId, recognizedCost, commissionRate, finalAmount, participantCount, perPersonAmount, null);
    }
}
