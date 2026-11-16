package com.ppuri.sobunsobun.pod.service;

import com.ppuri.sobunsobun.pod.domain.Pod;
import com.ppuri.sobunsobun.pod.domain.PodParticipant;
import com.ppuri.sobunsobun.pod.domain.PodStatus;
import com.ppuri.sobunsobun.pod.dto.PodImpactResponse;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * 임팩트 지표 계산기. DB를 모르는 순수 함수라서 단위 테스트로 숫자를 바로 검증할 수 있다.
 * (PodImpactService가 건물의 팟·참여 기록을 읽어서 여기에 넘긴다)
 */
public final class PodImpactCalculator {

    private PodImpactCalculator() {
    }

    public static PodImpactResponse calculate(List<Pod> pods, Collection<PodParticipant> participants) {
        Map<Long, List<PodParticipant>> byPod = participants.stream()
                .filter(p -> p.getPodId() != null)
                .collect(Collectors.groupingBy(PodParticipant::getPodId));

        int open = 0, closed = 0, cancelled = 0, neighbors = 0;
        long unitsShared = 0, surplus = 0, saved = 0, transacted = 0;
        long fillMinutesSum = 0;
        int fillSamples = 0, neighborSlots = 0, paid = 0, picked = 0;

        for (Pod pod : pods) {
            PodStatus status = pod.getStatus();
            int count = nz(pod.getParticipantCount());
            if (status == PodStatus.CANCELLED) {
                cancelled++;
                continue;
            }
            neighbors += count;
            if (status == PodStatus.OPEN) {
                open++;
            } else {
                closed++;
                if (pod.getUnitsPerPerson() != null) {
                    unitsShared += (long) pod.getUnitsPerPerson() * count;
                    if (pod.getTotalUnits() != null) {
                        surplus += (long) Math.max(0, pod.getTotalUnits() - pod.getUnitsPerPerson()) * count;
                    }
                }
                BigDecimal withFee = pod.getTotalAmount().multiply(BigDecimal.ONE.add(pod.getCommissionRate()));
                transacted += withFee.setScale(0, RoundingMode.CEILING).longValue();
                if (pod.getOriginalPrice() != null) {
                    long perPerson = pod.calculatePerPersonAmount().longValue();
                    saved += Math.max(0, pod.getOriginalPrice().longValue() - perPerson) * count;
                }
                for (PodParticipant p : byPod.getOrDefault(pod.getId(), List.of())) {
                    if (Objects.equals(p.getUserId(), pod.getHostUserId())) continue;
                    neighborSlots++;
                    if (p.getPaidAt() != null) paid++;
                    if (p.getPickedUpAt() != null) picked++;
                }
            }

            List<LocalDateTime> joins = byPod.getOrDefault(pod.getId(), List.of()).stream()
                    .map(PodParticipant::getJoinedAt)
                    .filter(Objects::nonNull)
                    .sorted(Comparator.naturalOrder())
                    .toList();
            if (joins.size() >= 2) {
                fillMinutesSum += Duration.between(joins.get(0), joins.get(joins.size() - 1)).toMinutes();
                fillSamples++;
            }
        }

        int decided = closed + cancelled;
        return new PodImpactResponse(
                pods.size(), open, closed, cancelled,
                ratio(closed, decided),
                neighbors, unitsShared, surplus, saved, transacted,
                fillSamples == 0 ? null : (double) fillMinutesSum / fillSamples,
                ratio(paid, neighborSlots),
                ratio(picked, neighborSlots));
    }

    private static Double ratio(int part, int whole) {
        return whole == 0 ? null : (double) part / whole;
    }

    private static int nz(Integer value) {
        return value == null ? 0 : value;
    }
}
