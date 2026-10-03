package com.ppuri.sobunsobun.settlement.domain;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SettlementRepository extends JpaRepository<Settlement, Long> {

    boolean existsByPodIdAndConfirmedTrue(Long podId);

    /** pod_id 유니크 제약이 없어 동시 확정으로 행이 2개 생길 수 있으므로, 단건 조회 대신 가장 최근 것 하나를 고른다 */
    Optional<Settlement> findFirstByPodIdAndConfirmedTrueOrderByIdDesc(Long podId);
}
