package com.ppuri.sobunsobun.settlement.domain;

import org.springframework.data.jpa.repository.JpaRepository;

public interface SettlementRepository extends JpaRepository<Settlement, Long> {

    boolean existsByPodIdAndConfirmedTrue(Long podId);
}
