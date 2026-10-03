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

    @Builder
    public Pod(Long buildingId, Long hostUserId, String title, BigDecimal totalAmount,
               Integer targetParticipantCount, BigDecimal commissionRate, LocalDateTime deadline) {
        this.buildingId = buildingId;
        this.hostUserId = hostUserId;
        this.title = title;
        this.totalAmount = totalAmount;
        this.targetParticipantCount = targetParticipantCount;
        this.participantCount = 0;
        this.commissionRate = commissionRate;
        this.deadline = deadline;
        this.closed = false;
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
