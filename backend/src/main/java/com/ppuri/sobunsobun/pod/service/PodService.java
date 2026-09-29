package com.ppuri.sobunsobun.pod.service;

import com.ppuri.sobunsobun.pod.domain.Pod;
import com.ppuri.sobunsobun.pod.domain.PodParticipant;
import com.ppuri.sobunsobun.pod.dto.PodAmountUpdateEvent;
import com.ppuri.sobunsobun.pod.dto.PodCreateRequest;
import com.ppuri.sobunsobun.pod.dto.PodResponse;
import com.ppuri.sobunsobun.pod.repository.PodParticipantRepository;
import com.ppuri.sobunsobun.pod.repository.PodRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PodService {

    private final PodRepository podRepository;
    private final PodParticipantRepository podParticipantRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public PodResponse create(PodCreateRequest request) {
        Pod pod = Pod.builder()
                .buildingId(request.buildingId())
                .hostUserId(request.hostUserId())
                .title(request.title())
                .totalAmount(request.totalAmount())
                .targetParticipantCount(request.targetParticipantCount())
                .commissionRate(request.commissionRateOrDefault())
                .deadline(request.deadline())
                .build();
        return PodResponse.from(podRepository.save(pod));
    }

    @Transactional
    public PodResponse join(Long podId, Long userId) {
        Pod pod = getPodForUpdate(podId);
        if (podParticipantRepository.existsByPodIdAndUserId(podId, userId)) {
            throw new IllegalStateException("이미 참여한 팟입니다.");
        }
        pod.join();
        podParticipantRepository.save(PodParticipant.builder().podId(podId).userId(userId).build());
        broadcast(pod);
        return PodResponse.from(pod);
    }

    @Transactional
    public PodResponse cancelJoin(Long podId, Long userId) {
        Pod pod = getPodForUpdate(podId);
        if (!podParticipantRepository.existsByPodIdAndUserId(podId, userId)) {
            throw new IllegalStateException("참여하지 않은 팟입니다.");
        }
        pod.cancelJoin();
        podParticipantRepository.deleteByPodIdAndUserId(podId, userId);
        broadcast(pod);
        return PodResponse.from(pod);
    }

    @Transactional
    public PodResponse close(Long podId, Long hostUserId) {
        Pod pod = getPodForUpdate(podId);
        pod.close(hostUserId);
        broadcast(pod);
        return PodResponse.from(pod);
    }

    @Transactional(readOnly = true)
    public PodResponse getDetail(Long podId) {
        return PodResponse.from(getPod(podId));
    }

    private Pod getPodForUpdate(Long podId) {
        return podRepository.findByIdForUpdate(podId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 팟입니다: " + podId));
    }

    private Pod getPod(Long podId) {
        return podRepository.findById(podId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 팟입니다: " + podId));
    }

    private void broadcast(Pod pod) {
        messagingTemplate.convertAndSend(
                "/topic/pods/" + pod.getId(),
                new PodAmountUpdateEvent(pod.getId(), pod.getParticipantCount(), pod.calculatePerPersonAmount())
        );
    }
}
