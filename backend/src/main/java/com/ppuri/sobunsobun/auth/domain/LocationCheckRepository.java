package com.ppuri.sobunsobun.auth.domain;

import org.springframework.data.jpa.repository.JpaRepository;

/** 쓰기 전용 로그라 조회 메서드는 두지 않는다 (판정 결과를 캐시해서 읽어오는 용도가 아니다). */
public interface LocationCheckRepository extends JpaRepository<LocationCheck, Long> {
}
