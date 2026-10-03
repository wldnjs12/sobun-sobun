package com.ppuri.sobunsobun.auth.domain;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface BuildingAuthRepository extends JpaRepository<BuildingAuth, Long> {

    Optional<BuildingAuth> findByBuildingIdAndUserId(Long buildingId, Long userId);
}
