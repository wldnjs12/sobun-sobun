package com.ppuri.sobunsobun.auth.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;

/** 카카오 로컬 API 키가 설정돼 있으면 실제 구현체, 없으면 Stub을 쓴다. */
@Slf4j
@Configuration
public class GeocodingConfig {

    @Bean
    public GeocodingClient geocodingClient(@Value("${kakao.rest-api-key:}") String apiKey) {
        if (StringUtils.hasText(apiKey)) {
            log.info("지오코딩: 카카오 로컬 API 사용");
            return new KakaoGeocodingClient(apiKey);
        }
        log.info("지오코딩: 키가 없어 Stub 사용 (인하대학교 근처 고정 좌표)");
        return new StubGeocodingClient();
    }
}
