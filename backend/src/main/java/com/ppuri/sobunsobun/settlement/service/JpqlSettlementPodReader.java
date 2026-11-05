package com.ppuri.sobunsobun.settlement.service;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

/**
 * Pod 엔티티를 읽기 전용 JPQL로 조회한다.
 * 기능별 패키지 경계를 지키려고 pod 패키지 코드를 import하거나 고치지 않고,
 * 엔티티 이름과 필드 이름으로만 참조한다. Pod의 필드 이름이 바뀌면 컴파일이 아니라 실행 중에 깨지니 주의.
 */
@Component
@RequiredArgsConstructor
public class JpqlSettlementPodReader implements SettlementPodReader {

    private final EntityManager entityManager;

    @Override
    public Optional<PodSummary> findPod(Long podId) {
        List<Object[]> rows = entityManager
                .createQuery("select p.buildingId, p.hostUserId, p.participantCount, p.closed from Pod p where p.id = :podId",
                        Object[].class)
                .setParameter("podId", podId)
                .getResultList();
        return rows.stream().findFirst().map(row -> toSummary(podId, row));
    }

    @Override
    public boolean isParticipant(Long podId, Long userId) {
        if (podId == null || userId == null) return false;
        Long count = entityManager
                .createQuery("select count(pp) from PodParticipant pp where pp.podId = :podId and pp.userId = :userId",
                        Long.class)
                .setParameter("podId", podId)
                .setParameter("userId", userId)
                .getSingleResult();
        return count != null && count > 0;
    }

    /** 컬럼이 비어 있는(null) 옛 데이터도 있을 수 있어서, 참여자 수는 0, 마감 여부는 false로 본다. */
    static PodSummary toSummary(Long podId, Object[] row) {
        Integer participantCount = (Integer) row[2];
        Boolean closed = (Boolean) row[3];
        return new PodSummary(podId, (Long) row[0], (Long) row[1],
                participantCount == null ? 0 : participantCount,
                Boolean.TRUE.equals(closed));
    }
}
