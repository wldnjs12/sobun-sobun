package com.ppuri.sobunsobun.auth.service;

import com.ppuri.sobunsobun.auth.domain.Building;
import com.ppuri.sobunsobun.auth.domain.BuildingRepository;
import com.ppuri.sobunsobun.auth.domain.User;
import com.ppuri.sobunsobun.auth.domain.UserRepository;
import com.ppuri.sobunsobun.auth.dto.BuildingRegisterRequest;
import com.ppuri.sobunsobun.auth.dto.BuildingRegisterResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.LinkedHashSet;
import java.util.Set;

/**
 * 건물 확정 등록 (find-or-create) + 사용자 소속 저장.
 * 이미 같은 buildingKey로 등록된 건물이 있으면 지오코딩을 다시 하지 않고 그 건물을 그대로 쓴다.
 *
 * 지오코딩(주소→좌표) 실패 정책: 좌표 없이 건물을 만들지 않고 503(GEOCODING_FAILED)으로 거절한다.
 * 왜: 동네(반경 1km) 판정과 GPS 2차 확인이 모두 건물 좌표를 기준으로 하는데, 좌표가 null인 건물이 생기면
 * 그 사용자는 아무 팟도 못 보고 위치 확인도 영원히 실패한다. 조용히 망가지는 것보다 "다시 시도"가 낫다.
 * 대신 도로명주소(괄호 포함/제외) → 지번 주소 순서로 여러 번 시도해서 실패 확률을 줄인다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class BuildingRegisterService {

    private final BuildingRepository buildingRepository;
    private final UserRepository userRepository;
    private final GeocodingClient geocodingClient;

    @Transactional
    public BuildingRegisterResponse register(Long userId, BuildingRegisterRequest request) {
        String dong = trimToNull(request.dong());
        String detailAddress = trimToNull(request.detailAddress());
        String buildingKey = Building.buildKey(request.bdMgtSn(), dong);
        Building building = buildingRepository.findByBuildingKey(buildingKey)
                .orElseGet(() -> createBuilding(request, dong, buildingKey));

        upsertUser(userId, building.getId(), detailAddress);

        return BuildingRegisterResponse.of(building, detailAddress);
    }

    private Building createBuilding(BuildingRegisterRequest request, String dong, String buildingKey) {
        Coordinates coordinates = geocode(request);
        Building building = new Building(
                resolveName(request),
                request.roadAddress().trim(),
                request.bdMgtSn(),
                dong,
                buildingKey,
                coordinates.latitude(),
                coordinates.longitude());
        return buildingRepository.save(building);
    }

    /** 건물명 → 화면 표시명 → 도로명+건물번호 순서로 처음 값이 있는 것을 쓴다 (주택·빌라는 건물명이 없다). */
    static String resolveName(BuildingRegisterRequest request) {
        if (StringUtils.hasText(request.buildingName())) return request.buildingName().trim();
        if (StringUtils.hasText(request.displayName())) return request.displayName().trim();
        return AddressNames.roadNumberName(request.roadAddress());
    }

    private Coordinates geocode(BuildingRegisterRequest request) {
        Set<String> queries = new LinkedHashSet<>();
        queries.add(AddressNames.stripParenthesis(request.roadAddress()));
        queries.add(request.roadAddress().trim());
        if (StringUtils.hasText(request.jibunAddress())) queries.add(request.jibunAddress().trim());

        for (String query : queries) {
            try {
                Coordinates coordinates = geocodingClient.geocode(query);
                if (coordinates != null) return coordinates;
            } catch (RuntimeException e) {
                // 카카오 응답 없음·타임아웃 등. 다음 주소 형식으로 다시 시도한다. (키가 섞일 수 있는 메시지는 남기지 않음)
                log.warn("지오코딩 실패, 다음 형식으로 재시도: {}", e.getClass().getSimpleName());
            }
        }
        throw new AddressException(AddressException.GEOCODING_FAILED, HttpStatus.SERVICE_UNAVAILABLE,
                "건물 위치를 확인하지 못했어요. 잠시 후 다시 시도해주세요.");
    }

    /** 이미 등록된 사용자가 다른 건물을 다시 등록하면(이사 등) 소속과 상세주소를 갱신한다. */
    private void upsertUser(Long userId, Long buildingId, String detailAddress) {
        userRepository.findById(userId)
                .ifPresentOrElse(
                        user -> user.changeBuilding(buildingId, detailAddress),
                        () -> userRepository.save(new User(userId, buildingId, detailAddress)));
    }

    private static String trimToNull(String text) {
        return StringUtils.hasText(text) ? text.trim() : null;
    }
}
