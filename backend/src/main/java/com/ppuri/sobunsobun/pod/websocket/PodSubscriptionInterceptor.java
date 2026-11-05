package com.ppuri.sobunsobun.pod.websocket;

import com.ppuri.sobunsobun.auth.service.AccountSessionService;
import com.ppuri.sobunsobun.global.exception.BuildingAccessDeniedException;
import com.ppuri.sobunsobun.auth.service.BuildingAccessService;
import com.ppuri.sobunsobun.pod.domain.Pod;
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
 * CONNECT 시점에 받은 로그인 토큰(Authorization: Bearer ...)의 사용자 소속을 비교해서, 다른 건물이면 구독을 거부한다.
 * 왜 X-User-Id를 안 믿나: STOMP 헤더는 HTTP 로그인 필터(SessionAuthFilter)를 거치지 않아서,
 * 클라이언트가 보낸 X-User-Id를 그대로 쓰면 남의 id로 다른 건물 채널을 엿들을 수 있다.
 */
@Component
@RequiredArgsConstructor
public class PodSubscriptionInterceptor implements ChannelInterceptor {

    private static final Pattern POD_TOPIC = Pattern.compile("^/topic/pods/(\\d+)$");
    private static final String AUTHORIZATION_HEADER = "Authorization";
    private static final String BEARER_PREFIX = "Bearer ";
    private static final String SESSION_USER_ID_KEY = "userId";

    // PodService를 주입하지 않는 이유: PodService → SimpMessagingTemplate → WebSocket 설정 → 이 인터셉터로
    // 빈 생성이 순환해서 앱이 안 뜬다. 그래서 저장소와 BuildingAccessService만 직접 쓴다.
    private final PodRepository podRepository;
    private final BuildingAccessService buildingAccessService;
    private final AccountSessionService accountSessionService;

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
        String authorization = accessor.getFirstNativeHeader(AUTHORIZATION_HEADER);
        if (accessor.getSessionAttributes() == null || authorization == null
                || !authorization.startsWith(BEARER_PREFIX)) {
            return;
        }
        accountSessionService.resolveAccountId(authorization.substring(BEARER_PREFIX.length()).trim())
                .ifPresent(userId -> accessor.getSessionAttributes().put(SESSION_USER_ID_KEY, userId));
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
            throw new BuildingAccessDeniedException("로그인이 필요해요.");
        }

        Long podId = Long.valueOf(matcher.group(1));
        Pod pod = podRepository.findById(podId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 팟입니다: " + podId));
        buildingAccessService.requireMembership(userId, pod.getBuildingId(), "다른 건물의 팟 채널은 구독할 수 없어요.");
    }
}
