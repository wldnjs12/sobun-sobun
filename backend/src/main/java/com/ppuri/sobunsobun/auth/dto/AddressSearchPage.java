package com.ppuri.sobunsobun.auth.dto;

import java.util.List;

/**
 * 주소 검색 결과 한 페이지.
 * 왜 배열 대신 객체인가: "인하로"처럼 넓게 검색하면 수백 건이 나오는데, 예전엔 1페이지 20건만 돌려줘서
 * 뒤쪽 건물은 영영 찾을 수 없었다. totalCount/hasMore가 있어야 프론트가 "더 보기"를 그릴 수 있다.
 */
public record AddressSearchPage(
        List<AddressCandidate> items,
        int totalCount,
        int page,
        boolean hasMore
) {

    public static AddressSearchPage of(List<AddressCandidate> items, int totalCount, int page, int pageSize) {
        return new AddressSearchPage(items, totalCount, page, (long) page * pageSize < totalCount);
    }
}
