package com.ppuri.sobunsobun.auth.repository;

import com.ppuri.sobunsobun.auth.domain.Building;
import org.springframework.data.jpa.repository.JpaRepository;

/** 지원(②)이 팟 생성 시 buildingId 존재 검증을 위해 추가했습니다. 문소원님 auth 작업과 겹치면 조정해주세요. */
public interface BuildingRepository extends JpaRepository<Building, Long> {
}
