package com.ppuri.sobunsobun.auth.service;

import com.ppuri.sobunsobun.auth.dto.AddressSearchPage;
import lombok.extern.slf4j.Slf4j;

/**
 * 시연용 안전장치(데코레이터): 실제 Juso가 죽거나(타임아웃) 키 오류가 나면 실패 대신 Stub 결과를 돌려준다.
 * address-search.demo-fallback=true(ADDRESS_DEMO_FALLBACK)일 때만 AddressSearchConfig가 감싼다. 기본 꺼짐.
 * 검색어 문제(INVALID_KEYWORD)는 사용자가 고쳐야 하는 오류라 그대로 던진다.
 */
@Slf4j
public class DemoFallbackAddressSearchClient implements AddressSearchClient {

    private final AddressSearchClient primary;
    private final AddressSearchClient fallback;

    public DemoFallbackAddressSearchClient(AddressSearchClient primary, AddressSearchClient fallback) {
        this.primary = primary;
        this.fallback = fallback;
    }

    @Override
    public AddressSearchPage search(String keyword, int page) {
        try {
            return primary.search(keyword, page);
        } catch (AddressException e) {
            if (AddressException.INVALID_KEYWORD.equals(e.getCode())) throw e;
            log.warn("주소 검색 실패({}) → 데모 폴백으로 Stub 결과 사용", e.getCode());
            return fallback.search(keyword, page);
        }
    }
}
