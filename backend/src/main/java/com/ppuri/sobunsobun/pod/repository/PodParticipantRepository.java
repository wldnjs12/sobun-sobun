package com.ppuri.sobunsobun.pod.repository;

import com.ppuri.sobunsobun.pod.domain.PodParticipant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PodParticipantRepository extends JpaRepository<PodParticipant, Long> {

    boolean existsByPodIdAndUserId(Long podId, Long userId);

    Optional<PodParticipant> findByPodIdAndUserId(Long podId, Long userId);

    List<PodParticipant> findByPodIdOrderByJoinedAt(Long podId);

    /** 마이페이지 "내가 참여한 팟" — 최근에 참여한 것부터 */
    List<PodParticipant> findByUserIdOrderByJoinedAtDesc(Long userId);

    /** 임팩트 리포트: 건물 팟들의 참여 기록을 한 번에 */
    List<PodParticipant> findByPodIdIn(java.util.Collection<Long> podIds);

    void deleteByPodIdAndUserId(Long podId, Long userId);
}
