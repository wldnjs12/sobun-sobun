package com.ppuri.sobunsobun.pod.websocket;

import com.ppuri.sobunsobun.auth.service.BuildingAccessService;
import com.ppuri.sobunsobun.global.exception.BuildingAccessDeniedException;
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
 * STOMP 구독 시점에 건물 소속을 확인한다. /topic/pods/{id} 구독 요청이 들어오면 그 팟의 buildingId와
 * CONNECT 시점에 받은 X-User-Id의 소속을 비교해서, 다른 건물이면 구독을 거부한다 (기획 개편: 건물 소속 검증).
 */
@Component
@RequiredArgsConstructor
public class PodSubscriptionInterceptor implements ChannelInterceptor {

    private static final Pattern POD_TOPIC = Pattern.compile("^/topic/pods/(\\d+)$");
    private static final String USER_ID_HEADER = "X-User-Id";
    private static final String SESSION_USER_ID_KEY = "userId";

    private final PodRepository podRepository;
    private final BuildingAccessService buildingAccessService;

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
        Long buildingId = podRepository.findById(podId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 팟입니다: " + podId))
                .getBuildingId();
        buildingAccessService.requireMembership(userId, buildingId, "다른 건물의 팟 채널은 구독할 수 없어요.");
    }
}
