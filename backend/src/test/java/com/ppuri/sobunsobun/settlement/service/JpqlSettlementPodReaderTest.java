package com.ppuri.sobunsobun.settlement.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** JPQL 조회 결과(Object[]) → PodSummary 변환 단위 테스트 (DB 없이) */
class JpqlSettlementPodReaderTest {

    @Test
    void 조회_결과를_PodSummary로_옮긴다() {
        PodSummary pod = JpqlSettlementPodReader.toSummary(1L, new Object[]{10L, 7L, 3, true});

        assertThat(pod).isEqualTo(new PodSummary(1L, 10L, 7L, 3, true));
    }

    @Test
    void 참여자_수와_마감_여부가_비어_있으면_0명_미마감으로_본다() {
        PodSummary pod = JpqlSettlementPodReader.toSummary(1L, new Object[]{10L, 7L, null, null});

        assertThat(pod.participantCount()).isZero();
        assertThat(pod.closed()).isFalse();
    }
}
