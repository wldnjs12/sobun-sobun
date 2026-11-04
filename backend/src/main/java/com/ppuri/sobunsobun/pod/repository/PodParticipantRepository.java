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

    void deleteByPodIdAndUserId(Long podId, Long userId);
}
