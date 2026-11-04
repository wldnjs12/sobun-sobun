package com.ppuri.sobunsobun.auth.service;

import com.ppuri.sobunsobun.auth.dto.AddressSearchPage;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DemoFallbackAddressSearchClientTest {

    private final StubAddressSearchClient stub = new StubAddressSearchClient();

    @Test
    void Juso_장애면_Stub_결과로_대신한다() {
        AddressSearchClient failing = (keyword, page) -> { throw AddressException.unavailable(); };
        AddressSearchClient client = new DemoFallbackAddressSearchClient(failing, stub);

        AddressSearchPage page = client.search("학익 아파트", 1);

        assertThat(page.items()).isNotEmpty();
    }

    @Test
    void 키_오류도_Stub으로_대신한다() {
        AddressSearchClient failing = (keyword, page) -> { throw AddressException.apiError(); };

        assertThat(new DemoFallbackAddressSearchClient(failing, stub).search("미추홀구", 1).totalCount()).isEqualTo(10);
    }

    @Test
    void 검색어_오류는_그대로_던진다() {
        AddressSearchClient failing = (keyword, page) -> { throw AddressException.invalidKeyword("검색어를 조금 더 자세히 입력해주세요"); };
        AddressSearchClient client = new DemoFallbackAddressSearchClient(failing, stub);

        assertThatThrownBy(() -> client.search("인천", 1))
                .isInstanceOf(AddressException.class)
                .extracting("code").isEqualTo(AddressException.INVALID_KEYWORD);
    }
}
