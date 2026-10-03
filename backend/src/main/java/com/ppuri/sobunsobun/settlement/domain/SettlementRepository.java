package com.ppuri.sobunsobun.settlement.domain;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SettlementRepository extends JpaRepository<Settlement, Long> {

    boolean existsByPodIdAndConfirmedTrue(Long podId);

    /** 정산 결과 화면(12번) 재조회용 — 지원이 추가. */
    Optional<Settlement> findByPodIdAndConfirmedTrue(Long podId);
}
