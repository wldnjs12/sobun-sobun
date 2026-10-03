package com.ppuri.sobunsobun.global.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * 프론트(Vercel)와 백엔드(Railway)가 서로 다른 도메인에 떠서 브라우저가 /api 요청을 막지 않도록 허용한다.
 * 허용 Origin은 app.cors.allowed-origins(= ALLOWED_ORIGINS 환경변수, 쉼표 구분)로만 설정한다 — CORS를 "*"로 열지 않는다.
 */
@Configuration
public class CorsConfig implements WebMvcConfigurer {

    private final String[] allowedOrigins;

    public CorsConfig(@Value("${app.cors.allowed-origins}") String allowedOrigins) {
        this.allowedOrigins = allowedOrigins.split("\\s*,\\s*");
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(allowedOrigins)
                .allowedMethods("GET", "POST", "DELETE", "PUT", "PATCH")
                .allowedHeaders("*");
    }
}
