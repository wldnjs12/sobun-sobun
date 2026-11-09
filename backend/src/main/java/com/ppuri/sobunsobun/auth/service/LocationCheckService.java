package com.ppuri.sobunsobun.auth.service;

import com.ppuri.sobunsobun.auth.domain.Building;
import com.ppuri.sobunsobun.auth.domain.BuildingRepository;
import com.ppuri.sobunsobun.auth.domain.LocationCheck;
import com.ppuri.sobunsobun.auth.domain.LocationCheckPurpose;
import com.ppuri.sobunsobun.auth.domain.LocationCheckRepository;
import com.ppuri.sobunsobun.auth.domain.User;
import com.ppuri.sobunsobun.auth.domain.UserRepository;
import com.ppuri.sobunsobun.auth.dto.LocationCheckRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * GPS 2차 확인. 행동(팟 개설·참여·커뮤니티 입장) 직전마다 호출되고, 결과를 캐시하지 않고 매번 재판정한다 (docs/PRODUCT_SPEC.md 결정 기록).
 *
 * ALLOWED_RADIUS_METERS: 기본 700m. 처음엔 100m였지만 넓은 캠퍼스 주소(좌표 한 점)·노트북 와이파이 위치 오차(수백 m)
 * 때문에 팀 테스트가 계속 OUT_OF_RANGE로 막혀서 2026-11-08 20km로 넓혔다가, 20km는 "인천 근처면 통과"라
 * 건물 인증 효과가 없어서 2026-11-09 700m로 줄였다. 700m = 인하대("인하로 100", 좌표는 남쪽 정문 근처)에서
 * 캠퍼스 가장 먼 모서리(약 640m)까지 들어오는 거리. 일반 빌라·원룸만 쓴다면 300~500m로 더 좁혀도 된다.
 * 정식 운영 전에는 실제 건물들에서 실측해 다시 정한다.
 * 실제 판정은 location-check.allowed-radius-meters(환경변수 LOCATION_CHECK_RADIUS_METERS) 값을 쓰고, 이 상수는 그 기본값이다
 * — 재배포 없이 Railway 환경변수만 바꿔 반경을 조정할 수 있다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LocationCheckService {

    static final double ALLOWED_RADIUS_METERS = 700.0;
    /**
     * 위치 확인 통과 후 실제 행동(팟 개설·참여)까지 허용하는 시간. 프론트는 통과하자마자 바로 API를 부르므로
     * 보통 몇 초면 충분하지만, 느린 네트워크·바텀시트 재시도를 고려해 넉넉히 3분으로 둔다.
     */
    static final long RECENT_PASS_VALID_SECONDS = 180;
    private static final double EARTH_RADIUS_METERS = 6_371_000.0;

    private final UserRepository userRepository;
    private final BuildingRepository buildingRepository;
    private final LocationCheckRepository locationCheckRepository;

    @Value("${location-check.demo-mode:false}")
    private boolean demoMode;

    @Value("${location-check.allowed-radius-meters:700}")
    private double allowedRadiusMeters = ALLOWED_RADIUS_METERS;

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
        boolean success = distance <= allowedRadiusMeters;
        // 좌표는 남기지 않고 거리만 로그로 남긴다 — 실패 시 "몇 m 벗어났는지" 보고 반경을 조정하려고.
        log.info("위치 확인 buildingId={} purpose={} distance={}m radius={}m success={}",
                building.getId(), request.purpose(), Math.round(distance), Math.round(allowedRadiusMeters), success);

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
     * 팟 개설·참여 같은 행동 직전에 호출: 이 사용자가 이 건물에서 이 목적(purpose)으로
     * 최근 {@link #RECENT_PASS_VALID_SECONDS}초 안에 위치 확인을 통과했는지 서버가 직접 확인한다.
     * 통과 기록이 없으면 LOCATION_CHECK_REQUIRED로 막는다.
     */
    @Transactional(readOnly = true)
    public void requireRecentPass(Long userId, Long buildingId, LocationCheckPurpose purpose) {
        LocalDateTime after = LocalDateTime.now().minusSeconds(RECENT_PASS_VALID_SECONDS);
        boolean passed = locationCheckRepository
                .existsByUserIdAndBuildingIdAndPurposeAndSuccessTrueAndCheckedAtAfter(userId, buildingId, purpose, after);
        if (!passed) {
            throw new LocationCheckException("LOCATION_CHECK_REQUIRED",
                    "위치 확인이 필요해요. 다시 시도해 주세요.");
        }
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
