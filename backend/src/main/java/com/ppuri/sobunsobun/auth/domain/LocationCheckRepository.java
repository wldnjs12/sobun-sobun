package com.ppuri.sobunsobun.auth.domain;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;

/**
 * GPS 2차 확인 로그. 판정 결과를 "캐시"로 재사용하지는 않지만,
 * 팟 개설·참여 API가 "방금 위치 확인을 통과했는지"를 서버에서 다시 확인할 때 아래 조회를 쓴다
 * (프론트만 확인하면 API를 직접 호출해서 GPS 확인을 건너뛸 수 있기 때문).
 */
public interface LocationCheckRepository extends JpaRepository<LocationCheck, Long> {

    boolean existsByUserIdAndBuildingIdAndPurposeAndSuccessTrueAndCheckedAtAfter(
            Long userId, Long buildingId, LocationCheckPurpose purpose, LocalDateTime after);
}
