package com.ppuri.sobunsobun.pod.domain;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PodTest {

    private Pod newPod(int targetParticipantCount) {
        return Pod.builder()
                .buildingId(1L)
                .hostUserId(100L)
                .title("테스트 팟")
                .totalAmount(new BigDecimal("10000"))
                .targetParticipantCount(targetParticipantCount)
                .commissionRate(new BigDecimal("0.05"))
                .build();
    }

    @Test
    void 참여자가_늘어나면_1인당_금액이_올림_계산된다() {
        Pod pod = newPod(3);

        pod.join();
        pod.join();
        pod.join();

        // 10000 * 1.05 / 3 = 3500.00 -> 올림 3500
        assertThat(pod.calculatePerPersonAmount()).isEqualByComparingTo("3500");
    }

    @Test
    void 목표_인원을_초과해서_참여할_수_없다() {
        Pod pod = newPod(1);
        pod.join();

        assertThatThrownBy(pod::join).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void 참여_취소하면_인원이_줄어든다() {
        Pod pod = newPod(3);
        pod.join();
        pod.join();

        pod.cancelJoin();

        assertThat(pod.getParticipantCount()).isEqualTo(1);
    }

    @Test
    void 참여자가_없으면_취소할_수_없다() {
        Pod pod = newPod(3);

        assertThatThrownBy(pod::cancelJoin).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void 대표가_아니면_마감할_수_없다() {
        Pod pod = newPod(1);
        pod.join();

        assertThatThrownBy(() -> pod.close(999L)).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void 참여자가_없으면_마감할_수_없다() {
        Pod pod = newPod(1);

        assertThatThrownBy(() -> pod.close(100L)).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void 대표는_참여자가_있으면_마감할_수_있다() {
        Pod pod = newPod(1);
        pod.join();

        pod.close(100L);

        assertThat(pod.getClosed()).isTrue();
    }

    @Test
    void 마감된_팟에는_참여할_수_없다() {
        Pod pod = newPod(1);
        pod.join();
        pod.close(100L);

        assertThatThrownBy(pod::join).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void 생성시_4자리_pickupPin이_자동_발급된다() {
        Pod pod = newPod(3);

        assertThat(pod.getPickupPin()).matches("\\d{4}");
    }
}
