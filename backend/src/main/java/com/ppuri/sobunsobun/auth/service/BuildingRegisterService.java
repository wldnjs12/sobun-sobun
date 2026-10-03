package com.ppuri.sobunsobun.auth.service;

import com.ppuri.sobunsobun.auth.domain.Building;
import com.ppuri.sobunsobun.auth.domain.BuildingRepository;
import com.ppuri.sobunsobun.auth.domain.User;
import com.ppuri.sobunsobun.auth.domain.UserRepository;
import com.ppuri.sobunsobun.auth.dto.BuildingRegisterRequest;
import com.ppuri.sobunsobun.auth.dto.BuildingRegisterResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 건물 확정 등록 (find-or-create) + 사용자 소속 저장.
 * 이미 같은 buildingKey로 등록된 건물이 있으면 지오코딩을 다시 하지 않고 그 건물을 그대로 쓴다.
 */
@Service
@RequiredArgsConstructor
public class BuildingRegisterService {

    private final BuildingRepository buildingRepository;
    private final UserRepository userRepository;
    private final GeocodingClient geocodingClient;

    @Transactional
    public BuildingRegisterResponse register(Long userId, BuildingRegisterRequest request) {
        String buildingKey = Building.buildKey(request.bdMgtSn(), request.dong());
        Building building = buildingRepository.findByBuildingKey(buildingKey)
                .orElseGet(() -> createBuilding(request, buildingKey));

        upsertUser(userId, building.getId());

        return BuildingRegisterResponse.from(building);
    }

    private Building createBuilding(BuildingRegisterRequest request, String buildingKey) {
        Coordinates coordinates = geocodingClient.geocode(request.roadAddress());
        Building building = new Building(
                request.buildingName(),
                request.roadAddress(),
                request.bdMgtSn(),
                request.dong(),
                buildingKey,
                coordinates.latitude(),
                coordinates.longitude());
        return buildingRepository.save(building);
    }

    /** 이미 등록된 사용자가 다른 건물을 다시 등록하면(이사 등) 소속만 갱신한다. */
    private void upsertUser(Long userId, Long buildingId) {
        userRepository.findById(userId)
                .ifPresentOrElse(
                        user -> user.changeBuilding(buildingId),
                        () -> userRepository.save(new User(userId, buildingId)));
    }
}
