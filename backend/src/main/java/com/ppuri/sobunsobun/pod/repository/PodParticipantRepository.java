package com.ppuri.sobunsobun.pod.repository;

import com.ppuri.sobunsobun.pod.domain.PodParticipant;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PodParticipantRepository extends JpaRepository<PodParticipant, Long> {

    boolean existsByPodIdAndUserId(Long podId, Long userId);

    void deleteByPodIdAndUserId(Long podId, Long userId);
}
