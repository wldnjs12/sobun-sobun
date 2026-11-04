package com.ppuri.sobunsobun.pod.websocket;

import com.ppuri.sobunsobun.global.exception.BuildingAccessDeniedException;
import com.ppuri.sobunsobun.auth.service.NeighborhoodService;
import com.ppuri.sobunsobun.pod.domain.Pod;
import com.ppuri.sobunsobun.pod.repository.PodParticipantRepository;
import com.ppuri.sobunsobun.pod.repository.PodRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * STOMP 구독 시점에 접근 권한을 확인한다. /topic/pods/{id} 구독 요청이 들어오면 CONNECT 시점에 받은 X-User-Id가
 * 그 팟의 대표·참여자이거나 동네(반경 1km) 이웃인지 확인하고, 아니면 구독을 거부한다 (2026-11: 건물 → 동네 단위).
 */
@Component
@RequiredArgsConstructor
public class PodSubscriptionInterceptor implements ChannelInterceptor {

    private static final Pattern POD_TOPIC = Pattern.compile("^/topic/pods/(\\d+)$");
    private static final String USER_ID_HEADER = "X-User-Id";
    private static final String SESSION_USER_ID_KEY = "userId";

    // PodService를 주입하지 않는 이유: PodService → SimpMessagingTemplate → WebSocket 설정 → 이 인터셉터로
    // 빈 생성이 순환해서 앱이 안 뜬다. 그래서 저장소와 NeighborhoodService만 직접 쓴다.
    private final PodRepository podRepository;
    private final PodParticipantRepository podParticipantRepository;
    private final NeighborhoodService neighborhoodService;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) {
            return message;
        }

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            rememberUserId(accessor);
        } else if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            guardPodTopicSubscription(accessor);
        }
        return message;
    }

    private void rememberUserId(StompHeaderAccessor accessor) {
        String userIdHeader = accessor.getFirstNativeHeader(USER_ID_HEADER);
        if (accessor.getSessionAttributes() != null && userIdHeader != null) {
            accessor.getSessionAttributes().put(SESSION_USER_ID_KEY, Long.valueOf(userIdHeader));
        }
    }

    private void guardPodTopicSubscription(StompHeaderAccessor accessor) {
        String destination = accessor.getDestination();
        Matcher matcher = destination == null ? null : POD_TOPIC.matcher(destination);
        if (matcher == null || !matcher.matches()) {
            return;
        }

        Long userId = accessor.getSessionAttributes() == null
                ? null
                : (Long) accessor.getSessionAttributes().get(SESSION_USER_ID_KEY);
        if (userId == null) {
            throw new BuildingAccessDeniedException("구독하려면 연결 시 X-User-Id가 필요해요.");
        }

        Long podId = Long.valueOf(matcher.group(1));
        Pod pod = podRepository.findById(podId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 팟입니다: " + podId));
        // 대표·참여자는 항상 구독 가능 (정산·픽업까지 실시간 갱신을 받아야 하므로)
        if (pod.isHost(userId) || podParticipantRepository.existsByPodIdAndUserId(podId, userId)) {
            return;
        }
        neighborhoodService.requireNeighbor(userId, pod.getBuildingId(), "우리 동네 밖의 팟 채널은 구독할 수 없어요.");
    }
}
