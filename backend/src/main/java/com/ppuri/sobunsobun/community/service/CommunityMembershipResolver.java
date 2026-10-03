package com.ppuri.sobunsobun.community.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * "이 사용자가 어느 건물 주민인지"를 알려준다. 커뮤니티의 건물 격리(다른 건물 403)는 전부 이 값으로 판단한다.
 *
 * TODO(김민준): 임시 구현. 최지원의 ①(User 엔티티, BuildingAccessService)이 develop에 머지되면
 *  buildingIdOf()를 그쪽 조회로 바꾼다 — 커뮤니티에서 바꿀 곳은 이 클래스 하나뿐이다.
 *  지금은 모든 사용자를 같은 데모 건물(community.temp-building-id, 기본 1) 주민으로 본다.
 */
@Slf4j
@Component
public class CommunityMembershipResolver {

    private final Long tempBuildingId;

    public CommunityMembershipResolver(@Value("${community.temp-building-id:1}") Long tempBuildingId) {
        this.tempBuildingId = tempBuildingId;
        log.warn("커뮤니티: 건물 소속 확인이 임시 구현입니다 — 모든 사용자를 건물 {}의 주민으로 봅니다.", tempBuildingId);
    }

    public Long buildingIdOf(Long userId) {
        return tempBuildingId;
    }
}
