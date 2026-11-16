package com.ppuri.sobunsobun.pod.service;

import com.ppuri.sobunsobun.auth.domain.User;
import com.ppuri.sobunsobun.auth.domain.UserRepository;
import com.ppuri.sobunsobun.pod.domain.Pod;
import com.ppuri.sobunsobun.pod.dto.PodImpactResponse;
import com.ppuri.sobunsobun.pod.repository.PodParticipantRepository;
import com.ppuri.sobunsobun.pod.repository.PodRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 건물 임팩트 리포트. 범위는 요청자의 건물로 서버가 정한다 (건물 단위 격리 — 다른 건물 숫자는 볼 수 없음).
 * 건물이 없는 사용자는 전부 0인 리포트를 받는다.
 */
@Service
@RequiredArgsConstructor
public class PodImpactService {

    private final UserRepository userRepository;
    private final PodRepository podRepository;
    private final PodParticipantRepository podParticipantRepository;

    @Transactional(readOnly = true)
    public PodImpactResponse impactOfMyBuilding(Long userId) {
        Long buildingId = userRepository.findById(userId).map(User::getBuildingId).orElse(null);
        if (buildingId == null) return PodImpactCalculator.calculate(List.of(), List.of());

        List<Pod> pods = podRepository.findByBuildingIdOrderByIdDesc(buildingId);
        List<Long> podIds = pods.stream().map(Pod::getId).toList();
        return PodImpactCalculator.calculate(pods, podIds.isEmpty() ? List.of() : podParticipantRepository.findByPodIdIn(podIds));
    }
}
