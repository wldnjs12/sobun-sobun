package com.ppuri.sobunsobun.community.repository;

import com.ppuri.sobunsobun.community.domain.CommunityReport;
import com.ppuri.sobunsobun.community.domain.ReportTargetType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;

public interface CommunityReportRepository extends JpaRepository<CommunityReport, Long> {

    boolean existsByTargetTypeAndTargetIdAndReporterUserId(ReportTargetType targetType, Long targetId, Long reporterUserId);

    long countByTargetTypeAndTargetId(ReportTargetType targetType, Long targetId);

    void deleteByTargetTypeAndTargetIdIn(ReportTargetType targetType, Collection<Long> targetIds);
}
