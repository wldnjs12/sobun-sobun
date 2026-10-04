package com.ppuri.sobunsobun.community.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 신고 1건. ERD의 COMMUNITY_REPORT.
 * 같은 사람이 같은 대상을 두 번 신고해도 한 번만 세도록 (대상, 신고자)에 유니크 제약을 건다.
 */
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(uniqueConstraints = @UniqueConstraint(
        name = "uk_community_report_target_reporter",
        columnNames = {"target_type", "target_id", "reporter_user_id"}))
public class CommunityReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    private ReportTargetType targetType;

    private Long targetId;
    private Long reporterUserId;
    private LocalDateTime createdAt;

    @Builder
    public CommunityReport(ReportTargetType targetType, Long targetId, Long reporterUserId) {
        this.targetType = targetType;
        this.targetId = targetId;
        this.reporterUserId = reporterUserId;
        this.createdAt = LocalDateTime.now();
    }
}
