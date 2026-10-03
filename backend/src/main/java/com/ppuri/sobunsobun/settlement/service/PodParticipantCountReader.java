package com.ppuri.sobunsobun.settlement.service;

import java.util.Optional;

/**
 * 정산에 쓸 팟의 확정 참여자 수 조회.
 * 팟(②) 도메인이 아직 작업 중이라 인터페이스로 분리해 두고, PodParticipant가 생기면 구현체만 바꾼다.
 */
public interface PodParticipantCountReader {

    /** @return 팟이 없으면 empty, 있으면 참여자 수 (값이 비어 있으면 0) */
    Optional<Integer> findParticipantCount(Long podId);
}
