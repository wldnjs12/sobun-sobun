package com.ppuri.sobunsobun.pod.service;

import com.ppuri.sobunsobun.pod.domain.Pod;
import com.ppuri.sobunsobun.pod.domain.PodParticipant;
import com.ppuri.sobunsobun.pod.dto.PodImpactResponse;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class PodImpactCalculatorTest {

    private static final long HOST = 100L;

    private Pod pod(long id, int target, String originalPrice) {
        Pod pod = Pod.builder()
                .buildingId(1L).hostUserId(HOST).title("화장지 30롤")
                .totalAmount(new BigDecimal("30000")).targetParticipantCount(target)
                .commissionRate(new BigDecimal("0.05"))
                .totalUnits(30).unitLabel("롤").unitsPerPerson(10)
                .originalPrice(originalPrice == null ? null : new BigDecimal(originalPrice))
                .build();
        ReflectionTestUtils.setField(pod, "id", id);
        return pod;
    }

    private PodParticipant joined(long podId, long userId, LocalDateTime at) {
        PodParticipant p = new PodParticipant(podId, userId);
        ReflectionTestUtils.setField(p, "joinedAt", at);
        return p;
    }

    @Test
    void 빈_건물은_모든_비율이_null이다() {
        PodImpactResponse r = PodImpactCalculator.calculate(List.of(), List.of());

        assertThat(r.totalPods()).isZero();
        assertThat(r.successRate()).isNull();
        assertThat(r.avgFillMinutes()).isNull();
        assertThat(r.paymentRate()).isNull();
    }

    @Test
    void 성사_취소_모집중을_나눠_세고_성사율을_계산한다() {
        Pod closed = pod(1, 3, "15000");
        closed.join(); closed.join(); closed.join();
        closed.close(HOST);

        Pod cancelled = pod(2, 3, null);
        cancelled.join();
        cancelled.cancel(HOST);

        Pod open = pod(3, 3, null);
        open.join(); open.join();

        LocalDateTime t0 = LocalDateTime.of(2026, 11, 20, 10, 0);
        List<PodParticipant> parts = new ArrayList<>(List.of(
                joined(1, HOST, t0), joined(1, 1L, t0.plusMinutes(20)), joined(1, 2L, t0.plusMinutes(40)),
                joined(3, HOST, t0), joined(3, 3L, t0.plusMinutes(10))));
        parts.get(1).markPaid();
        parts.get(1).markPickedUp();
        parts.get(2).markPaid();

        PodImpactResponse r = PodImpactCalculator.calculate(List.of(closed, cancelled, open), parts);

        assertThat(r.totalPods()).isEqualTo(3);
        assertThat(r.closedPods()).isEqualTo(1);
        assertThat(r.cancelledPods()).isEqualTo(1);
        assertThat(r.openPods()).isEqualTo(1);
        assertThat(r.successRate()).isEqualTo(0.5);            // 마감 1 / (마감 1 + 취소 1)
        assertThat(r.neighborsJoined()).isEqualTo(5);           // 취소된 팟 인원은 빼고 3 + 2
        assertThat(r.unitsShared()).isEqualTo(30);              // 10롤 × 3명
        assertThat(r.surplusUnitsAvoided()).isEqualTo(60);      // (30 − 10) × 3명
        // 1인 금액 = 30000 × 1.05 / 3 = 10500 → (15000 − 10500) × 3 = 13500
        assertThat(r.moneySaved()).isEqualTo(13_500);
        assertThat(r.transactedAmount()).isEqualTo(31_500);
        assertThat(r.avgFillMinutes()).isEqualTo(25.0);         // (40 + 10) / 2
        assertThat(r.paymentRate()).isEqualTo(1.0);             // 대표 제외 이웃 2명 모두 송금
        assertThat(r.pickupRate()).isEqualTo(0.5);
    }

    @Test
    void 혼자_살_때_가격이_더_싸면_절약액은_0으로_막는다() {
        Pod cheap = pod(1, 2, "100");
        cheap.join(); cheap.join();
        cheap.close(HOST);

        PodImpactResponse r = PodImpactCalculator.calculate(List.of(cheap), List.of());

        assertThat(r.moneySaved()).isZero();
        assertThat(r.paymentRate()).isNull();
    }
}
