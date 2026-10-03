package com.ppuri.sobunsobun.auth.service;

import com.ppuri.sobunsobun.auth.domain.Building;
import com.ppuri.sobunsobun.auth.domain.BuildingAuth;
import com.ppuri.sobunsobun.auth.domain.BuildingAuthErrorCode;
import com.ppuri.sobunsobun.auth.domain.BuildingAuthException;
import com.ppuri.sobunsobun.auth.domain.BuildingAuthRepository;
import com.ppuri.sobunsobun.auth.domain.BuildingRepository;
import com.ppuri.sobunsobun.auth.dto.QrVerifyRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class BuildingAuthServiceTest {

    // 건물 기준 좌표. 위도 0.0001도 ≈ 11.1m
    private static final double LAT = 37.5665;
    private static final double LON = 126.9780;
    private static final long BUILDING_ID = 1L;
    private static final long USER_ID = 7L;

    @Mock
    private BuildingRepository buildingRepository;

    @Mock
    private BuildingAuthRepository buildingAuthRepository;

    @InjectMocks
    private BuildingAuthService buildingAuthService;

    private void givenBuilding(LocalDateTime expiresAt) {
        Building building = new Building("테스트빌라", LAT, LON, "token", expiresAt);
        ReflectionTestUtils.setField(building, "id", BUILDING_ID); // id는 DB가 채우는 값이라 테스트에서만 직접 넣는다
        given(buildingRepository.findByQrToken("token")).willReturn(Optional.of(building));
    }

    private static void assertFailsWith(Runnable call, BuildingAuthErrorCode code) {
        assertThatThrownBy(call::run)
                .isInstanceOf(BuildingAuthException.class)
                .hasMessage(code.getMessage())
                .extracting("errorCode").isEqualTo(code);
    }

    @Test
    void 반경_안이면_인증_성공하고_기록을_저장한다() {
        givenBuilding(LocalDateTime.now().plusHours(1));
        given(buildingAuthRepository.findByBuildingIdAndUserId(BUILDING_ID, USER_ID)).willReturn(Optional.empty());

        // 약 33m 북쪽
        boolean result = buildingAuthService.verify(new QrVerifyRequest("token", LAT + 0.0003, LON), USER_ID);

        assertThat(result).isTrue();
        ArgumentCaptor<BuildingAuth> saved = ArgumentCaptor.forClass(BuildingAuth.class);
        verify(buildingAuthRepository).save(saved.capture());
        assertThat(saved.getValue().getBuildingId()).isEqualTo(BUILDING_ID);
        assertThat(saved.getValue().getUserId()).isEqualTo(USER_ID);
        assertThat(saved.getValue().getVerifiedAt()).isNotNull();
    }

    @Test
    void 만료시각이_null이면_만료_없음으로_보고_통과() {
        givenBuilding(null);

        assertThat(buildingAuthService.verify(new QrVerifyRequest("token", LAT, LON), null)).isTrue();
    }

    @Test
    void 사용자_헤더가_없으면_판정만_하고_기록은_저장하지_않는다() {
        givenBuilding(null);

        buildingAuthService.verify(new QrVerifyRequest("token", LAT, LON), null);

        verify(buildingAuthRepository, never()).findByBuildingIdAndUserId(any(), any());
        verify(buildingAuthRepository, never()).save(any());
    }

    @Test
    void 재인증이면_새_행을_만들지_않고_verifiedAt만_갱신한다() {
        givenBuilding(null);
        LocalDateTime before = LocalDateTime.now().minusDays(1);
        BuildingAuth existing = new BuildingAuth(BUILDING_ID, USER_ID, before);
        given(buildingAuthRepository.findByBuildingIdAndUserId(BUILDING_ID, USER_ID)).willReturn(Optional.of(existing));

        buildingAuthService.verify(new QrVerifyRequest("token", LAT, LON), USER_ID);

        verify(buildingAuthRepository, never()).save(any());
        assertThat(existing.getVerifiedAt()).isAfter(before);
    }

    @Test
    void 없는_토큰이면_INVALID_QR() {
        given(buildingRepository.findByQrToken("unknown")).willReturn(Optional.empty());

        assertFailsWith(() -> buildingAuthService.verify(new QrVerifyRequest("unknown", LAT, LON), USER_ID),
                BuildingAuthErrorCode.INVALID_QR);
    }

    @Test
    void 만료된_QR이면_EXPIRED_QR() {
        givenBuilding(LocalDateTime.now().minusMinutes(1));

        assertFailsWith(() -> buildingAuthService.verify(new QrVerifyRequest("token", LAT, LON), USER_ID),
                BuildingAuthErrorCode.EXPIRED_QR);
        verify(buildingAuthRepository, never()).save(any());
    }

    @Test
    void 반경_밖이면_OUT_OF_RANGE() {
        givenBuilding(LocalDateTime.now().plusHours(1));

        // 약 67m 북쪽
        assertFailsWith(() -> buildingAuthService.verify(new QrVerifyRequest("token", LAT + 0.0006, LON), USER_ID),
                BuildingAuthErrorCode.OUT_OF_RANGE);
        verify(buildingAuthRepository, never()).save(any());
    }

    @Test
    void 반경_50m_경계_안쪽은_통과하고_바깥쪽은_실패() {
        givenBuilding(null);
        double metersPerDegreeLat = Math.PI / 180 * 6_371_000; // ≈ 111,195m

        assertThat(buildingAuthService.verify(
                new QrVerifyRequest("token", LAT + 49.9 / metersPerDegreeLat, LON), null)).isTrue();
        assertFailsWith(() -> buildingAuthService.verify(
                        new QrVerifyRequest("token", LAT + 50.1 / metersPerDegreeLat, LON), null),
                BuildingAuthErrorCode.OUT_OF_RANGE);
    }
}
