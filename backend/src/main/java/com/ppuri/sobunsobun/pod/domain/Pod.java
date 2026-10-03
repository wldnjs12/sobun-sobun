package com.ppuri.sobunsobun.pod.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.concurrent.ThreadLocalRandom;

/** 하나의 공동구매 팟. 참여자 수·총액·수고비율이 바뀔 때마다 1인당 금액을 다시 계산한다. */
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Pod {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long buildingId;
    private Long hostUserId;
    private String title;
    private BigDecimal totalAmount;
    private Integer targetParticipantCount;
    private Integer participantCount;
    private BigDecimal commissionRate;
    private LocalDateTime deadline;
    private Boolean closed;

    /** "혼자 샀을 때" 비교 가격. 없으면(null) 정산 결과 화면에서 절약액 카드를 보여주지 않는다. */
    private BigDecimal originalPrice;

    /** 비대면 픽업 수령용 4자리 PIN. 생성 시 자동 발급, 이후 변경 없음. */
    private String pickupPin;

    @Builder
    public Pod(Long buildingId, Long hostUserId, String title, BigDecimal totalAmount,
               Integer targetParticipantCount, BigDecimal commissionRate, LocalDateTime deadline,
               BigDecimal originalPrice) {
        this.buildingId = buildingId;
        this.hostUserId = hostUserId;
        this.title = title;
        this.totalAmount = totalAmount;
        this.targetParticipantCount = targetParticipantCount;
        this.participantCount = 0;
        this.commissionRate = commissionRate;
        this.deadline = deadline;
        this.closed = false;
        this.originalPrice = originalPrice;
        this.pickupPin = String.format("%04d", ThreadLocalRandom.current().nextInt(10000));
    }

    public void join() {
        if (closed) {
            throw new IllegalStateException("이미 마감된 팟에는 참여할 수 없습니다.");
        }
        if (participantCount >= targetParticipantCount) {
            throw new IllegalStateException("목표 인원이 이미 가득 찼습니다.");
        }
        participantCount++;
    }

    public void cancelJoin() {
        if (closed) {
            throw new IllegalStateException("이미 마감된 팟은 참여를 취소할 수 없습니다.");
        }
        if (participantCount <= 0) {
            throw new IllegalStateException("참여자가 없어 취소할 수 없습니다.");
        }
        participantCount--;
    }

    public void close(Long requesterId) {
        if (!hostUserId.equals(requesterId)) {
            throw new IllegalStateException("대표만 팟을 마감할 수 있습니다.");
        }
        if (closed) {
            throw new IllegalStateException("이미 마감된 팟입니다.");
        }
        if (participantCount <= 0) {
            throw new IllegalStateException("참여자가 없는 팟은 마감할 수 없습니다.");
        }
        closed = true;
    }

    /** 1인당 금액 = 총액 x (1 + 수고비율) / 참여자 수 (원 단위 올림). */
    public BigDecimal calculatePerPersonAmount() {
        int divisor = Math.max(participantCount, 1);
        return totalAmount
                .multiply(BigDecimal.ONE.add(commissionRate))
                .divide(BigDecimal.valueOf(divisor), 0, RoundingMode.CEILING);
    }
}
