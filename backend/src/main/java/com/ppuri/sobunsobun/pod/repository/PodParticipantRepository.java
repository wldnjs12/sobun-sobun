package com.ppuri.sobunsobun.pod.repository;

import com.ppuri.sobunsobun.pod.domain.PodParticipant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PodParticipantRepository extends JpaRepository<PodParticipant, Long> {

    boolean existsByPodIdAndUserId(Long podId, Long userId);

    Optional<PodParticipant> findByPodIdAndUserId(Long podId, Long userId);

    List<PodParticipant> findByPodIdOrderByJoinedAt(Long podId);

    void deleteByPodIdAndUserId(Long podId, Long userId);
}
