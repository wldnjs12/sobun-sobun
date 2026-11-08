package com.ppuri.sobunsobun.pod.websocket;

import com.ppuri.sobunsobun.auth.service.AccountSessionService;
import com.ppuri.sobunsobun.auth.service.BuildingAccessService;
import com.ppuri.sobunsobun.global.exception.BuildingAccessDeniedException;
import com.ppuri.sobunsobun.pod.domain.PodForbiddenException;
import com.ppuri.sobunsobun.pod.repository.PodRepository;
import com.ppuri.sobunsobun.pod.service.PodChatGuard;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;

import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/** 채팅 구독(/topic/pods/{id}/chat)은 그 팟 참여자만 — 같은 건물이라도 남의 팟 채팅을 엿들을 수 없어야 한다. */
@ExtendWith(MockitoExtension.class)
class PodSubscriptionInterceptorTest {

    private static final Long USER = 7L;

    @Mock
    private PodRepository podRepository;
    @Mock
    private BuildingAccessService buildingAccessService;
    @Mock
    private AccountSessionService accountSessionService;
    @Mock
    private PodChatGuard podChatGuard;

    private PodSubscriptionInterceptor interceptor;

    @BeforeEach
    void setUp() {
        interceptor = new PodSubscriptionInterceptor(podRepository, buildingAccessService, accountSessionService, podChatGuard);
    }

    private Message<byte[]> subscribe(String destination, Long sessionUserId) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination(destination);
        Map<String, Object> session = new HashMap<>();
        if (sessionUserId != null) session.put("userId", sessionUserId);
        accessor.setSessionAttributes(session);
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }

    @Test
    void 참여자는_채팅을_구독할_수_있다() {
        Message<byte[]> message = subscribe("/topic/pods/5/chat", USER);

        assertThat(interceptor.preSend(message, null)).isSameAs(message);
        verify(podChatGuard).requireChatMember(5L, USER);
    }

    @Test
    void 참여하지_않은_사람의_채팅_구독은_거부한다() {
        when(podChatGuard.requireChatMember(5L, USER)).thenThrow(new PodForbiddenException("참여한 이웃만"));

        assertThatThrownBy(() -> interceptor.preSend(subscribe("/topic/pods/5/chat", USER), null))
                .isInstanceOf(PodForbiddenException.class);
    }

    @Test
    void 로그인_토큰_없이_채팅을_구독하면_거부한다() {
        assertThatThrownBy(() -> interceptor.preSend(subscribe("/topic/pods/5/chat", null), null))
                .isInstanceOf(BuildingAccessDeniedException.class);
        verify(podChatGuard, never()).requireChatMember(any(), any());
    }

    @Test
    void 금액_갱신_주소_구독에는_채팅_참여자_검사를_하지_않는다() {
        assertThatThrownBy(() -> interceptor.preSend(subscribe("/topic/pods/5", USER), null))
                .isInstanceOf(IllegalArgumentException.class); // 팟이 없어서(저장소 mock이 빈 값) — 기존 건물 검사 경로
        verify(podChatGuard, never()).requireChatMember(any(), any());
    }
}
