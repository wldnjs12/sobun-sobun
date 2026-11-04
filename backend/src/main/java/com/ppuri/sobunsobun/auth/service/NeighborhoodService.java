package com.ppuri.sobunsobun.auth.service;

import com.ppuri.sobunsobun.auth.domain.Building;
import com.ppuri.sobunsobun.auth.domain.BuildingRepository;
import com.ppuri.sobunsobun.auth.domain.User;
import com.ppuri.sobunsobun.auth.domain.UserRepository;
import com.ppuri.sobunsobun.global.exception.BuildingAccessDeniedException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * "동네" 판정 공용 서비스 (2026-11 기획 개편: 건물 단위 → 동네 단위).
 *
 * 동네 = 내 건물 좌표에서 반경 NEIGHBORHOOD_RADIUS_METERS 안에 있는 건물들.
 * 왜 법정동이 아니라 반경인가: 인하대 후문처럼 길 하나를 사이에 두고 용현동/학익동이 갈리는 곳이 많아서,
 * 법정동 경계로 자르면 걸어서 3분 거리 이웃이 서로 안 보인다. 반경은 "걸어서 가져갈 수 있는 거리"를 그대로 표현한다.
 *
 * 다른 사용자에게 보여줄 위치 정보는 neighborhoodName(법정동 이름)과 roundedDistance(대략 거리)뿐이다.
 * 도로명주소·건물명·동·호수는 다른 사용자에게 내려보내지 않는다.
 */
@Service
@RequiredArgsConstructor
public class NeighborhoodService {

    /** 동네 반경. 도보 약 12~15분. docs/PRODUCT_SPEC.md "위치·주소 처리 정책" 참고 */
    public static final double NEIGHBORHOOD_RADIUS_METERS = 1_000.0;

    private static final String DEFAULT_DENIED_MESSAGE = "우리 동네(반경 1km) 밖의 공동구매예요.";
    private static final Pattern LEGAL_DONG = Pattern.compile("\\(([^,()]+?[동가리])(?:,[^)]*)?\\)");

    private final UserRepository userRepository;
    private final BuildingRepository buildingRepository;

    /** 내 건물. 건물 등록 전이면 empty. */
    @Transactional(readOnly = true)
    public Optional<Building> findMyBuilding(Long userId) {
        return userRepository.findById(userId)
                .map(User::getBuildingId)
                .flatMap(buildingRepository::findById);
    }

    /** 내 건물 기준 반경 안 건물 id 목록 (내 건물 포함). 등록 전이면 빈 리스트. */
    @Transactional(readOnly = true)
    public List<Long> nearbyBuildingIds(Long userId) {
        Optional<Building> mine = findMyBuilding(userId);
        if (mine.isEmpty()) return List.of();
        Building me = mine.get();
        return buildingRepository.findAll().stream()
                .filter(other -> other.getId().equals(me.getId()) || isWithin(me, other))
                .map(Building::getId)
                .toList();
    }

    /** 이 사용자가 targetBuildingId 건물의 리소스(팟·글)에 접근할 수 있는 이웃인가 */
    @Transactional(readOnly = true)
    public boolean isNeighbor(Long userId, Long targetBuildingId) {
        Optional<Building> mine = findMyBuilding(userId);
        if (mine.isEmpty() || targetBuildingId == null) return false;
        if (mine.get().getId().equals(targetBuildingId)) return true;
        return buildingRepository.findById(targetBuildingId)
                .map(target -> isWithin(mine.get(), target))
                .orElse(false);
    }

    /** 이웃이 아니면 403(BuildingAccessDeniedException). 에러 code는 기존과 같은 BUILDING_ACCESS_DENIED. */
    public void requireNeighbor(Long userId, Long targetBuildingId) {
        requireNeighbor(userId, targetBuildingId, DEFAULT_DENIED_MESSAGE);
    }

    public void requireNeighbor(Long userId, Long targetBuildingId, String message) {
        if (!isNeighbor(userId, targetBuildingId)) {
            throw new BuildingAccessDeniedException(message);
        }
    }

    /** 내 건물 ↔ 대상 건물 거리(m). 계산 불가면 null. */
    @Transactional(readOnly = true)
    public Double distanceMeters(Long userId, Long targetBuildingId) {
        Optional<Building> mine = findMyBuilding(userId);
        if (mine.isEmpty() || targetBuildingId == null) return null;
        return buildingRepository.findById(targetBuildingId)
                .map(target -> distance(mine.get(), target))
                .orElse(null);
    }

    /**
     * 다른 사용자에게 보여줄 "대략 거리" 문구. 정확한 위치를 역산하지 못하게 구간으로만 보여준다.
     * 같은 건물 → "같은 건물", 100m 미만 → "100m 이내", 그 외 → 100m 단위 반올림 ("약 300m"), 1km 이상 → "약 1.2km".
     */
    public static String roughDistanceLabel(Double meters, boolean sameBuilding) {
        if (sameBuilding) return "같은 건물";
        if (meters == null) return null;
        if (meters < 100) return "100m 이내";
        if (meters < 1000) return "약 " + (Math.round(meters / 100.0) * 100) + "m";
        return String.format("약 %.1fkm", meters / 1000.0);
    }

    /** 도로명주소 끝 괄호의 법정동 이름. "인천광역시 미추홀구 인하로 100 (용현동)" → "용현동". 없으면 null. */
    public static String neighborhoodName(String roadAddress) {
        if (roadAddress == null) return null;
        Matcher m = LEGAL_DONG.matcher(roadAddress);
        String found = null;
        while (m.find()) found = m.group(1).trim();
        return found;
    }

    private static boolean isWithin(Building a, Building b) {
        Double d = distance(a, b);
        return d != null && d <= NEIGHBORHOOD_RADIUS_METERS;
    }

    private static Double distance(Building a, Building b) {
        if (a.getLatitude() == null || a.getLongitude() == null
                || b.getLatitude() == null || b.getLongitude() == null) return null;
        return LocationCheckService.distanceMeters(a.getLatitude(), a.getLongitude(), b.getLatitude(), b.getLongitude());
    }
}
