package com.ppuri.sobunsobun.global.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ppuri.sobunsobun.auth.service.AccountSessionService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;

import java.util.Arrays;

/**
 * SessionAuthFilter를 /api/** 에만 건다. WebSocket 핸드셰이크(/ws-sobun)는 대상이 아니다 (기존 동작 유지).
 * CORS 허용 Origin은 CorsConfig와 같은 값(app.cors.allowed-origins)을 401 응답에도 쓴다.
 */
@Configuration
public class SessionAuthFilterConfig {

    @Bean
    public FilterRegistrationBean<SessionAuthFilter> sessionAuthFilter(
            AccountSessionService sessionService,
            ObjectMapper objectMapper,
            @Value("${app.cors.allowed-origins}") String allowedOrigins) {
        SessionAuthFilter filter = new SessionAuthFilter(
                sessionService, objectMapper, Arrays.asList(allowedOrigins.split("\\s*,\\s*")));
        FilterRegistrationBean<SessionAuthFilter> registration = new FilterRegistrationBean<>(filter);
        registration.addUrlPatterns("/api/*"); // 서블릿 URL 패턴은 /api/* 가 /api 아래 전체를 뜻한다
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE + 10);
        return registration;
    }
}
