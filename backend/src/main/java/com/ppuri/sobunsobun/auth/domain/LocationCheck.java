package com.ppuri.sobunsobun.auth.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * GPS 2차 확인 기록 (ERD의 LOCATION_CHECK). 판정 결과만 남기는 append-only 로그다.
 * 캐시가 아니라 매 호출마다 새 행을 남긴다(open-decisions.md: 캐시 없음, 매번 재확인) — 그래서 upsert 메서드가 없다.
 * 원본 위경도는 개인정보라 저장하지 않고, 성공/실패·시각·목적만 남긴다.
 */
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class LocationCheck {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "building_id", nullable = false)
    private Long buildingId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LocationCheckPurpose purpose;

    @Column(nullable = false)
    private boolean success;

    @Column(nullable = false)
    private LocalDateTime checkedAt;

    public LocationCheck(Long userId, Long buildingId, LocationCheckPurpose purpose,
                          boolean success, LocalDateTime checkedAt) {
        this.userId = userId;
        this.buildingId = buildingId;
        this.purpose = purpose;
        this.success = success;
        this.checkedAt = checkedAt;
    }
}
