package com.ppuri.sobunsobun.settlement.service;

import java.util.Optional;

/** 정산에 필요한 팟 정보 조회. 정산 로직이 pod 패키지 구현에 직접 묶이지 않도록 인터페이스로 둔다. */
public interface SettlementPodReader {

    /** @return 팟이 없으면 empty */
    Optional<PodSummary> findPod(Long podId);
}
