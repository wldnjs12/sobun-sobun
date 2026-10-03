package com.ppuri.sobunsobun.pod.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/** 팟에 참여한 사용자 1건. ERD의 POD_PARTICIPANT. */
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PodParticipant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long podId;
    private Long userId;
    private LocalDateTime joinedAt;

    /** 정산 금액을 대표에게 보냈다고 본인이 신고한 시각. 실제 결제 연동은 없음(자가 신고). */
    private LocalDateTime paidAt;

    /** 비대면 픽업함에서 물품을 수령했다고 본인이 신고한 시각. */
    private LocalDateTime pickedUpAt;

    @Builder
    public PodParticipant(Long podId, Long userId) {
        this.podId = podId;
        this.userId = userId;
        this.joinedAt = LocalDateTime.now();
    }

    public void markPaid() {
        this.paidAt = LocalDateTime.now();
    }

    public void markPickedUp() {
        this.pickedUpAt = LocalDateTime.now();
    }
}
