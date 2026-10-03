package com.ppuri.sobunsobun.auth.service;

import com.ppuri.sobunsobun.auth.domain.Building;
import com.ppuri.sobunsobun.auth.domain.BuildingAuth;
import com.ppuri.sobunsobun.auth.domain.BuildingAuthException;
import com.ppuri.sobunsobun.auth.domain.BuildingAuthRepository;
import com.ppuri.sobunsobun.auth.domain.BuildingRepository;
import com.ppuri.sobunsobun.auth.dto.QrVerifyRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

import static com.ppuri.sobunsobun.auth.domain.BuildingAuthErrorCode.*;

@Service
@RequiredArgsConstructor
public class BuildingAuthService {

    private static final double ALLOWED_RADIUS_METERS = 50.0;
    private static final double EARTH_RADIUS_METERS = 6_371_000.0;

    private final BuildingRepository buildingRepository;
    private final BuildingAuthRepository buildingAuthRepository;

    /**
     * 1) qrToken으로 건물 조회, 만료 여부 확인
     * 2) 건물 좌표와 요청 좌표의 거리(Haversine)가 ALLOWED_RADIUS_METERS 이내인지 검증
     * 3) 통과 시 사용자-건물 인증 기록(BUILDING_AUTH) 저장 — 재인증이면 verifiedAt만 갱신
     * 실패하면 에러 코드와 화면에 보여줄 문구를 담은 BuildingAuthException을 던진다.
     *
     * @param userId 인증 기록을 남길 사용자. null이면 판정만 하고 기록은 남기지 않는다.
     */
    @Transactional
    public boolean verify(QrVerifyRequest request, Long userId) {
        Building building = buildingRepository.findByQrToken(request.qrToken())
                .orElseThrow(() -> new BuildingAuthException(INVALID_QR));

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime expiresAt = building.getQrTokenExpiresAt();
        if (expiresAt != null && !now.isBefore(expiresAt)) {
            throw new BuildingAuthException(EXPIRED_QR);
        }

        double distance = distanceMeters(
                building.getLatitude(), building.getLongitude(),
                request.latitude(), request.longitude());
        if (distance > ALLOWED_RADIUS_METERS) {
            throw new BuildingAuthException(OUT_OF_RANGE);
        }

        if (userId != null) {
            saveAuthRecord(building.getId(), userId, now);
        }
        return true;
    }

    /** 이미 기록이 있으면 verifiedAt만 바꾼다 (트랜잭션 안이라 변경 감지로 UPDATE 된다). */
    private void saveAuthRecord(Long buildingId, Long userId, LocalDateTime now) {
        buildingAuthRepository.findByBuildingIdAndUserId(buildingId, userId)
                .ifPresentOrElse(
                        auth -> auth.reverify(now),
                        () -> buildingAuthRepository.save(new BuildingAuth(buildingId, userId, now)));
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
