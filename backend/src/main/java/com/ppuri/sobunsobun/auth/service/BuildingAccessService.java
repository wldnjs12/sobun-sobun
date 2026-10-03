package com.ppuri.sobunsobun.auth.service;

import com.ppuri.sobunsobun.auth.domain.UserRepository;
import com.ppuri.sobunsobun.global.exception.BuildingAccessDeniedException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * "이 userId가 이 buildingId 소속인가?" 공용 가드. 지금은 pod/**가 쓰고, 이후 settlement/**·community/**도
 * 그대로 가져다 쓴다 (User.buildingId 하나만 보므로 호출하는 쪽의 기능별 분기를 알 필요가 없다).
 */
@Service
@RequiredArgsConstructor
public class BuildingAccessService {

    private static final String DEFAULT_MESSAGE = "다른 건물의 팟에는 접근할 수 없어요.";

    private final UserRepository userRepository;

    /** 소속이 아니면 BuildingAccessDeniedException(403)을 던진다. 기본 안내 문구를 쓴다. */
    public void requireMembership(Long userId, Long buildingId) {
        requireMembership(userId, buildingId, DEFAULT_MESSAGE);
    }

    /** 기능별로 다른 안내 문구가 필요할 때(예: 커뮤니티) 쓴다. */
    public void requireMembership(Long userId, Long buildingId, String message) {
        if (!isMember(userId, buildingId)) {
            throw new BuildingAccessDeniedException(message);
        }
    }

    @Transactional(readOnly = true)
    public boolean isMember(Long userId, Long buildingId) {
        return userRepository.findById(userId)
                .map(user -> user.getBuildingId().equals(buildingId))
                .orElse(false);
    }
}
