package com.ppuri.sobunsobun.auth.service;

import com.ppuri.sobunsobun.auth.dto.AddressCandidate;
import com.ppuri.sobunsobun.auth.dto.AddressSearchPage;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class StubAddressSearchClientTest {

    private final StubAddressSearchClient stub = new StubAddressSearchClient();

    @Test
    void 검색어의_모든_단어가_들어간_주소만_돌려준다() {
        AddressSearchPage page = stub.search("학익 아파트", 1);

        assertThat(page.items()).extracting(AddressCandidate::buildingName).containsExactly("학익 한마음아파트");
        assertThat(page.items().get(0).dongOptions()).isNotEmpty();
    }

    @Test
    void 지번으로도_찾고_건물명이_없으면_도로명_건물번호가_표시명이다() {
        AddressSearchPage page = stub.search("용현동 600", 1);

        assertThat(page.items()).hasSize(1);
        assertThat(page.items().get(0).buildingName()).isEmpty();
        assertThat(page.items().get(0).displayName()).isEqualTo("인하로67번길 3");
    }

    @Test
    void 페이지를_나눠서_돌려준다() {
        AddressSearchPage first = stub.search("미추홀구", 1);
        AddressSearchPage second = stub.search("미추홀구", 2);

        assertThat(first.totalCount()).isEqualTo(10);
        assertThat(first.items()).hasSize(StubAddressSearchClient.DEFAULT_PAGE_SIZE);
        assertThat(first.hasMore()).isTrue();
        assertThat(second.items()).hasSize(5);
        assertThat(second.hasMore()).isFalse();
        assertThat(second.items()).doesNotContainAnyElementsOf(first.items());
    }

    @Test
    void 맞는_주소가_없으면_빈_페이지() {
        AddressSearchPage page = stub.search("부산 해운대", 1);

        assertThat(page.items()).isEmpty();
        assertThat(page.totalCount()).isZero();
        assertThat(page.hasMore()).isFalse();
    }
}
