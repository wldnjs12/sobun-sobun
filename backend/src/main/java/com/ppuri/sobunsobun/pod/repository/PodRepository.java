package com.ppuri.sobunsobun.pod.repository;

import com.ppuri.sobunsobun.pod.domain.Pod;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PodRepository extends JpaRepository<Pod, Long> {

    /**
     * 참여/취소/마감 중 동시 요청이 들어와도 한 번에 하나씩만 처리되도록 행 잠금을 건다.
     * 목표 인원 초과 참여(레이스 컨디션) 방지용.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Pod p where p.id = :id")
    Optional<Pod> findByIdForUpdate(@Param("id") Long id);

    /** 건물 홈 화면용 — 그 건물의 팟 전체, 최신순. 상태·검색어 필터와 정렬은 서비스에서 한다. */
    List<Pod> findByBuildingIdOrderByIdDesc(Long buildingId);

    /** 마이페이지 "내가 연 팟" */
    List<Pod> findByHostUserIdOrderByIdDesc(Long hostUserId);
}
