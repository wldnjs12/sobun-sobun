package com.ppuri.sobunsobun.auth.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AddressKeywordTest {

    @Test
    void 공백을_정리하고_특수문자와_괄호를_지운다() {
        assertThat(AddressKeyword.sanitize("  인하로   67번길% ")).isEqualTo("인하로 67번길");
        assertThat(AddressKeyword.sanitize("인하로 45 (용현동)")).isEqualTo("인하로 45 용현동");
    }

    @Test
    void SQL_예약어는_지운다() {
        assertThat(AddressKeyword.sanitize("인하로 select 45")).isEqualTo("인하로 45");
    }

    @Test
    void 두_글자_미만이면_400() {
        assertThatThrownBy(() -> AddressKeyword.sanitize(" a "))
                .isInstanceOf(AddressException.class)
                .extracting("code").isEqualTo(AddressException.INVALID_KEYWORD);
        assertThatThrownBy(() -> AddressKeyword.sanitize("%%"))
                .isInstanceOf(AddressException.class);
    }

    @Test
    void 숫자만_있으면_400() {
        assertThatThrownBy(() -> AddressKeyword.sanitize("123"))
                .isInstanceOf(AddressException.class);
    }
}
