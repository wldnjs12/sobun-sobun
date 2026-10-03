package com.ppuri.sobunsobun.auth.service;

import com.ppuri.sobunsobun.auth.domain.Building;
import com.ppuri.sobunsobun.auth.domain.BuildingRepository;
import com.ppuri.sobunsobun.auth.domain.LocationCheck;
import com.ppuri.sobunsobun.auth.domain.LocationCheckRepository;
import com.ppuri.sobunsobun.auth.domain.User;
import com.ppuri.sobunsobun.auth.domain.UserRepository;
import com.ppuri.sobunsobun.auth.dto.LocationCheckRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * GPS 2차 확인. 행동(팟 개설·참여·커뮤니티 입장) 직전마다 호출되고, 결과를 캐시하지 않고 매번 재판정한다 (open-decisions.md 확정 사항).
 *
 * ALLOWED_RADIUS_METERS: 임시값(100m). 실내 GPS 오차가 기기마다 달라 데모 리허설 때 실측 후 조정 필요
 * — 최종 확정 전까지 이 상수 하나만 바꾸면 되도록 유지한다 (docs/open-decisions.md).
 */
@Service
@RequiredArgsConstructor
public class LocationCheckService {

    static final double ALLOWED_RADIUS_METERS = 100.0;
    private static final double EARTH_RADIUS_METERS = 6_371_000.0;

    private final UserRepository userRepository;
    private final BuildingRepository buildingRepository;
    private final LocationCheckRepository locationCheckRepository;

    @Value("${location-check.demo-mode:false}")
    private boolean demoMode;

    @Transactional
    public boolean check(Long userId, LocationCheckRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new LocationCheckException(
                        "BUILDING_NOT_REGISTERED", "등록된 건물이 없어요. 먼저 주소를 등록해주세요."));
        Building building = buildingRepository.findById(user.getBuildingId())
                .orElseThrow(() -> new IllegalStateException("등록된 건물을 찾을 수 없습니다: " + user.getBuildingId()));

        double[] coordinates = resolveCoordinates(building, request);
        double distance = distanceMeters(
                building.getLatitude(), building.getLongitude(),
                coordinates[0], coordinates[1]);
        boolean success = distance <= ALLOWED_RADIUS_METERS;

        // 원본 좌표는 저장하지 않는다 — 판정 결과·시각·목적만 남긴다 (개인정보 보호).
        locationCheckRepository.save(
                new LocationCheck(userId, building.getId(), request.purpose(), success, LocalDateTime.now()));

        if (!success) {
            throw new LocationCheckException("OUT_OF_RANGE",
                    "지금 위치가 등록한 건물(" + building.getName() + ")과 달라요. 집에 돌아가서 다시 시도해 주세요.");
        }
        return true;
    }

    /**
     * 데모 고정 좌표 모드(LOCATION_CHECK_DEMO_MODE=true)면 요청 좌표 대신 건물 좌표를 그대로 써서 항상 통과하게 한다.
     * 기본 꺼짐 — 운영/기본 환경에서는 항상 꺼져 있어야 한다.
     */
    private double[] resolveCoordinates(Building building, LocationCheckRequest request) {
        return demoMode
                ? new double[]{building.getLatitude(), building.getLongitude()}
                : new double[]{request.latitude(), request.longitude()};
    }

    /**
     * Haversine 공식: 지구를 구로 보고 두 위경도 좌표 사이의 표면 거리(m)를 구한다.
     * 위경도를 평면 좌표처럼 빼면 위도에 따라 경도 1도의 실제 길이가 달라져서 오차가 생긴다.
     */
    static double distanceMeters(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return EARTH_RADIUS_METERS * c;
    }
}
