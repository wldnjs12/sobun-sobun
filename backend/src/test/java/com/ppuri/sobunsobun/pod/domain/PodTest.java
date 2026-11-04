package com.ppuri.sobunsobun.pod.domain;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;

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
                .totalUnits(30)
                .unitLabel("롤")
                .unitsPerPerson(10)
                .build();
    }

    private Pod.PodUpdate titleOnly(String title) {
        return new Pod.PodUpdate(title, null, null, null, null, null, null, null, null, null, null);
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

        assertThatThrownBy(() -> pod.close(999L)).isInstanceOf(PodForbiddenException.class);
    }

    @Test
    void 참여자가_없으면_마감할_수_없다() {
        Pod pod = newPod(1);

        assertThatThrownBy(() -> pod.close(100L)).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void 대표는_참여자가_있으면_마감할_수_있고_status도_CLOSED가_된다() {
        Pod pod = newPod(1);
        pod.join();

        pod.close(100L);

        assertThat(pod.getClosed()).isTrue();
        assertThat(pod.getStatus()).isEqualTo(PodStatus.CLOSED);
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

    @Test
    void 새_팟은_OPEN이고_카테고리를_안_주면_ETC다() {
        Pod pod = newPod(3);

        assertThat(pod.getStatus()).isEqualTo(PodStatus.OPEN);
        assertThat(pod.getCategory()).isEqualTo(PodCategory.ETC);
    }

    // ── 미개봉 단위 나눔 검증 ──

    @Test
    void 일인당_개수_곱하기_목표인원이_총_개수_이하면_통과한다() {
        Pod.validateUnits(30, 10, 3, "롤"); // 10 × 3 = 30 ≤ 30
    }

    @Test
    void 일인당_개수_곱하기_목표인원이_총_개수보다_많으면_거절된다() {
        assertThatThrownBy(() -> Pod.validateUnits(30, 10, 4, "롤"))
                .isInstanceOf(PodRuleViolationException.class)
                .hasMessageContaining("40롤");
    }

    // ── 마감 시간 ──

    @Test
    void 마감_시간이_지나면_이웃이_참여할_수_없다() {
        Pod pod = Pod.builder().hostUserId(100L).totalAmount(BigDecimal.TEN).commissionRate(BigDecimal.ZERO)
                .targetParticipantCount(3).deadline(LocalDateTime.now().minusMinutes(1)).build();

        assertThatThrownBy(() -> pod.join(LocalDateTime.now()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("마감 시간");
    }

    // ── 모집 취소 ──

    @Test
    void 대표는_모집을_취소할_수_있고_이후_참여와_참여취소가_거절된다() {
        Pod pod = newPod(3);
        pod.join();
        pod.join();

        pod.cancel(100L);

        assertThat(pod.getStatus()).isEqualTo(PodStatus.CANCELLED);
        assertThat(pod.getClosed()).isFalse(); // 정산이 시작되지 않게 closed는 false 유지
        assertThatThrownBy(pod::join).hasMessageContaining("취소된");
        assertThatThrownBy(pod::cancelJoin).hasMessageContaining("취소된");
        assertThatThrownBy(() -> pod.close(100L)).hasMessageContaining("취소된");
    }

    @Test
    void 대표가_아니면_모집을_취소할_수_없다() {
        Pod pod = newPod(3);

        assertThatThrownBy(() -> pod.cancel(999L)).isInstanceOf(PodForbiddenException.class);
    }

    @Test
    void 마감된_팟은_모집_취소할_수_없다() {
        Pod pod = newPod(3);
        pod.join();
        pod.close(100L);

        assertThatThrownBy(() -> pod.cancel(100L)).isInstanceOf(IllegalStateException.class);
    }

    // ── 글 수정 ──

    @Test
    void 대표는_다른_참여자가_없으면_글을_수정할_수_있다() {
        Pod pod = newPod(3);
        pod.join(); // 대표 본인

        pod.update(100L, false, titleOnly("바뀐 제목"));

        assertThat(pod.getTitle()).isEqualTo("바뀐 제목");
        assertThat(pod.getTotalUnits()).isEqualTo(30); // 안 보낸 값은 그대로
    }

    @Test
    void 다른_참여자가_있으면_수정할_수_없다() {
        Pod pod = newPod(3);

        assertThatThrownBy(() -> pod.update(100L, true, titleOnly("x")))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("참여한 이웃");
    }

    @Test
    void 대표가_아니면_수정할_수_없다() {
        Pod pod = newPod(3);

        assertThatThrownBy(() -> pod.update(999L, false, titleOnly("x"))).isInstanceOf(PodForbiddenException.class);
    }

    @Test
    void 수정_후_개수_조건이_깨지면_거절되고_값이_바뀌지_않는다() {
        Pod pod = newPod(3);
        Pod.PodUpdate tooMany = new Pod.PodUpdate("새 제목", null, null, null, null, null, null, 4, null, null, null);

        assertThatThrownBy(() -> pod.update(100L, false, tooMany)).isInstanceOf(PodRuleViolationException.class);
        assertThat(pod.getTitle()).isEqualTo("테스트 팟");
        assertThat(pod.getTargetParticipantCount()).isEqualTo(3);
    }

    @Test
    void 취소된_팟은_수정할_수_없다() {
        Pod pod = newPod(3);
        pod.cancel(100L);

        assertThatThrownBy(() -> pod.update(100L, false, titleOnly("x"))).isInstanceOf(IllegalStateException.class);
    }
}
