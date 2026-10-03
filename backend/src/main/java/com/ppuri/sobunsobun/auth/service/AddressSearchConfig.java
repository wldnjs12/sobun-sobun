package com.ppuri.sobunsobun.auth.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;

/** Juso API 키가 설정돼 있으면 실제 구현체, 없으면 Stub을 쓴다. */
@Slf4j
@Configuration
public class AddressSearchConfig {

    @Bean
    public AddressSearchClient addressSearchClient(@Value("${juso.api-key:}") String apiKey) {
        if (StringUtils.hasText(apiKey)) {
            log.info("주소 검색: Juso(행정안전부 도로명주소 API) 사용");
            return new JusoAddressSearchClient(apiKey);
        }
        log.info("주소 검색: 키가 없어 Stub 사용 (고정 데모 후보 2건)");
        return new StubAddressSearchClient();
    }
}
