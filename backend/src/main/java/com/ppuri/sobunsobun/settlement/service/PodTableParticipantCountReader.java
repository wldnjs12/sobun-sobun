package com.ppuri.sobunsobun.settlement.service;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

/**
 * 임시 구현: Pod 엔티티의 participantCount를 읽기 전용 JPQL로 조회한다.
 * pod 패키지 코드는 import하지 않고 엔티티 이름으로만 참조해서, 팟 담당 코드에 손대지 않는다.
 *
 * TODO: 팟 담당(최지원)이 PodParticipant/PodRepository를 만들면 그쪽 조회로 교체.
 */
@Component
@RequiredArgsConstructor
public class PodTableParticipantCountReader implements PodParticipantCountReader {

    private final EntityManager entityManager;

    @Override
    public Optional<Integer> findParticipantCount(Long podId) {
        List<Integer> result = entityManager
                .createQuery("select p.participantCount from Pod p where p.id = :podId", Integer.class)
                .setParameter("podId", podId)
                .getResultList();
        if (result.isEmpty()) {
            return Optional.empty();
        }
        Integer count = result.get(0);
        return Optional.of(count == null ? 0 : count);
    }
}
