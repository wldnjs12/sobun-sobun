package com.ppuri.sobunsobun.pod.service;

import com.ppuri.sobunsobun.auth.service.BuildingAccessService;
import com.ppuri.sobunsobun.pod.domain.Pod;
import com.ppuri.sobunsobun.pod.domain.PodForbiddenException;
import com.ppuri.sobunsobun.pod.repository.PodParticipantRepository;
import com.ppuri.sobunsobun.pod.repository.PodRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * "이 팟 채팅에 들어올 수 있는 사람인가" 판정. REST(PodChatService)와 STOMP 구독(PodSubscriptionInterceptor)이 같이 쓴다.
 *
 * 규칙: 같은 건물 + (대표 또는 참여자). 참여를 취소하면 참여자 행이 지워지므로 그때부터는 못 본다.
 * 왜 따로 뺐나: 인터셉터는 SimpMessagingTemplate을 쓰는 서비스를 주입하면 빈 생성이 순환해서 앱이 안 뜬다
 * (PodSubscriptionInterceptor 주석 참고). 그래서 저장소만 쓰는 이 클래스를 공용으로 둔다.
 */
@Component
@RequiredArgsConstructor
public class PodChatGuard {

    private final PodRepository podRepository;
    private final PodParticipantRepository podParticipantRepository;
    private final BuildingAccessService buildingAccessService;

    /** 채팅 참여자면 팟을 돌려주고, 아니면 403(다른 건물: BUILDING_ACCESS_DENIED, 같은 건물 비참여자: POD_FORBIDDEN) */
    public Pod requireChatMember(Long podId, Long userId) {
        Pod pod = podRepository.findById(podId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 팟입니다: " + podId));
        buildingAccessService.requireMembership(userId, pod.getBuildingId());
        if (!pod.isHost(userId) && !podParticipantRepository.existsByPodIdAndUserId(podId, userId)) {
            throw new PodForbiddenException("팟에 참여한 이웃만 채팅을 볼 수 있어요.");
        }
        return pod;
    }
}
