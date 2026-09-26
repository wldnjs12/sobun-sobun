package com.ppuri.sobunsobun.global.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * 핵심 기능 ②(팟 개설·참여·실시간 정산 갱신)의 실시간 통신 설정.
 * 클라이언트는 /ws-sobun 으로 STOMP 연결 후,
 * /topic/pods/{podId} 를 구독하면 해당 팟의 금액 갱신을 실시간으로 받는다.
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws-sobun")
                .setAllowedOriginPatterns("*") // 배포 전 프론트 도메인으로 제한할 것
                .withSockJS();
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic");   // 서버 -> 클라이언트 브로드캐스트
        registry.setApplicationDestinationPrefixes("/app"); // 클라이언트 -> 서버 발행
    }
}
