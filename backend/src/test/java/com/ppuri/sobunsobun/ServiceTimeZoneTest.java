package com.ppuri.sobunsobun;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.time.ZoneId;
import java.util.TimeZone;

import static org.assertj.core.api.Assertions.assertThat;

class ServiceTimeZoneTest {

    private final TimeZone original = TimeZone.getDefault();

    @AfterEach
    void restore() {
        TimeZone.setDefault(original); // 다른 테스트에 영향 주지 않도록 원래대로
    }

    @Test
    void 서버_기본_시간대를_한국으로_고정한다() {
        TimeZone.setDefault(TimeZone.getTimeZone("UTC")); // 배포 컨테이너 기본값 흉내

        SobunsobunApplication.applyServiceTimeZone();

        assertThat(ZoneId.systemDefault()).isEqualTo(ZoneId.of("Asia/Seoul"));
    }
}
