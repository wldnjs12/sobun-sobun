package com.ppuri.sobunsobun.auth.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;

/**
 * Juso API 키가 설정돼 있으면 실제 구현체, 없으면 Stub을 쓴다.
 * address-search.demo-fallback=true면 실제 구현체를 DemoFallbackAddressSearchClient로 감싸
 * Juso 장애 시 Stub 결과로 대신한다 (시연 중 외부 API 장애 대비).
 */
@Slf4j
@Configuration
public class AddressSearchConfig {

    @Bean
    public AddressSearchClient addressSearchClient(
            @Value("${juso.api-key:}") String apiKey,
            @Value("${address-search.demo-fallback:false}") boolean demoFallback) {
        if (StringUtils.hasText(apiKey)) {
            log.info("주소 검색: Juso(행정안전부 도로명주소 API) 사용");
            AddressSearchClient juso = new JusoAddressSearchClient(apiKey);
            if (demoFallback) {
                log.warn("주소 검색: 데모 폴백 켜짐 — Juso 장애 시 Stub 결과를 보여줌 (운영에서는 꺼둘 것)");
                return new DemoFallbackAddressSearchClient(juso, new StubAddressSearchClient());
            }
            return juso;
        }
        log.info("주소 검색: 키가 없어 Stub 사용 (용현동·학익동 가짜 주소 10건)");
        return new StubAddressSearchClient();
    }
}
