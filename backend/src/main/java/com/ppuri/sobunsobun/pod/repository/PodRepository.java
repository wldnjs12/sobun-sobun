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

    /** 건물 홈 화면(S4)용 — 마감되지 않은 팟만 최신순으로. */
    List<Pod> findByBuildingIdAndClosedFalseOrderByIdDesc(Long buildingId);
}
