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

    @Builder
    public PodParticipant(Long podId, Long userId) {
        this.podId = podId;
        this.userId = userId;
        this.joinedAt = LocalDateTime.now();
    }
}
