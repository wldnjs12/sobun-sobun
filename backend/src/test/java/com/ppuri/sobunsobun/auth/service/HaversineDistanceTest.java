package com.ppuri.sobunsobun.auth.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

/** BuildingAuthService.distanceMeters (Haversine) 단위 테스트 */
class HaversineDistanceTest {

    private static final double LAT = 37.5665;
    private static final double LON = 126.9780;

    @Test
    void 같은_좌표면_0m() {
        assertThat(BuildingAuthService.distanceMeters(LAT, LON, LAT, LON)).isZero();
    }

    @Test
    void 위도_1도_차이는_약_111_195m() {
        // 같은 경도에서 위도 1도 = 지구 반지름 × π/180 = 111,194.9m (구 모델 기준 정확한 값)
        double distance = BuildingAuthService.distanceMeters(LAT, LON, LAT + 1, LON);

        assertThat(distance).isCloseTo(111_194.9, within(0.5));
    }

    @Test
    void 파리_런던_거리는_약_343_6km() {
        // 파리(48.8566, 2.3522) ↔ 런던(51.5074, -0.1278): 널리 알려진 대권 거리 약 343.5km
        double distance = BuildingAuthService.distanceMeters(48.8566, 2.3522, 51.5074, -0.1278);

        assertThat(distance).isCloseTo(343_556, within(1_000.0));
    }

    @Test
    void 반경_50m_경계_근처() {
        double metersPerDegreeLat = Math.PI / 180 * 6_371_000;

        assertThat(BuildingAuthService.distanceMeters(LAT, LON, LAT + 49.9 / metersPerDegreeLat, LON))
                .isLessThan(50.0).isCloseTo(49.9, within(0.01));
        assertThat(BuildingAuthService.distanceMeters(LAT, LON, LAT + 50.1 / metersPerDegreeLat, LON))
                .isGreaterThan(50.0).isCloseTo(50.1, within(0.01));
    }
}
